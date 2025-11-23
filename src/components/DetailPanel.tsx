import { useEffect, useState } from 'react';
import { X, Phone, Navigation } from 'lucide-react';
import type { Vehicle } from '../types';
import { calculateVehicleStatus } from '../utils/statusCalculations';
import DispatcherNotes from './DispatcherNotes';
import EmergencyServices from './EmergencyServices';

interface DetailPanelProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DetailPanel({ vehicle, isOpen, onClose }: DetailPanelProps) {
  const [showRouteHistory, setShowRouteHistory] = useState(true);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleAddNote = (vehicleId: string, note: string) => {
    console.log(`Note added to vehicle ${vehicleId}:`, note);
    // In production, this would send to backend via WebSocket
  };

  if (!vehicle) return null;

  const statusCalc = calculateVehicleStatus(vehicle);
  
  const statusColors = {
    'on-time': 'text-green-500',
    'warning': 'text-yellow-500',
    'critical': 'text-red-500',
  };

  const statusBgColors = {
    'on-time': 'bg-green-900/30 border-green-500/30',
    'warning': 'bg-yellow-900/30 border-yellow-500/30',
    'critical': 'bg-red-900/30 border-red-500/30',
  };

  const formatETA = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const timeSinceLastStop = vehicle.lastStopTime
    ? Math.floor((Date.now() - vehicle.lastStopTime.getTime()) / 60000)
    : 0;

  return (
    <>
      {/* Detail Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-gray-900 border-l border-gray-800 shadow-2xl z-[1001] transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <div>
              <h2 className="text-xl font-bold text-white">{vehicle.driverName}</h2>
              <p className="text-sm text-gray-400">Vehicle ID: {vehicle.id}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition"
            >
              <X size={24} className="text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Status Badge */}
            <div className={`p-4 rounded-lg border ${statusBgColors[vehicle.status]}`}>
              <p className="text-sm text-gray-400 mb-1">Current Status</p>
              <p className={`text-2xl font-bold uppercase ${statusColors[vehicle.status]}`}>
                {vehicle.status}
              </p>
            </div>

            {/* Speed Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg ${
                vehicle.currentSpeed >= 95 
                  ? 'bg-red-900/30 border border-red-500/50' 
                  : 'bg-gray-800'
              }`}>
                <p className="text-xs text-gray-400 mb-1">Current Speed</p>
                <p className={`text-2xl font-bold ${
                  vehicle.currentSpeed >= 95 ? 'text-red-500' : 'text-white'
                }`}>
                  {Math.round(vehicle.currentSpeed)}
                  <span className="text-sm text-gray-400 ml-1">km/h</span>
                </p>
                {vehicle.currentSpeed >= 95 && (
                  <p className="text-xs text-red-400 mt-1">⚠️ Near speed limit!</p>
                )}
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Required Speed</p>
                <p className="text-2xl font-bold text-white">
                  {Math.round(statusCalc.requiredAverageSpeed)}
                  <span className="text-sm text-gray-400 ml-1">km/h</span>
                </p>
              </div>
            </div>

            {/* Speed Limit Warning */}
            {vehicle.currentSpeed >= 95 && (
              <div className="p-4 rounded-lg border bg-red-900/30 border-red-500/30">
                <p className="text-sm font-semibold text-red-500 mb-2">
                  🚨 Speed Limit Warning
                </p>
                <p className="text-sm text-gray-300">
                  Vehicle is approaching the maximum speed limit of 100 km/h. 
                  Current speed: {Math.round(vehicle.currentSpeed)} km/h
                </p>
              </div>
            )}

            {/* ETA Information */}
            <div className="space-y-3">
              {vehicle.scheduledETA && (
                <div className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Scheduled ETA</p>
                  <p className="text-lg font-semibold text-white">
                    {formatETA(vehicle.scheduledETA)}
                  </p>
                </div>
              )}
              <div className="bg-gray-800 p-4 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Projected ETA</p>
                <p className="text-lg font-semibold text-white">
                  {formatETA(statusCalc.projectedETA)}
                </p>
              </div>
              <div className={`p-4 rounded-lg border ${
                statusCalc.etaDifferenceMinutes > 0 ? 'bg-red-900/30 border-red-500/30' : 'bg-green-900/30 border-green-500/30'
              }`}>
                <p className="text-xs text-gray-400 mb-1">ETA Difference</p>
                <p className={`text-lg font-semibold ${
                  statusCalc.etaDifferenceMinutes > 0 ? 'text-red-500' : 'text-green-500'
                }`}>
                  {statusCalc.etaDifferenceMinutes > 0 ? '+' : ''}
                  {Math.round(statusCalc.etaDifferenceMinutes)} minutes
                </p>
              </div>
            </div>

            {/* Additional Info */}
            <div className="space-y-3">
              <div className="bg-gray-800 p-4 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Cargo Status</p>
                <p className="text-lg font-semibold text-white">{vehicle.cargoStatus}</p>
                {vehicle.cargoTemperature && (
                  <p className="text-sm text-gray-400 mt-1">
                    Temp: {vehicle.cargoTemperature.toFixed(1)}°C
                  </p>
                )}
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Time Since Last Stop</p>
                <p className="text-lg font-semibold text-white">
                  {timeSinceLastStop > 0 ? `${timeSinceLastStop} minutes ago` : 'Moving'}
                </p>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Destination</p>
                <p className="text-sm text-white">{vehicle.destination.address}</p>
              </div>
            </div>

            {/* Warning/Critical Status Info */}
            {(vehicle.status === 'warning' || vehicle.status === 'critical') && (
              <div className={`p-4 rounded-lg border ${statusBgColors[vehicle.status]}`}>
                <p className="text-sm font-semibold text-white mb-2">
                  ⚠️ Status Alert
                </p>
                <p className="text-sm text-gray-300">
                  {vehicle.status === 'critical'
                    ? `Vehicle is moving below 8 km/h or has been stationary for more than 10 minutes. Immediate attention required.`
                    : `Vehicle is traveling below required average speed. Speed up by ${Math.round(statusCalc.requiredAverageSpeed - vehicle.currentSpeed)} km/h to arrive on time.`}
                </p>
              </div>
            )}

            {/* Route History Toggle */}
            {vehicle.statusHistory && vehicle.statusHistory.length > 0 && (
              <div className="bg-gray-800 p-4 rounded-lg">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm font-medium text-white">Show Route History (30 min)</span>
                  <input
                    type="checkbox"
                    checked={showRouteHistory}
                    onChange={(e) => setShowRouteHistory(e.target.checked)}
                    className="w-5 h-5 text-[#F9D71C] bg-gray-700 border-gray-600 rounded focus:ring-[#F9D71C]"
                  />
                </label>
                <p className="text-xs text-gray-400 mt-2">
                  {vehicle.statusHistory.length} GPS points tracked
                </p>
              </div>
            )}

            {/* Dispatcher Notes */}
            <DispatcherNotes vehicle={vehicle} onAddNote={handleAddNote} />

            {/* Emergency Services */}
            {(vehicle.status === 'warning' || vehicle.status === 'critical') && (
              <EmergencyServices vehicleId={vehicle.id} location={vehicle.position} />
            )}

            {/* Action Buttons */}
            {(vehicle.status === 'warning' || vehicle.status === 'critical') && (
              <div className="space-y-3">
                <button className="w-full flex items-center justify-center space-x-2 bg-[#F9D71C] hover:bg-[#e5c619] text-black font-semibold py-3 rounded-lg transition">
                  <Phone size={20} />
                  <span>Call Gus</span>
                </button>
                <button className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition">
                  <Navigation size={20} />
                  <span>Suggest Reroute</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
