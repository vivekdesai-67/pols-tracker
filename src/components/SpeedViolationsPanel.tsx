import { AlertTriangle, Gauge } from 'lucide-react';
import type { Vehicle } from '../types';

interface SpeedViolationsPanelProps {
  vehicles: Vehicle[];
  onVehicleClick: (vehicleId: string) => void;
}

export default function SpeedViolationsPanel({ vehicles, onVehicleClick }: SpeedViolationsPanelProps) {
  // Filter vehicles by speed categories
  const speedingVehicles = vehicles.filter(v => v.currentSpeed >= 95);
  const fastVehicles = vehicles.filter(v => v.currentSpeed >= 80 && v.currentSpeed < 95);
  
  // Sort by speed (highest first)
  const sortedSpeedingVehicles = [...speedingVehicles].sort((a, b) => b.currentSpeed - a.currentSpeed);
  const sortedFastVehicles = [...fastVehicles].sort((a, b) => b.currentSpeed - a.currentSpeed);

  const getSpeedColor = (speed: number) => {
    if (speed >= 95) return 'text-red-500';
    if (speed >= 80) return 'text-orange-500';
    return 'text-yellow-500';
  };

  const getSpeedBgColor = (speed: number) => {
    if (speed >= 95) return 'bg-red-900/30 border-red-500/50';
    if (speed >= 80) return 'bg-orange-900/30 border-orange-500/50';
    return 'bg-yellow-900/30 border-yellow-500/50';
  };

  return (
    <div className="absolute top-20 left-4 w-80 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg shadow-2xl z-[1000] max-h-[calc(100vh-120px)] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2 mb-2">
          <Gauge className="text-red-500" size={24} />
          <h3 className="text-lg font-bold text-white">Speed Monitor</h3>
        </div>
        <p className="text-xs text-gray-400">Real-time speed limit monitoring (100 km/h max)</p>
      </div>

      {/* Stats Summary */}
      <div className="p-4 border-b border-gray-700 bg-gray-800/50">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-500">{speedingVehicles.length}</p>
            <p className="text-xs text-gray-400">≥95 km/h</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-500">{fastVehicles.length}</p>
            <p className="text-xs text-gray-400">80-94 km/h</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-500">
              {vehicles.filter(v => v.currentSpeed < 80).length}
            </p>
            <p className="text-xs text-gray-400">&lt;80 km/h</p>
          </div>
        </div>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto">
        {/* Critical Speed Violations (≥95 km/h) */}
        {sortedSpeedingVehicles.length > 0 && (
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center space-x-2 mb-3">
              <AlertTriangle className="text-red-500" size={16} />
              <h4 className="text-sm font-semibold text-red-500">CRITICAL - Near Limit</h4>
            </div>
            <div className="space-y-2">
              {sortedSpeedingVehicles.map((vehicle) => (
                <button
                  key={vehicle.id}
                  onClick={() => onVehicleClick(vehicle.id)}
                  className={`w-full p-3 rounded-lg border ${getSpeedBgColor(vehicle.currentSpeed)} hover:bg-red-900/50 transition text-left`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-white">{vehicle.driverName}</span>
                    <span className={`text-lg font-bold ${getSpeedColor(vehicle.currentSpeed)}`}>
                      {Math.round(vehicle.currentSpeed)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{vehicle.id}</span>
                    <span className="text-gray-400">km/h</span>
                  </div>
                  {vehicle.currentSpeed >= 95 && (
                    <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                      <span>⚠️</span>
                      <span>{(100 - vehicle.currentSpeed).toFixed(1)} km/h from limit</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* High Speed (80-94 km/h) */}
        {sortedFastVehicles.length > 0 && (
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center space-x-2 mb-3">
              <Gauge className="text-orange-500" size={16} />
              <h4 className="text-sm font-semibold text-orange-500">HIGH SPEED</h4>
            </div>
            <div className="space-y-2">
              {sortedFastVehicles.map((vehicle) => (
                <button
                  key={vehicle.id}
                  onClick={() => onVehicleClick(vehicle.id)}
                  className={`w-full p-3 rounded-lg border ${getSpeedBgColor(vehicle.currentSpeed)} hover:bg-orange-900/50 transition text-left`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-white">{vehicle.driverName}</span>
                    <span className={`text-lg font-bold ${getSpeedColor(vehicle.currentSpeed)}`}>
                      {Math.round(vehicle.currentSpeed)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{vehicle.id}</span>
                    <span className="text-gray-400">km/h</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No Violations */}
        {speedingVehicles.length === 0 && fastVehicles.length === 0 && (
          <div className="p-6 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-sm font-semibold text-green-500 mb-1">All Clear!</p>
            <p className="text-xs text-gray-400">All vehicles within safe speed limits</p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-gray-700 bg-gray-800/50">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Speed Limit: 100 km/h</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Live
          </span>
        </div>
      </div>
    </div>
  );
}
