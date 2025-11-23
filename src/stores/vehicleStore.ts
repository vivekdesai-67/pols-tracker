import { create } from 'zustand';
import type { Vehicle, Position } from '../types';

interface VehicleState {
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  setSelectedVehicle: (vehicleId: string | null) => void;
  updateVehicles: (vehicles: Vehicle[]) => void;
  updateVehicleRoute: (vehicleId: string, route: Position[]) => void;
  addVehicle: (vehicle: Vehicle) => void;
  removeVehicle: (vehicleId: string) => void;
  startGPSSimulation: () => void;
  stopGPSSimulation: () => void;
}

// Bangalore, Karnataka, India area coordinates  
const BANGALORE_CENTER = { lat: 12.9716, lng: 77.5946 };

// Generate random position within Bangalore area
const generateRandomPosition = (): Position => {
  const latOffset = (Math.random() - 0.5) * 0.2; // ~11 km radius
  const lngOffset = (Math.random() - 0.5) * 0.2;
  
  return {
    lat: BANGALORE_CENTER.lat + latOffset,
    lng: BANGALORE_CENTER.lng + lngOffset,
  };
};

// Generate destination position
const generateDestination = () => {
  const position = generateRandomPosition();
  const addresses = [
    'MG Road, Bangalore, Karnataka',
    'Koramangala, Bangalore, Karnataka',
    'Indiranagar, Bangalore, Karnataka',
    'Whitefield, Bangalore, Karnataka',
    'Electronic City, Bangalore, Karnataka',
    'Jayanagar, Bangalore, Karnataka',
    'HSR Layout, Bangalore, Karnataka',
    'Marathahalli, Bangalore, Karnataka',
    'BTM Layout, Bangalore, Karnataka',
    'Yelahanka, Bangalore, Karnataka',
    'JP Nagar, Bangalore, Karnataka',
    'Banashankari, Bangalore, Karnataka',
  ];
  
  return {
    ...position,
    address: addresses[Math.floor(Math.random() * addresses.length)],
  };
};

// Calculate distance between two positions (Haversine formula)
const calculateDistance = (point1: Position, point2: Position): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const dLng = ((point2.lng - point1.lng) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((point1.lat * Math.PI) / 180) *
      Math.cos((point2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Create initial vehicles
const createInitialVehicles = (): Vehicle[] => {
  const driverNames = [
    'Jesse Pinkman',
    'Saul Goodman',
    'Hank Schrader',
    'Skyler White',
    'Mike Ehrmantraut',
    'Walter White',
    'Badger Mayhew',
    'Combo Ortega',
    'Huell Babineaux',
    'Kuby Patrick',
    'Tyrus Kitt',
    'Victor Santiago',
  ];

  const cargoTypes: ('Fresh' | 'Frozen' | 'Mixed')[] = ['Fresh', 'Frozen', 'Mixed'];

  return driverNames.map((name, index) => {
    const now = new Date();
    const cargoStatus = cargoTypes[Math.floor(Math.random() * cargoTypes.length)];
    
    const position = generateRandomPosition();
    const destination = generateDestination();
    
    // Calculate distance between position and destination
    const distanceKm = calculateDistance(position, destination);
    
    // Set realistic speed (30-60 km/h for city traffic)
    // Speed is capped at 100 km/h maximum
    const currentSpeed = Math.min(100, 30 + Math.random() * 30);
    
    // Calculate realistic ETA based on distance and average speed
    // Assume average speed of 35-45 km/h for city driving
    const avgSpeed = 35 + Math.random() * 10;
    const travelTimeHours = distanceKm / avgSpeed;
    const scheduledETA = new Date(now.getTime() + travelTimeHours * 60 * 60 * 1000);
    
    // Calculate heading toward destination
    const latDiff = destination.lat - position.lat;
    const lngDiff = destination.lng - position.lng;
    const heading = ((Math.atan2(lngDiff, latDiff) * 180) / Math.PI + 360) % 360;
    
    return {
      id: `v${index + 1}`,
      driverName: name,
      position,
      destination,
      currentSpeed,
      heading,
      scheduledETA,
      cargoStatus,
      cargoTemperature: cargoStatus !== 'Fresh' ? 2 + Math.random() * 4 : undefined, // 2-6°C for refrigerated
      lastStopTime: null,
      status: 'on-time',
      statusHistory: [],
    };
  });
};

let simulationInterval: ReturnType<typeof setInterval> | null = null;

export const useVehicleStore = create<VehicleState>((set, get) => ({
  vehicles: createInitialVehicles(),
  selectedVehicleId: null,

  setSelectedVehicle: (vehicleId) => {
    set({ selectedVehicleId: vehicleId });
  },

  updateVehicles: (vehicles) => {
    set({ vehicles });
  },

  updateVehicleRoute: (vehicleId, route) => {
    const { vehicles } = get();
    set({ 
      vehicles: vehicles.map(v => 
        v.id === vehicleId ? { ...v, route } : v
      )
    });
  },

  addVehicle: (vehicle) => {
    const { vehicles } = get();
    set({ vehicles: [...vehicles, vehicle] });
  },

  removeVehicle: (vehicleId) => {
    const { vehicles } = get();
    set({ vehicles: vehicles.filter(v => v.id !== vehicleId) });
  },

  startGPSSimulation: () => {
    // Clear any existing interval
    if (simulationInterval) {
      clearInterval(simulationInterval);
    }

    // Import simulation function
    import('../utils/gpsSimulation').then(async ({ simulateAllVehicles, initializeAllVehicleRoutes }) => {
      const { vehicles } = get();
      
      // Initialize road routes for all vehicles
      await initializeAllVehicleRoutes(vehicles);
      
      // Update vehicles every 4 seconds
      simulationInterval = setInterval(() => {
        const { vehicles } = get();
        const updatedVehicles = simulateAllVehicles(vehicles);
        set({ vehicles: updatedVehicles });
      }, 4000);
    });
  },

  stopGPSSimulation: () => {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
  },
}));
