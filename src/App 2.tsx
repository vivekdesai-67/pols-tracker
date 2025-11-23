import { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { useVehicleStore } from './stores/vehicleStore';
import LoginScreen from './components/LoginScreen';
import MapboxMap from './components/MapboxMap';
import AdminSidebar from './components/AdminSidebar';
import DetailPanel from './components/DetailPanel';
import DriverPanel from './components/DriverPanel';
import LandingPage from './components/LandingPage';
import { generateFleetReport } from './utils/reportGenerator';

function App() {
  const { isAuthenticated, currentUser, initAuth, logout } = useAuthStore();
  const { vehicles, selectedVehicleId, setSelectedVehicle, startGPSSimulation, stopGPSSimulation } = useVehicleStore();
  const [showMap, setShowMap] = useState(true); // Show map by default
  const [showLanding, setShowLanding] = useState(true);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Initialize auth on app load
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Check if user has visited before
  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisitedLosPollos');
    if (hasVisited) {
      setShowLanding(false);
    }
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Start GPS simulation, fetch jobs, and initialize socket when authenticated
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      startGPSSimulation();
      
      // Initialize socket connection
      import('./services/socket').then(({ socketService }) => {
        socketService.connect(currentUser.id, currentUser.role);
      });
      
      // Fetch jobs from database and setup socket listeners
      import('./stores/jobStore').then(async ({ useJobStore }) => {
        const jobStore = useJobStore.getState();
        await jobStore.fetchJobs();
        jobStore.initializeSocketListeners();
        
        // Create vehicles for active jobs (admin only)
        if (currentUser.role === 'admin') {
          const activeJobs = jobStore.jobs.filter(
            (job: any) => job.status === 'in-progress' || job.status === 'assigned'
          );
          
          const vehicleStore = useVehicleStore.getState();
          
          activeJobs.forEach((job: any) => {
            if (job.assignedDriverId && job.assignedDriverName) {
              // Check if vehicle already exists
              const existingVehicle = vehicleStore.vehicles.find(
                (v: any) => v.id === `job-${job.id}`
              );
              
              if (!existingVehicle) {
                const newVehicle = {
                  id: `job-${job.id}`,
                  driverId: job.assignedDriverId,
                  driverName: job.assignedDriverName,
                  position: job.pickupLocation.position,
                  destination: {
                    lat: job.deliveryLocation.position.lat,
                    lng: job.deliveryLocation.position.lng,
                    address: job.deliveryLocation.address,
                  },
                  status: 'on-time' as const,
                  currentSpeed: 30 + Math.random() * 30,
                  batteryLevel: 70 + Math.random() * 30,
                  lastUpdate: new Date(),
                  route: [],
                  statusHistory: [],
                  cargoType: job.cargoType,
                  estimatedDuration: job.estimatedDuration,
                  estimatedDistance: job.estimatedDistance,
                  jobId: job.id,
                };
                
                vehicleStore.addVehicle(newVehicle);
                
                // Fetch route for this vehicle immediately
                import('./utils/routeFetcher').then(async ({ fetchRouteForVehicle }) => {
                  const route = await fetchRouteForVehicle(newVehicle);
                  if (route) {
                    vehicleStore.updateVehicleRoute(newVehicle.id, route);
                  }
                });
              }
            }
          });
        }
      });
      
      return () => {
        stopGPSSimulation();
        
        // Cleanup socket
        import('./services/socket').then(({ socketService }) => {
          socketService.disconnect();
        });
        
        // Cleanup job listeners
        import('./stores/jobStore').then(({ useJobStore }) => {
          useJobStore.getState().cleanupSocketListeners();
        });
      };
    }
  }, [isAuthenticated, currentUser, startGPSSimulation, stopGPSSimulation]);

  // Fetch driver profile if user is a driver
  useEffect(() => {
    if (currentUser?.role === 'driver') {
      const fetchDriverProfile = async () => {
        try {
          const response = await fetch(`http://localhost:5001/api/drivers/${currentUser.id}`);
          if (response.ok) {
            const data = await response.json();
            setDriverProfile({
              ...data,
              id: data._id,
              totalJobs: data.totalDeliveries,
              successfulDeliveries: data.totalDeliveries,
            });
          } else {
            console.error('Driver not found. Please register this driver first.');
            // Show error message to user
            alert('Driver profile not found. Please contact admin to register your account.');
          }
        } catch (error) {
          console.error('Failed to fetch driver profile:', error);
        }
      };
      
      fetchDriverProfile();
      
      // Refresh profile every 10 seconds
      const interval = setInterval(fetchDriverProfile, 10000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const handleGetStarted = () => {
    localStorage.setItem('hasVisitedLosPollos', 'true');
    setShowLanding(false);
  };

  // Show landing page first
  if (showLanding && !isAuthenticated) {
    return <LandingPage onGetStarted={handleGetStarted} />;
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const handleVehicleClick = (vehicleId: string) => {
    setSelectedVehicle(vehicleId);
  };

  const handleCloseDetailPanel = () => {
    setSelectedVehicle(null);
  };

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  const handleExportReport = () => {
    try {
      const filename = generateFleetReport(vehicles);
      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-20 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-[2000] animate-fade-in';
      notification.innerHTML = `
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>Report exported: ${filename}</span>
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.remove();
      }, 3000);
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report. Please try again.');
    }
  };



  // Show dashboard based on user role
  if (!showMap) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] text-white">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-[#F9D71C] mb-4">
              Welcome, {currentUser?.name}!
            </h1>
            <p className="text-xl text-gray-400 mb-4">
              Role: {currentUser?.role === 'admin' ? 'Administrator' : 'Driver'}
            </p>
            <div className="bg-gray-800 rounded-lg p-4 mb-8 inline-block">
              <p className="text-sm text-gray-400">Active Vehicles</p>
              <p className="text-3xl font-bold text-[#F9D71C]">{vehicles.length}</p>
              <div className="mt-2 text-xs text-gray-500">
                <span className="text-green-500">●</span> {vehicles.filter(v => v.status === 'on-time').length} On-Time{' '}
                <span className="text-yellow-500">●</span> {vehicles.filter(v => v.status === 'warning').length} Warning{' '}
                <span className="text-red-500">●</span> {vehicles.filter(v => v.status === 'critical').length} Critical
              </div>
            </div>
            <div className="space-x-4">
              <button
                onClick={() => setShowMap(true)}
                className="bg-[#F9D71C] hover:bg-[#e5c619] text-black font-semibold py-2 px-6 rounded-lg transition"
              >
                View Map
              </button>
              <button
                onClick={() => useAuthStore.getState().logout()}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show different views based on user role
  if (currentUser?.role === 'driver') {
    // Driver View - Show DriverPanel
    const driverVehicle = vehicles.find(v => v.driverId === currentUser.id);
    
    if (!driverProfile) {
      return (
        <div className="h-screen bg-[#0F0F0F] flex flex-col items-center justify-center">
          <div className="text-white text-xl mb-4">Loading profile...</div>
          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      );
    }

    const handleTakeJob = async (jobId: string) => {
      console.log('Taking job:', jobId);
      
      // Import jobStore dynamically
      const { useJobStore } = await import('./stores/jobStore');
      const jobStore = useJobStore.getState();
      
      // Get the job details
      const job = jobStore.jobs.find(j => j.id === jobId || j._id === jobId);
      if (!job) {
        console.error('Job not found');
        return;
      }
      
      // Assign job to driver
      await jobStore.assignJob(jobId, currentUser.id, currentUser.name);
      
      // Start the job immediately
      await jobStore.startJob(jobId);
      
      // Create a vehicle on the map for tracking
      const vehicleStore = useVehicleStore.getState();
      vehicleStore.addVehicle({
        id: `job-${jobId}`,
        driverId: currentUser.id,
        driverName: currentUser.name,
        position: job.pickupLocation.position,
        destination: {
          lat: job.deliveryLocation.position.lat,
          lng: job.deliveryLocation.position.lng,
          address: job.deliveryLocation.address,
        },
        status: 'on-time' as const,
        currentSpeed: 0,
        batteryLevel: 100,
        lastUpdate: new Date(),
        route: [],
        statusHistory: [],
        cargoType: job.cargoType,
        estimatedDuration: job.estimatedDuration,
        jobId: jobId,
      });
      
      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-20 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-[2000] animate-fade-in';
      notification.innerHTML = `
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>Job accepted! Good luck with your delivery.</span>
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    };

    const handleCompleteJob = async (jobId: string) => {
      console.log('Completing job:', jobId);
      
      // Import jobStore dynamically
      const { useJobStore } = await import('./stores/jobStore');
      const jobStore = useJobStore.getState();
      
      // Complete the job (this will update driver earnings in database)
      await jobStore.completeJob(jobId);
      
      // Remove vehicle from map
      const vehicleStore = useVehicleStore.getState();
      const vehicleId = `job-${jobId}`;
      vehicleStore.removeVehicle(vehicleId);
      
      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-20 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-[2000] animate-fade-in';
      notification.innerHTML = `
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>Job completed! Payment added to your earnings.</span>
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    };

    return (
      <div className="h-screen bg-[#0F0F0F]">
        <DriverPanel
          driver={driverProfile}
          vehicle={driverVehicle || null}
          onTakeJob={handleTakeJob}
          onCompleteJob={handleCompleteJob}
          onLogout={logout}
        />
      </div>
    );
  }

  // Admin View - Map view with Sidebar
  return (
    <div className="h-screen flex bg-[#0F0F0F]">
      {/* Left Sidebar */}
      <AdminSidebar
        user={currentUser!}
        onExportReport={handleExportReport}
        onLogout={logout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header with Stats */}
        <div className="bg-[#1a1a1a] border-b border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Fleet Overview</h1>
              <p className="text-sm text-gray-400">Real-time vehicle tracking and management</p>
            </div>
            
            {/* Status Cards */}
            <div className="flex items-center space-x-4">
              <div className="bg-gray-800 px-4 py-3 rounded-lg text-center min-w-[80px]">
                <p className="text-xs text-gray-400 mb-1">Total</p>
                <p className="text-2xl font-bold text-white">{vehicles.length}</p>
              </div>
              <div className="bg-green-900/30 border border-green-500/30 px-4 py-3 rounded-lg text-center min-w-[80px]">
                <p className="text-xs text-green-400 mb-1">On-Time</p>
                <p className="text-2xl font-bold text-green-500">{vehicles.filter(v => v.status === 'on-time').length}</p>
              </div>
              <div className="bg-yellow-900/30 border border-yellow-500/30 px-4 py-3 rounded-lg text-center min-w-[80px]">
                <p className="text-xs text-yellow-400 mb-1">Warning</p>
                <p className="text-2xl font-bold text-yellow-500">{vehicles.filter(v => v.status === 'warning').length}</p>
              </div>
              <div className="bg-red-900/30 border border-red-500/30 px-4 py-3 rounded-lg text-center min-w-[80px]">
                <p className="text-xs text-red-400 mb-1">Critical</p>
                <p className="text-2xl font-bold text-red-500">{vehicles.filter(v => v.status === 'critical').length}</p>
              </div>
              <div className="bg-gray-800 px-4 py-3 rounded-lg text-center min-w-[140px]">
                <p className="text-xs text-gray-400 mb-1">Live Clock</p>
                <p className="text-lg font-bold text-white font-mono">
                  {currentTime.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit', 
                    second: '2-digit',
                    hour12: true 
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {vehicles.length > 0 ? (
            <MapboxMap
              vehicles={vehicles}
              selectedVehicleId={selectedVehicleId}
              onVehicleClick={handleVehicleClick}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Loading vehicles...
            </div>
          )}

          {/* Detail Panel */}
          <DetailPanel
            vehicle={selectedVehicle ?? null}
            isOpen={!!selectedVehicleId}
            onClose={handleCloseDetailPanel}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
