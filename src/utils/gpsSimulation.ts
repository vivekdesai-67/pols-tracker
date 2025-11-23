import type { Vehicle } from '../types';
import { calculateNewPosition, calculateVehicleStatus } from './statusCalculations';
import { initializeVehicleRoute } from './roadBasedSimulation';

/**
 * Find closest point on route to current position
 */
const findClosestRoutePoint = (position: { lat: number; lng: number }, route: { lat: number; lng: number }[]): number => {
  if (!route || route.length === 0) return 0;
  
  let closestIndex = 0;
  let minDistance = Infinity;
  
  route.forEach((point, index) => {
    const distance = Math.sqrt(
      Math.pow((point.lat - position.lat) * 111000, 2) +
      Math.pow((point.lng - position.lng) * 111000, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });
  
  return closestIndex;
};

/**
 * Get next target point on route
 */
const getNextRouteTarget = (vehicle: Vehicle, currentRouteIndex: number): { lat: number; lng: number; index: number } | null => {
  if (!vehicle.route || vehicle.route.length === 0) {
    return { lat: vehicle.destination.lat, lng: vehicle.destination.lng, index: -1 };
  }
  
  // Move to next point on route (look ahead only 1 point for precise following)
  const targetIndex = Math.min(currentRouteIndex + 1, vehicle.route.length - 1);
  
  if (targetIndex >= vehicle.route.length) {
    // Reached end of route, go to destination
    return { lat: vehicle.destination.lat, lng: vehicle.destination.lng, index: vehicle.route.length };
  }
  
  return {
    lat: vehicle.route[targetIndex].lat,
    lng: vehicle.route[targetIndex].lng,
    index: targetIndex
  };
};

/**
 * Simulate GPS update for a vehicle
 * Updates position, speed, heading, and status
 */
export const simulateGPSUpdate = (vehicle: Vehicle): Vehicle => {
  const now = new Date();

  // Calculate movement based on current speed and heading
  // Distance traveled in 2 seconds at current speed
  const distanceKm = (vehicle.currentSpeed / 3600) * 2; // km

  // Add slight random variation to speed (±5% for more realistic changes)
  const speedVariation = (Math.random() - 0.5) * 2 * 0.05;
  let newSpeed = vehicle.currentSpeed * (1 + speedVariation);

  // Occasionally simulate traffic/delays (5% chance)
  if (Math.random() < 0.05) {
    newSpeed = Math.max(10, newSpeed * 0.5); // Slow down for traffic
  }

  // Occasionally simulate clear road/highway (3% chance)
  if (Math.random() < 0.03) {
    newSpeed = Math.min(60, newSpeed * 1.2); // Speed up slightly
  }

  // DEMO: Occasionally simulate highway speeds to showcase speed monitoring (2% chance)
  // This allows some vehicles to reach 85-98 km/h to demonstrate the speed warning system
  if (Math.random() < 0.02) {
    newSpeed = 85 + Math.random() * 13; // 85-98 km/h (approaching limit)
    console.log(`🏎️ ${vehicle.id} entering highway - speed increased to ${newSpeed.toFixed(1)} km/h`);
  }

  // Ensure speed stays within realistic bounds (5-65 km/h normally, up to 98 for highway demo)
  newSpeed = Math.max(5, Math.min(98, newSpeed));

  // SPEED LIMIT CHECK: Cap at 100 km/h and warn if exceeded
  const SPEED_LIMIT = 100; // km/h
  if (newSpeed > SPEED_LIMIT) {
    console.warn(`⚠️ SPEED VIOLATION: Vehicle ${vehicle.id} (${vehicle.driverName}) exceeded speed limit! ${newSpeed.toFixed(1)} km/h > ${SPEED_LIMIT} km/h`);
    newSpeed = SPEED_LIMIT; // Cap at speed limit
  }

  // Follow route if available, otherwise move directly to destination
  let newPosition;
  let newHeading;
  
  if (vehicle.route && vehicle.route.length > 2) {
    // Vehicle has a route - follow it precisely
    // Find current position on route
    const currentRouteIndex = findClosestRoutePoint(vehicle.position, vehicle.route);
    
    // Get next target point on route
    const target = getNextRouteTarget(vehicle, currentRouteIndex);
    
    if (target && target.index < vehicle.route.length) {
      // Calculate heading toward next route point
      const latDiff = target.lat - vehicle.position.lat;
      const lngDiff = target.lng - vehicle.position.lng;
      const targetHeading = (Math.atan2(lngDiff, latDiff) * 180) / Math.PI;
      
      // Smooth heading changes
      newHeading = targetHeading;
      
      // Move toward target point on route
      newPosition = calculateNewPosition(
        vehicle.position,
        distanceKm,
        targetHeading
      );
      
      // Debug log - show more frequently to verify route following
      if (Math.random() < 0.1) {
        console.log(`🚚 ${vehicle.id} following route: point ${currentRouteIndex}/${vehicle.route.length} → ${target.index}, heading: ${newHeading.toFixed(0)}°`);
      }
    } else {
      // Near end of route, move to destination
      const latDiff = vehicle.destination.lat - vehicle.position.lat;
      const lngDiff = vehicle.destination.lng - vehicle.position.lng;
      newHeading = (Math.atan2(lngDiff, latDiff) * 180) / Math.PI;
      newPosition = calculateNewPosition(vehicle.position, distanceKm, newHeading);
    }
  } else {
    // No route available - move directly toward destination
    console.log(`⚠️ ${vehicle.id} NO ROUTE - moving straight to destination (route length: ${vehicle.route?.length || 0})`);
    const latDiff = vehicle.destination.lat - vehicle.position.lat;
    const lngDiff = vehicle.destination.lng - vehicle.position.lng;
    newHeading = (Math.atan2(lngDiff, latDiff) * 180) / Math.PI;
    newPosition = calculateNewPosition(vehicle.position, distanceKm, newHeading);
  }
  
  // Normalize heading to 0-360 range
  newHeading = ((newHeading % 360) + 360) % 360;
  
  // Check if we've reached the destination (within 100 meters)
  const distanceToDestination = Math.sqrt(
    Math.pow((vehicle.destination.lat - newPosition.lat) * 111000, 2) +
    Math.pow((vehicle.destination.lng - newPosition.lng) * 111000, 2)
  );
  
  // If very close to destination, snap to destination and stop
  const finalPosition = distanceToDestination < 100 ? {
    lat: vehicle.destination.lat,
    lng: vehicle.destination.lng
  } : newPosition;
  
  // Slow down as approaching destination
  if (distanceToDestination < 500) {
    newSpeed = Math.min(newSpeed, 20); // Slow to 20 km/h near destination
  }
  if (distanceToDestination < 100) {
    newSpeed = 0; // Stop at destination
  }

  // Update status history
  const newHistoryEntry = {
    timestamp: now,
    status: vehicle.status,
    speed: vehicle.currentSpeed,
    position: vehicle.position,
  };

  // Keep only last 30 minutes of history (450 entries at 4-second intervals)
  const existingHistory = vehicle.statusHistory || [];
  const updatedHistory = [...existingHistory, newHistoryEntry].slice(-450);

  // Update last stop time if speed is very low
  let lastStopTime = vehicle.lastStopTime;
  if (newSpeed < 5 && !lastStopTime) {
    lastStopTime = now;
  } else if (newSpeed >= 5) {
    lastStopTime = null;
  }

  // Create updated vehicle (preserve route!)
  const updatedVehicle: Vehicle = {
    ...vehicle,
    position: finalPosition,
    currentSpeed: newSpeed,
    heading: newHeading,
    lastStopTime,
    statusHistory: updatedHistory,
    route: vehicle.route, // Explicitly preserve route
  };

  // Calculate and update status
  const statusCalc = calculateVehicleStatus(updatedVehicle);
  updatedVehicle.status = statusCalc.status;

  // Update cargo temperature for refrigerated cargo (slight random variation)
  if (updatedVehicle.cargoTemperature !== undefined) {
    const tempVariation = (Math.random() - 0.5) * 0.5; // ±0.25°C
    updatedVehicle.cargoTemperature = Math.max(
      0,
      Math.min(10, updatedVehicle.cargoTemperature + tempVariation)
    );
  }

  return updatedVehicle;
};

/**
 * Simulate GPS updates for all vehicles
 */
export const simulateAllVehicles = (vehicles: Vehicle[]): Vehicle[] => {
  return vehicles.map((vehicle) => simulateGPSUpdate(vehicle));
};

/**
 * Initialize routes for all vehicles
 */
export const initializeAllVehicleRoutes = async (vehicles: Vehicle[]): Promise<void> => {
  console.log('🛣️ Initializing road routes for all vehicles...');
  await Promise.all(vehicles.map((vehicle) => initializeVehicleRoute(vehicle)));
  console.log('✅ All vehicle routes initialized');
};
