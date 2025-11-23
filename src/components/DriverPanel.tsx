import { useState } from 'react';
import { Star, Package, Phone, Mail, Calendar, LogOut } from 'lucide-react';
import type { Vehicle, DriverProfile } from '../types';
import { useJobStore } from '../stores/jobStore';
import MapboxMap from './MapboxMap';

interface DriverPanelProps {
  driver: DriverProfile;
  vehicle: Vehicle | null;
  onTakeJob: (jobId: string) => void;
  onCompleteJob?: (jobId: string) => void;
  onLogout?: () => void;
}

export default function DriverPanel({
  driver,
  vehicle,
  onTakeJob,
  onCompleteJob,
  onLogout,
}: DriverPanelProps) {
  const [activePanel, setActivePanel] = useState<'jobs' | 'profile' | 'history' | 'vehicle' | null>(null);
  const jobStore = useJobStore();
  
  const vehicleCapacity = driver.vehicleDetails?.capacity || 500;
  const availableJobs = jobStore.getAvailableJobs(vehicleCapacity);
  const myJobs = jobStore.getDriverJobs(driver.id);
  const completedJobs = driver.completedJobs || [];

  return (
    <div className="h-screen flex bg-[#0F0F0F]">
      {/* Left Sidebar */}
      <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col overflow-y-auto">
        {/* Driver Profile */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-[#F9D71C] rounded-full flex items-center justify-center text-3xl">
              👤
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{driver.name}</h2>
              <div className="flex items-center space-x-1 text-yellow-500">
                <Star size={16} fill="currentColor" />
                <span className="text-sm font-semibold">{driver.rating.toFixed(1)}</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800 p-3 rounded-lg">
              <p className="text-xs text-gray-400">Total Jobs</p>
              <p className="text-xl font-bold text-white">{driver.totalJobs}</p>
            </div>
            <div className="bg-gray-800 p-3 rounded-lg">
              <p className="text-xs text-gray-400">Earnings</p>
              <p className="text-xl font-bold text-[#F9D71C]">₹{driver.totalEarnings.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="p-4 border-b border-gray-800">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Phone size={14} />
              <span>{driver.phone}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Mail size={14} />
              <span>{driver.email}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Calendar size={14} />
              <span>Joined {new Date(driver.joinedDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Vehicle Info */}
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Vehicle</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Type</span>
              <span className="text-white">{driver.vehicleDetails.type}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Capacity</span>
              <span className="text-white">{driver.vehicleDetails.capacity} kg</span>
            </div>
          </div>
        </div>

        {/* Current Status */}
        {vehicle && (
          <div className="p-4 border-b border-gray-800">
            <div className={`p-4 rounded-lg ${
              vehicle.currentSpeed >= 95 ? 'bg-red-900/30 border border-red-500/50' : 'bg-gray-800'
            }`}>
              <p className="text-xs text-gray-400 mb-2">Current Status</p>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-semibold uppercase ${
                  vehicle.status === 'on-time' ? 'text-green-500' : 
                  vehicle.status === 'warning' ? 'text-yellow-500' : 
                  'text-red-500'
                }`}>
                  {vehicle.status}
                </span>
                <span className={`text-sm font-bold ${
                  vehicle.currentSpeed >= 95 ? 'text-red-500' : 'text-white'
                }`}>
                  {Math.round(vehicle.currentSpeed)} km/h
                </span>
              </div>
              {vehicle.currentSpeed >= 95 && (
                <div className="text-xs text-red-400 mt-2 flex items-center gap-1">
                  <span>⚠️</span>
                  <span>Near speed limit (100 km/h max)</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Logout Button */}
        {onLogout && (
          <div className="p-4 mt-auto">
            <button
              onClick={onLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="bg-[#1a1a1a] border-b border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">My Dashboard</h1>
              <p className="text-sm text-gray-400">Track your deliveries in real-time</p>
            </div>
            
            {/* Stats and Actions */}
            <div className="flex items-center space-x-4">
              <div className="bg-gray-800 px-4 py-3 rounded-lg text-center min-w-[100px]">
                <p className="text-xs text-gray-400 mb-1">Active Jobs</p>
                <p className="text-2xl font-bold text-[#F9D71C]">{myJobs.length}</p>
              </div>
              <div className="bg-gray-800 px-4 py-3 rounded-lg text-center min-w-[120px]">
                <p className="text-xs text-gray-400 mb-1">This Month</p>
                <p className="text-2xl font-bold text-green-500">₹{driver.currentMonthEarnings.toLocaleString()}</p>
              </div>
              
              <button
                onClick={() => setActivePanel(activePanel === 'jobs' ? null : 'jobs')}
                className={`font-semibold px-6 py-3 rounded-lg transition flex items-center gap-2 ${
                  activePanel === 'jobs' ? 'bg-[#F9D71C] text-black' : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
              >
                <Package size={18} />
                Jobs
              </button>
              <button
                onClick={() => setActivePanel(activePanel === 'profile' ? null : 'profile')}
                className={`font-semibold px-6 py-3 rounded-lg transition ${
                  activePanel === 'profile' ? 'bg-[#F9D71C] text-black' : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActivePanel(activePanel === 'history' ? null : 'history')}
                className={`font-semibold px-6 py-3 rounded-lg transition ${
                  activePanel === 'history' ? 'bg-[#F9D71C] text-black' : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
              >
                History
              </button>
              <button
                onClick={() => setActivePanel(activePanel === 'vehicle' ? null : 'vehicle')}
                className={`font-semibold px-6 py-3 rounded-lg transition ${
                  activePanel === 'vehicle' ? 'bg-[#F9D71C] text-black' : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
              >
                Vehicle
              </button>
            </div>
          </div>
        </div>

        {/* Map View */}
        <div className="flex-1 relative">
          {vehicle ? (
            <MapboxMap
              vehicles={[vehicle]}
              selectedVehicleId={vehicle.id}
              onVehicleClick={() => {}}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <div className="text-6xl mb-4">🗺️</div>
                <h2 className="text-2xl font-bold text-white mb-2">No Active Job</h2>
                <p className="text-gray-400 mb-4">Accept a job to see your route on the map</p>
                <button
                  onClick={() => setActivePanel('jobs')}
                  className="bg-[#F9D71C] hover:bg-[#e5c619] text-black font-semibold px-6 py-3 rounded-lg transition"
                >
                  View Available Jobs
                </button>
              </div>
            </div>
          )}

          {/* Side Panel Overlay */}
          {activePanel && (
            <div className="absolute top-0 right-0 w-[500px] h-full bg-gray-900/98 backdrop-blur-sm border-l border-gray-800 overflow-y-auto shadow-2xl">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    {activePanel === 'jobs' && 'Available Jobs'}
                    {activePanel === 'profile' && 'My Profile'}
                    {activePanel === 'history' && 'Job History'}
                    {activePanel === 'vehicle' && 'Vehicle Details'}
                  </h2>
                  <button
                    onClick={() => setActivePanel(null)}
                    className="text-gray-400 hover:text-white text-2xl"
                  >
                    ×
                  </button>
                </div>

                {/* Jobs Panel */}
                {activePanel === 'jobs' && (
                  <div>

                {/* My Active Jobs */}
                {myJobs.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-3">My Active Jobs</h3>
                    <div className="space-y-3">
                      {myJobs.map((job: any) => (
                        <div key={job.id} className="bg-green-900/30 border border-green-500/30 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="text-white font-semibold">{job.jobNumber}</h4>
                              <p className="text-sm text-gray-400">{job.cargoType}</p>
                            </div>
                            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">ACTIVE</span>
                          </div>
                          <div className="text-sm text-gray-300 mb-3">
                            <p>📍 {job.deliveryLocation.address}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {job.estimatedDistance?.toFixed(1)} km • ₹{job.payment}
                            </p>
                          </div>
                          {onCompleteJob && (
                            <button
                              onClick={() => onCompleteJob(job.id)}
                              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded transition"
                            >
                              Complete Job
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available Jobs */}
                <h3 className="text-lg font-semibold text-white mb-3">Available Jobs</h3>
                {availableJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No jobs available at the moment</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableJobs.map((job: any) => (
                      <div key={job.id} className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-white font-semibold">{job.jobNumber}</h4>
                            <p className="text-sm text-gray-400">{job.cargoType} • {job.cargoWeight} kg</p>
                          </div>
                          <span className="text-[#F9D71C] font-bold">₹{job.payment}</span>
                        </div>
                        <div className="text-sm text-gray-300 mb-3">
                          <p>📍 {job.deliveryLocation.address}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {job.estimatedDistance?.toFixed(1)} km • {(job.estimatedDuration * 60).toFixed(0)} min
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            onTakeJob(job.id);
                            setActivePanel(null);
                          }}
                          className="w-full bg-[#F9D71C] hover:bg-[#e5c619] text-black font-semibold py-2 rounded transition"
                        >
                          Accept Job
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                  </div>
                )}

                {/* Profile Panel */}
                {activePanel === 'profile' && (
                  <div className="space-y-6">
                    <div className="bg-gray-800 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Personal Information</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm text-gray-400">Full Name</label>
                          <p className="text-lg text-white font-semibold">{driver.name}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-400">Email</label>
                          <p className="text-lg text-white font-semibold">{driver.email}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-400">Phone</label>
                          <p className="text-lg text-white font-semibold">{driver.phone}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-400">License Number</label>
                          <p className="text-lg text-white font-semibold">{driver.licenseNumber}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Performance Stats</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-900 p-4 rounded-lg">
                          <p className="text-sm text-gray-400 mb-1">Total Deliveries</p>
                          <p className="text-2xl font-bold text-white">{driver.totalJobs}</p>
                        </div>
                        <div className="bg-gray-900 p-4 rounded-lg">
                          <p className="text-sm text-gray-400 mb-1">On-Time Rate</p>
                          <p className="text-2xl font-bold text-green-500">{driver.onTimeDeliveryRate.toFixed(1)}%</p>
                        </div>
                        <div className="bg-gray-900 p-4 rounded-lg">
                          <p className="text-sm text-gray-400 mb-1">Total Distance</p>
                          <p className="text-2xl font-bold text-white">{driver.totalDistanceCovered.toFixed(0)} km</p>
                        </div>
                        <div className="bg-gray-900 p-4 rounded-lg">
                          <p className="text-sm text-gray-400 mb-1">Rating</p>
                          <p className="text-2xl font-bold text-yellow-500">{driver.rating.toFixed(1)} ⭐</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* History Panel */}
                {activePanel === 'history' && (
                  <div className="space-y-4">
                    <div className="bg-gray-800 rounded-lg p-6">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-900 p-4 rounded-lg">
                          <p className="text-sm text-gray-400 mb-1">Total Earnings</p>
                          <p className="text-2xl font-bold text-[#F9D71C]">₹{driver.totalEarnings.toLocaleString()}</p>
                        </div>
                        <div className="bg-gray-900 p-4 rounded-lg">
                          <p className="text-sm text-gray-400 mb-1">This Month</p>
                          <p className="text-2xl font-bold text-white">₹{driver.currentMonthEarnings.toLocaleString()}</p>
                        </div>
                        <div className="bg-gray-900 p-4 rounded-lg">
                          <p className="text-sm text-gray-400 mb-1">Avg/Job</p>
                          <p className="text-2xl font-bold text-white">₹{driver.averageEarningsPerJob.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-white">Recent Deliveries</h3>
                    {completedJobs.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-400">No completed jobs yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {completedJobs.slice(0, 10).map((job: any, index: number) => (
                          <div key={index} className="bg-gray-800 rounded-lg p-4">
                            <div className="flex justify-between mb-2">
                              <div>
                                <h4 className="text-white font-semibold">{job.title || 'Delivery'}</h4>
                                <p className="text-sm text-gray-400">
                                  {job.completedDate ? new Date(job.completedDate).toLocaleDateString() : 'N/A'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-bold text-[#F9D71C]">₹{job.earnings}</p>
                                {job.rating && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <Star size={14} fill="#F9D71C" className="text-[#F9D71C]" />
                                    <span className="text-sm text-yellow-500">{job.rating.toFixed(1)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-4 text-sm text-gray-400">
                              <span>{job.distance?.toFixed(1)} km</span>
                              <span>{job.cargoType}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Vehicle Panel */}
                {activePanel === 'vehicle' && (
                  <div className="space-y-6">
                    <div className="bg-gray-800 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Vehicle Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-400">Registration</label>
                          <p className="text-lg text-white font-semibold">{driver.vehicleDetails.registrationNumber}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-400">Type</label>
                          <p className="text-lg text-white font-semibold">{driver.vehicleDetails.type}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-400">Make</label>
                          <p className="text-lg text-white font-semibold">{driver.vehicleDetails.make}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-400">Model</label>
                          <p className="text-lg text-white font-semibold">{driver.vehicleDetails.model}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-400">Year</label>
                          <p className="text-lg text-white font-semibold">{driver.vehicleDetails.year}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-400">Capacity</label>
                          <p className="text-lg text-white font-semibold">{driver.vehicleDetails.capacity} kg</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-400">Odometer</label>
                          <p className="text-lg text-white font-semibold">{driver.vehicleDetails.currentOdometer.toLocaleString()} km</p>
                        </div>
                      </div>
                    </div>

                    {vehicle && (
                      <div className="bg-gray-800 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Current Status</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Status</span>
                            <span className={`font-semibold uppercase ${
                              vehicle.status === 'on-time' ? 'text-green-500' :
                              vehicle.status === 'warning' ? 'text-yellow-500' :
                              'text-red-500'
                            }`}>
                              {vehicle.status}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Current Speed</span>
                            <span className="text-white font-semibold">{Math.round(vehicle.currentSpeed)} km/h</span>
                          </div>
                          {vehicle.batteryLevel && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Battery</span>
                              <span className="text-white font-semibold">{Math.round(vehicle.batteryLevel)}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
