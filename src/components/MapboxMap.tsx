import { useRef, useEffect, useState } from 'react';
import Map, { Marker, Source, Layer, NavigationControl, GeolocateControl } from 'react-map-gl';
import type { MapRef } from 'react-map-gl';
import type { Vehicle } from '../types';
import { useVehicleStore } from '../stores/vehicleStore';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapboxMapProps {
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  onVehicleClick: (vehicleId: string) => void;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

if (!MAPBOX_TOKEN) {
  console.error('❌ Mapbox token not found! Check .env file');
}

type MapStyle = 'standard' | 'satellite';

export default function MapboxMap({ vehicles, selectedVehicleId, onVehicleClick }: MapboxMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyle>('standard');
  const [routes, setRoutes] = useState<{ [vehicleId: string]: any }>({});
  const { updateVehicleRoute } = useVehicleStore();

  // Reset map loaded state when style changes
  useEffect(() => {
    setMapLoaded(false);
  }, [mapStyle]);
  const [viewState, setViewState] = useState({
    longitude: 77.5946,
    latitude: 12.9716,
    zoom: 12,
    pitch: 0, // Start with 2D view for cleaner look
    bearing: 0,
  });

  // Fetch route from Mapbox Directions API when vehicle is selected
  useEffect(() => {
    const fetchRouteFromMapbox = async (vehicle: Vehicle) => {
      if (!vehicle.destination || !MAPBOX_TOKEN) {
        console.log(`⚠️ Cannot fetch route for ${vehicle.id}: missing destination or token`);
        return;
      }

      console.log(`🔄 Fetching route for ${vehicle.id} from ${vehicle.position.lng},${vehicle.position.lat} to ${vehicle.destination.lng},${vehicle.destination.lat}`);

      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${vehicle.position.lng},${vehicle.position.lat};${vehicle.destination.lng},${vehicle.destination.lat}?geometries=geojson&overview=full&steps=true&access_token=${MAPBOX_TOKEN}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const routeGeometry = data.routes[0].geometry;
          
          // Convert coordinates to Position array for vehicle store
          const routePositions = routeGeometry.coordinates.map((coord: [number, number]) => ({
            lng: coord[0],
            lat: coord[1]
          }));
          
          console.log(`✅ Route fetched for ${vehicle.id}: ${routeGeometry.coordinates.length} points`);
          
          // Store route for display on map
          setRoutes(prev => ({
            ...prev,
            [vehicle.id]: routeGeometry,
          }));
          
          // Update vehicle store so GPS simulation can follow the route
          updateVehicleRoute(vehicle.id, routePositions);
          console.log(`🎯 Updated vehicle store with route for ${vehicle.id}`);
        } else {
          console.error(`❌ No routes found in response for ${vehicle.id}`, data);
        }
      } catch (error) {
        console.error(`❌ Failed to fetch route for ${vehicle.id}:`, error);
      }
    };

    // Fetch route for selected vehicle immediately
    if (selectedVehicleId && mapLoaded) {
      const vehicle = vehicles.find(v => v.id === selectedVehicleId);
      if (vehicle && vehicle.destination) {
        console.log(`🎯 Selected vehicle ${vehicle.id}, checking route...`);
        if (!routes[vehicle.id]) {
          console.log(`📍 No route cached, fetching from Mapbox...`);
          fetchRouteFromMapbox(vehicle);
        } else {
          console.log(`✓ Route already cached for ${vehicle.id}`);
        }
      }
    }

    // Also fetch routes for all vehicles with destinations (in background)
    if (vehicles.length > 0 && mapLoaded) {
      vehicles.forEach(vehicle => {
        if (vehicle.destination && !routes[vehicle.id]) {
          // Use existing route data if available
          if (vehicle.route && vehicle.route.length > 0) {
            console.log(`📦 Using existing route data for ${vehicle.id} (${vehicle.route.length} points)`);
            const routeGeometry = {
              type: 'LineString',
              coordinates: vehicle.route.map(pos => [pos.lng, pos.lat])
            };
            setRoutes(prev => ({
              ...prev,
              [vehicle.id]: routeGeometry,
            }));
          } else {
            // Fetch from Mapbox for all vehicles
            console.log(`🔄 Fetching route for ${vehicle.id} in background...`);
            fetchRouteFromMapbox(vehicle);
          }
        }
      });
    }
  }, [selectedVehicleId, vehicles, mapLoaded, routes, updateVehicleRoute]);

  // Fly to selected vehicle and fit bounds to show route (only when selection changes)
  useEffect(() => {
    if (selectedVehicleId && mapRef.current) {
      const vehicle = vehicles.find(v => v.id === selectedVehicleId);
      if (vehicle) {
        if (vehicle.destination) {
          // Fit bounds to show both vehicle and destination
          const bounds: [[number, number], [number, number]] = [
            [
              Math.min(vehicle.position.lng, vehicle.destination.lng),
              Math.min(vehicle.position.lat, vehicle.destination.lat)
            ],
            [
              Math.max(vehicle.position.lng, vehicle.destination.lng),
              Math.max(vehicle.position.lat, vehicle.destination.lat)
            ]
          ];
          
          mapRef.current.fitBounds(bounds, {
            padding: 100,
            duration: 2000,
          });
        } else {
          mapRef.current.flyTo({
            center: [vehicle.position.lng, vehicle.position.lat],
            zoom: 15,
            duration: 2000,
          });
        }
      }
    }
    // Only run when selectedVehicleId changes, not when vehicles update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicleId]);

  // Auto-fit bounds when there's only one vehicle (driver view)
  useEffect(() => {
    if (vehicles.length === 1 && mapRef.current) {
      const vehicle = vehicles[0];
      if (vehicle.destination) {
        const bounds: [[number, number], [number, number]] = [
          [
            Math.min(vehicle.position.lng, vehicle.destination.lng),
            Math.min(vehicle.position.lat, vehicle.destination.lat)
          ],
          [
            Math.max(vehicle.position.lng, vehicle.destination.lng),
            Math.max(vehicle.position.lat, vehicle.destination.lat)
          ]
        ];
        
        mapRef.current.fitBounds(bounds, {
          padding: 100,
          duration: 1000,
        });
      }
    }
  }, [vehicles.length]);

  const getMarkerColor = (status: Vehicle['status']) => {
    switch (status) {
      case 'on-time': return '#22C55E';
      case 'warning': return '#F9D71C';
      case 'critical': return '#EF4444';
    }
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-xl mb-2">⚠️ Mapbox token not configured</p>
          <p className="text-sm text-gray-400">Check VITE_MAPBOX_TOKEN in .env file</p>
        </div>
      </div>
    );
  }

  const getMapStyleUrl = () => {
    return mapStyle === 'satellite' 
      ? 'mapbox://styles/mapbox/satellite-streets-v12'
      : 'mapbox://styles/mapbox/standard';
  };

  return (
    <Map
      ref={mapRef}
      {...viewState}
      onMove={evt => setViewState(evt.viewState)}
      mapStyle={getMapStyleUrl()}
      mapboxAccessToken={MAPBOX_TOKEN}
      style={{ width: '100%', height: '100%' }}
      onLoad={(e) => {
        // Wait a bit for style to fully load before adding custom layers
        setTimeout(() => {
          if (e.target.isStyleLoaded()) {
            setMapLoaded(true);
          }
        }, 500);
      }}
      attributionControl={true}
    >
      {/* Real-time Traffic Layer - only render after map fully loads */}
      {mapLoaded && mapStyle === 'standard' && (
        <Source
          id="mapbox-traffic"
          type="vector"
          url="mapbox://mapbox.mapbox-traffic-v1"
        >
          <Layer
            id="traffic-layer"
            type="line"
            source="mapbox-traffic"
            source-layer="traffic"
            paint={{
              'line-width': 3,
              'line-color': [
                'case',
                ['==', ['get', 'congestion'], 'low'], '#4CAF50',
                ['==', ['get', 'congestion'], 'moderate'], '#FFA726',
                ['==', ['get', 'congestion'], 'heavy'], '#EF5350',
                ['==', ['get', 'congestion'], 'severe'], '#B71C1C',
                '#1976D2'
              ],
              'line-opacity': 0.7,
            }}
          />
        </Source>
      )}

      {/* Vehicle Markers */}
      {vehicles.map((vehicle) => (
        <Marker
          key={vehicle.id}
          longitude={vehicle.position.lng}
          latitude={vehicle.position.lat}
          anchor="center"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            onVehicleClick(vehicle.id);
          }}
        >
          <div
            className="relative cursor-pointer transition-transform hover:scale-110"
            style={{
              transform: `rotate(${vehicle.heading}deg)`,
            }}
          >
            {/* Pulsing effect for critical */}
            {vehicle.status === 'critical' && (
              <div className="absolute inset-0 animate-ping">
                <div
                  className="w-12 h-12 rounded-full"
                  style={{ backgroundColor: getMarkerColor(vehicle.status), opacity: 0.5 }}
                />
              </div>
            )}
            
            {/* Main marker */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-lg border-3 border-white"
              style={{
                backgroundColor: getMarkerColor(vehicle.status),
                boxShadow: selectedVehicleId === vehicle.id 
                  ? '0 0 20px rgba(249, 215, 28, 0.9), 0 0 40px rgba(249, 215, 28, 0.5)' 
                  : '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              🚚
            </div>

            {/* Speed warning indicator */}
            {vehicle.currentSpeed >= 95 && (
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded shadow-lg animate-pulse">
                ⚠️ {Math.round(vehicle.currentSpeed)} km/h
              </div>
            )}

            {/* Vehicle ID label */}
            {selectedVehicleId === vehicle.id && (
              <div className={`absolute ${vehicle.currentSpeed >= 95 ? '-top-12' : '-top-8'} left-1/2 transform -translate-x-1/2 ${
                vehicle.currentSpeed >= 95 ? 'bg-red-600 text-white' : 'bg-white text-gray-900'
              } text-xs font-semibold px-2 py-1 rounded shadow-lg whitespace-nowrap`}>
                {vehicle.id} • {Math.round(vehicle.currentSpeed)} km/h
                {vehicle.currentSpeed >= 95 && ' ⚠️'}
              </div>
            )}
          </div>
        </Marker>
      ))}

      {/* Historical Route Lines - only show for selected vehicle */}
      {selectedVehicleId && vehicles.map((vehicle) => {
        if (vehicle.id !== selectedVehicleId || !vehicle.statusHistory || vehicle.statusHistory.length < 2) return null;

        const coordinates = [
          ...vehicle.statusHistory.slice(-30).map(h => [h.position.lng, h.position.lat]),
          [vehicle.position.lng, vehicle.position.lat]
        ];

        return (
          <Source
            key={`history-${vehicle.id}`}
            id={`history-${vehicle.id}`}
            type="geojson"
            data={{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates,
              },
            }}
          >
            <Layer
              id={`history-line-${vehicle.id}`}
              type="line"
              paint={{
                'line-color': '#2196F3',
                'line-width': 3,
                'line-opacity': 0.6,
                'line-dasharray': [2, 2],
              }}
              layout={{
                'line-cap': 'round',
                'line-join': 'round',
              }}
            />
          </Source>
        );
      })}

      {/* Future Route Lines - show route to destination */}
      {vehicles.map((vehicle) => {
        const route = routes[vehicle.id];
        if (!route || !vehicle.destination) {
          if (vehicle.id === selectedVehicleId) {
            console.log(`⚠️ Cannot render route for selected vehicle ${vehicle.id}: route=${!!route}, destination=${!!vehicle.destination}`);
          }
          return null;
        }

        const isSelected = vehicle.id === selectedVehicleId;
        
        if (isSelected) {
          console.log(`🎨 Rendering route for selected vehicle ${vehicle.id}`, route);
        }

        return (
          <Source
            key={`route-${vehicle.id}`}
            id={`route-${vehicle.id}`}
            type="geojson"
            data={{
              type: 'Feature',
              properties: {},
              geometry: route,
            }}
          >
            {/* Render route line - simplified single layer */}
            <Layer
              id={`route-line-${vehicle.id}`}
              type="line"
              paint={{
                'line-color': isSelected ? '#1E40AF' : '#94a3b8',
                'line-width': isSelected ? 6 : 2,
                'line-opacity': isSelected ? 0.9 : 0.3,
              }}
              layout={{
                'line-cap': 'round',
                'line-join': 'round',
              }}
            />
          </Source>
        );
      })}



      {/* Controls */}
      <NavigationControl position="top-right" showCompass showZoom />
      <GeolocateControl position="top-right" />

      {/* Map Controls */}
      <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2">
        {/* Map Style Toggle */}
        <button
          onClick={() => setMapStyle(prev => prev === 'standard' ? 'satellite' : 'standard')}
          className="bg-white text-gray-900 px-4 py-2 rounded-lg shadow-lg hover:bg-gray-100 transition font-medium"
        >
          {mapStyle === 'standard' ? '🛰️ Satellite' : '🗺️ Map'}
        </button>
        
        {/* 3D View Toggle */}
        <button
          onClick={() => {
            setViewState(prev => ({
              ...prev,
              pitch: prev.pitch === 0 ? 60 : 0,
              bearing: prev.pitch === 0 ? -17.6 : 0,
            }));
          }}
          className="bg-white text-gray-900 px-4 py-2 rounded-lg shadow-lg hover:bg-gray-100 transition font-medium"
        >
          {viewState.pitch === 0 ? '🏙️ 3D View' : '📍 2D View'}
        </button>
      </div>

      {/* Route Info for Selected Vehicle */}
      {selectedVehicleId && (() => {
        const vehicle = vehicles.find(v => v.id === selectedVehicleId);
        if (!vehicle || !vehicle.destination) return null;
        
        // Calculate distance if not available
        const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
          const R = 6371; // Earth radius in km
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          return R * c;
        };
        
        const distance = vehicle.estimatedDistance || calculateDistance(
          vehicle.position.lat,
          vehicle.position.lng,
          vehicle.destination.lat,
          vehicle.destination.lng
        );
        
        const duration = vehicle.estimatedDuration || (distance / 40); // Assume 40 km/h average
        
        return (
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10 bg-white rounded-xl shadow-2xl p-5 min-w-[350px] border-2 border-blue-900">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-900 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <div>
                  <span className="text-base font-bold text-gray-900">Route Overview</span>
                  <div className="text-xs text-gray-600">{vehicle.driverName}</div>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                vehicle.status === 'on-time' ? 'bg-green-100 text-green-800' :
                vehicle.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {vehicle.status.toUpperCase()}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  <div className="text-xs text-blue-700 font-medium">Distance</div>
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {distance.toFixed(1)} <span className="text-sm">km</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-xs text-blue-700 font-medium">Est. Time</div>
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {(duration * 60).toFixed(0)} <span className="text-sm">min</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Traffic Legend */}
      <div className="absolute bottom-6 left-6 z-10 bg-white rounded-lg shadow-lg p-3">
        <div className="text-xs font-semibold text-gray-900 mb-2">Live Traffic</div>
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-green-500 rounded"></div>
            <span className="text-gray-700">Light</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-orange-400 rounded"></div>
            <span className="text-gray-700">Moderate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-red-500 rounded"></div>
            <span className="text-gray-700">Heavy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-red-900 rounded"></div>
            <span className="text-gray-700">Severe</span>
          </div>
        </div>
      </div>
    </Map>
  );
}
