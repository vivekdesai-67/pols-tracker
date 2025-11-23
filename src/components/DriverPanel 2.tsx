import { useState, useEffect } from 'react';
import { Truck, Clock, Star, Package, XCircle, User, Phone, Mail, Calendar } from 'lucide-react';
import type { Vehicle, DriverProfile } from '../types';
import { useJobStore } from '../stores/jobStore';
import { useVehicleStore } from '../stores/vehicleStore';
import AbortJobModal from './AbortJobModal';

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
  const [activeTab, setActiveTab] = useState<'jobs' | 'profile' | 'history' | 'vehicle'>('jobs');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [abortModalOpen, setAbortModalOpen] = useState(false);
  const [jobToAbort, setJobToAbort] = useState<any>(null);
  
  const jobStore = useJobStore();
  const { removeVehicle } = useVehicleStore();
  
  const vehicleCapacity = driver.vehicleDetails?.capacity || 500;
  const availableJobs = jobStore.getAvailableJobs(vehicleCapacity);
  const myJobs = jobStore.getDriverJobs(driver.id);
  const completedJobs = driver.completedJobs || [];

  // Check if a job has time conflict with active jobs
  const hasTimeConflict = (newJob: any) => {
    const newPickup = new Date(newJob.pickupTime).getTime();
    const newDelivery = new Date(newJob.deliveryTime).getTime();
    
    return myJobs.some((activeJob: any) => {
      const activePickup = new Date(activeJob.pickupTime).getTime();
      const activeDelivery = new Date(activeJob.deliveryTime).getTime();
      
      // Check if time ranges overlap
      return (newPickup < activeDelivery && newDelivery > activePickup);
    });
  };

  // Format time for display
  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  useEffect(() => {
    if (myJobs.length > 0) {
      const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
      return () => clearInterval(interval);
    }
  }, [myJobs.length]);

  const handleAbortJob = async (reason: string) => {
    if (!jobToAbort) return;
    try {
      await jobStore.abortJob(jobToAbort.id, reason);
      removeVehicle(`job-${jobToAbort.id}`);
      setJobToAbort(null);
      setAbortModalOpen(false);
    } catch (error) {
      console.error('Failed to abort job:', error);
    }
  };

  return (
    <div className="flex h-full bg-[#0F0F0F]">
      <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-[#F9D71C] rounded-full flex items-center justify-center text-3xl">👤</div>
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

        <div className="p-4 border-b border-gray-800">
          <div className="space-y-2 mb-4">
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

        <div className="p-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Last Travel</h3>
          {completedJobs.length > 0 ? (
            <div className="bg-gray-800 p-3 rounded-lg">
              <p className="text-sm text-white font-semibold mb-1">{completedJobs[0].title}</p>
              <div className="flex justify-between text-xs text-gray-400">
                <span>{completedJobs[0].distance?.toFixed(1)} km</span>
                <span>₹{completedJobs[0].earnings}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No completed jobs yet</p>
          )}
        </div>

        <div className="p-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Vehicle Condition</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Type</span>
              <span className="text-white">{driver.vehicleDetails.type}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Capacity</span>
              <span className="text-white">{driver.vehicleDetails.capacity} kg</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Odometer</span>
              <span className="text-white">{driver.vehicleDetails.currentOdometer.toLocaleString()} km</span>
            </div>
          </div>
        </div>

        {vehicle && (
          <div className="p-4 border-t border-gray-800">
            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-xs text-gray-400 mb-2">Current Status</p>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold uppercase ${vehicle.status === 'on-time' ? 'text-green-500' : vehicle.status === 'warning' ? 'text-yellow-500' : 'text-red-500'}`}>{vehicle.status}</span>
                <span className="text-sm text-white">{Math.round(vehicle.currentSpeed)} km/h</span>
              </div>
            </div>
          </div>
        )}

        {onLogout && (
          <div className="p-4 border-t border-gray-800 mt-auto">
            <button onClick={onLogout} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-3 rounded-lg transition">Logout</button>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
          <div className="flex space-x-2">
            <button onClick={() => setActiveTab('jobs')} className={`px-4 py-2 rounded-lg font-semibold transition ${activeTab === 'jobs' ? 'bg-[#F9D71C] text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
              <Package size={16} className="inline mr-2" />
              Available Jobs
            </button>
            <button onClick={() => setActiveTab('profile')} className={`px-4 py-2 rounded-lg font-semibold transition ${activeTab === 'profile' ? 'bg-[#F9D71C] text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
              <User size={16} className="inline mr-2" />
              Profile
            </button>
            <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-lg font-semibold transition ${activeTab === 'history' ? 'bg-[#F9D71C] text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
              <Clock size={16} className="inline mr-2" />
              History
            </button>
            <button onClick={() => setActiveTab('vehicle')} className={`px-4 py-2 rounded-lg font-semibold transition ${activeTab === 'vehicle' ? 'bg-[#F9D71C] text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
              <Truck size={16} className="inline mr-2" />
              Vehicle
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'jobs' && (
            <div>
              <h1 className="text-3xl font-bold text-white mb-6">Available Jobs</h1>
            {myJobs.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">My Active Jobs</h2>
                {myJobs.map((job: any) => {
                  const isCompleted = job.status === 'completed';
                  const startTime = job.startedAt ? new Date(job.startedAt).getTime() : Date.now();
                  const elapsedMs = currentTime - startTime;
                  const requiredMs = job.estimatedDuration * 60 * 60 * 1000;
                  const canComplete = elapsedMs >= requiredMs;
                  
                  // Calculate time display
                  const elapsedMinutes = Math.floor(elapsedMs / 60000);
                  const requiredMinutes = Math.floor(requiredMs / 60000);
                  const elapsedHours = Math.floor(elapsedMinutes / 60);
                  const elapsedMins = elapsedMinutes % 60;
                  const requiredHours = Math.floor(requiredMinutes / 60);
                  const requiredMins = requiredMinutes % 60;
                  const progressPercent = Math.min((elapsedMs / requiredMs) * 100, 100);
                  
                  return (
                    <div key={job.id} className={`rounded-lg p-5 border mb-4 ${isCompleted ? 'bg-blue-900/20 border-blue-500/30' : canComplete ? 'bg-green-900/20 border-green-500/30' : 'bg-yellow-900/20 border-yellow-500/30'}`}>
                      <div className="flex justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-white">{job.title}</h3>
                          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded text-white ${isCompleted ? 'bg-blue-600' : canComplete ? 'bg-green-600' : 'bg-yellow-600'}`}>
                            {isCompleted ? 'COMPLETED' : canComplete ? 'READY TO COMPLETE' : 'IN PROGRESS'}
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-[#F9D71C]">₹{job.payment}</p>
                      </div>
                      
                      {/* Progress Section */}
                      {!isCompleted && (
                        <div className="mb-4 bg-gray-900/50 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Elapsed Time</p>
                              <p className="text-2xl font-bold text-white font-mono">
                                {elapsedHours}h {elapsedMins}m
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-400 mb-1">Progress</p>
                              <p className={`text-2xl font-bold font-mono ${canComplete ? 'text-green-500' : 'text-yellow-500'}`}>
                                {progressPercent.toFixed(0)}%
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-400 mb-1">Required Time</p>
                              <p className="text-2xl font-bold text-gray-300 font-mono">
                                {requiredHours}h {requiredMins}m
                              </p>
                            </div>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-1000 ${canComplete ? 'bg-green-500' : 'bg-yellow-500'}`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          
                          {canComplete ? (
                            <p className="text-center text-green-400 text-sm mt-2 font-semibold">
                              ✓ Delivery time completed! You can mark this job as complete.
                            </p>
                          ) : (
                            <p className="text-center text-gray-400 text-sm mt-2">
                              ⏳ Keep going! {requiredMinutes - elapsedMinutes} minutes remaining
                            </p>
                          )}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div>
                          <p className="text-gray-400">Pickup</p>
                          <p className="text-white font-semibold">{job.pickupLocation.address}</p>
                          <p className="text-xs text-gray-500 mt-1">📅 {formatTime(job.pickupTime)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Delivery</p>
                          <p className="text-white font-semibold">{job.deliveryLocation.address}</p>
                          <p className="text-xs text-gray-500 mt-1">📅 {formatTime(job.deliveryTime)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Cargo Weight</p>
                          <p className="text-white font-semibold">{job.cargoWeight}kg</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Cargo Type</p>
                          <p className="text-white font-semibold">{job.cargoType}</p>
                        </div>
                      </div>
                      {!isCompleted && (
                        <div className="space-y-2">
                          {canComplete && onCompleteJob && (
                            <button onClick={() => onCompleteJob(job.id)} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition">Complete Delivery</button>
                          )}
                          <button onClick={() => { setJobToAbort(job); setAbortModalOpen(true); }} className="w-full bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 font-semibold py-3 rounded-lg transition flex items-center justify-center space-x-2">
                            <XCircle size={20} />
                            <span>Abort Delivery</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <h2 className="text-xl font-semibold text-white mb-4">New Opportunities</h2>
            {availableJobs.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-8 text-center">
                <Package size={48} className="mx-auto text-gray-600 mb-3" />
                <p className="text-gray-400">No available jobs</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {availableJobs.map((job: any) => {
                  const hasIncompleteJob = myJobs.some((j: any) => j.status !== 'completed');
                  const overWeight = job.cargoWeight > vehicleCapacity;
                  const timeConflict = hasTimeConflict(job);
                  const canTake = !hasIncompleteJob && !overWeight && !timeConflict;
                  
                  return (
                    <div key={job.id} className={`bg-gray-800 rounded-lg p-5 ${!canTake && 'opacity-60'}`}>
                      <div className="flex justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-white">{job.title}</h3>
                          <p className="text-sm text-gray-300">{job.description}</p>
                        </div>
                        <p className="text-2xl font-bold text-[#F9D71C]">₹{job.payment}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                        <div>
                          <p className="text-gray-400">Pickup</p>
                          <p className="text-white font-semibold">{job.pickupLocation.address}</p>
                          <p className="text-xs text-blue-400 mt-1">📅 {formatTime(job.pickupTime)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Delivery</p>
                          <p className="text-white font-semibold">{job.deliveryLocation.address}</p>
                          <p className="text-xs text-blue-400 mt-1">📅 {formatTime(job.deliveryTime)}</p>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-gray-700">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex space-x-4 text-sm text-gray-400">
                            <span><Clock size={14} className="inline" /> {job.estimatedDuration.toFixed(1)}h</span>
                            <span><Truck size={14} className="inline" /> {job.cargoType}</span>
                          </div>
                          <div className={`text-sm font-semibold ${overWeight ? 'text-red-500' : 'text-green-500'}`}>
                            Weight: {job.cargoWeight}kg / {vehicleCapacity}kg
                          </div>
                        </div>
                        {overWeight && (
                          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-2 mb-2">
                            <p className="text-xs text-red-400 text-center">⚠️ Cargo exceeds your vehicle capacity by {(job.cargoWeight - vehicleCapacity).toFixed(0)}kg</p>
                          </div>
                        )}
                        {timeConflict && (
                          <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-2 mb-2">
                            <p className="text-xs text-orange-400 text-center">⏰ Time conflict with your active job schedule</p>
                          </div>
                        )}
                        <div className="flex justify-end">
                          {hasIncompleteJob && !timeConflict ? (
                            <button disabled className="bg-gray-600 text-gray-400 px-6 py-2 rounded-lg cursor-not-allowed">Complete Current Job First</button>
                          ) : timeConflict ? (
                            <button disabled className="bg-gray-600 text-gray-400 px-6 py-2 rounded-lg cursor-not-allowed">Schedule Conflict</button>
                          ) : overWeight ? (
                            <button disabled className="bg-gray-600 text-gray-400 px-6 py-2 rounded-lg cursor-not-allowed">Too Heavy for Vehicle</button>
                          ) : (
                            <button onClick={() => onTakeJob(job.id)} className="bg-[#F9D71C] hover:bg-[#e5c619] text-black font-semibold px-6 py-2 rounded-lg transition">Take Job</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div>
              <h1 className="text-3xl font-bold text-white mb-6">My Profile</h1>
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-white mb-4">Personal Information</h2>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm text-gray-400">Full Name</label>
                    <p className="text-lg text-white font-semibold">{driver.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">License Number</label>
                    <p className="text-lg text-white font-semibold">{driver.licenseNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Phone</label>
                    <p className="text-lg text-white font-semibold">{driver.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Email</label>
                    <p className="text-lg text-white font-semibold">{driver.email}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Performance Stats</h2>
                <div className="grid grid-cols-3 gap-4">
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
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <h1 className="text-3xl font-bold text-white mb-6">Job History</h1>
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Completed</p>
                    <p className="text-2xl font-bold text-green-500">{driver.successfulDeliveries}</p>
                  </div>
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
              <h2 className="text-xl font-semibold text-white mb-4">Recent Deliveries</h2>
              <div className="space-y-4">
                {completedJobs.slice(0, 10).map((job: any) => (
                  <div key={job.jobId} className="bg-gray-800 rounded-lg p-5">
                    <div className="flex justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">{job.title}</h3>
                        <p className="text-sm text-gray-400">{new Date(job.completedDate).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-[#F9D71C]">₹{job.earnings}</p>
                        {job.rating && (
                          <div className="flex items-center space-x-1 mt-1">
                            <Star size={14} fill="#F9D71C" className="text-[#F9D71C]" />
                            <span className="text-sm text-yellow-500">{job.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-6 text-sm text-gray-400">
                      <span>{job.distance?.toFixed(1)} km</span>
                      <span>{job.duration?.toFixed(1)}h</span>
                      <span>{job.cargoType}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'vehicle' && (
            <div>
              <h1 className="text-3xl font-bold text-white mb-6">Vehicle Details</h1>
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-white mb-4">Vehicle Information</h2>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm text-gray-400">Registration Number</label>
                    <p className="text-lg text-white font-semibold">{driver.vehicleDetails.registrationNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Type</label>
                    <p className="text-lg text-white font-semibold">{driver.vehicleDetails.type}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Make & Model</label>
                    <p className="text-lg text-white font-semibold">{driver.vehicleDetails.make} {driver.vehicleDetails.model}</p>
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
            </div>
          )}
        </div>
      </div>

      <AbortJobModal isOpen={abortModalOpen} jobTitle={jobToAbort?.title || ''} onClose={() => { setAbortModalOpen(false); setJobToAbort(null); }} onConfirm={handleAbortJob} />
    </div>
  );
}
