import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import StatCard from "../components/StatCard";

export default function DepotDashboard() {
  const { depotId } = useParams();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    message: "",
    type: "success",
  });

  const showAlert = (message, type = "success") => {
    setAlertConfig({ isOpen: true, message, type });
    setTimeout(() => {
      setAlertConfig((prev) => ({ ...prev, isOpen: false }));
    }, 4500);
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/depots/dashboard/${depotId}`);
      const data = await response.json();
      
      console.log('Dashboard response:', response.status, data);
      
      if (response.ok) {
        setDashboardData(data);
      } else {
        console.error('API error:', data);
        showAlert(data.error || "Failed to fetch dashboard data", "error");
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      showAlert("Could not connect to server: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (depotId) {
      fetchDashboardData();
      // Set up auto-refresh every 30 seconds for real-time data
      const interval = setInterval(fetchDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [depotId]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'on-time': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'delayed': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'completed': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'scheduled': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default: return 'text-neutral-400 bg-neutral-500/10 border-neutral-500/20';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'on-time': 
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'delayed': 
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'completed': 
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'scheduled': 
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default: 
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-neutral-950 text-white">
        <Sidebar isOpen={isSidebarOpen} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-500 mx-auto mb-4"></div>
            <p className="text-neutral-400">Loading depot dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex min-h-screen bg-neutral-950 text-white">
        <Sidebar isOpen={isSidebarOpen} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-red-400">Failed to load depot dashboard data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white overflow-x-hidden relative">
      
      {/* Alert Notification */}
      {alertConfig.isOpen && (
        <div className="fixed top-5 right-5 z-[100] max-w-sm w-[90%] sm:w-full bg-neutral-900 border rounded-xl shadow-2xl p-4 animate-fade-in-down transition-all duration-300 flex items-start gap-3 border-neutral-800">
          <div className="mt-0.5">
            {alertConfig.type === "success" ? (
              <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="p-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold capitalize text-white tracking-wide">
              {alertConfig.type === "success" ? "System Notification" : "Operational Alert"}
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">{alertConfig.message}</p>
          </div>
          <button 
            onClick={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} 
            className="text-neutral-500 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <Sidebar isOpen={isSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          onLogout={() => window.location.href = "/"} 
        />
        
        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
          
          {/* Header with Depot Info */}
          <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-wide flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                {dashboardData.depot.depot_name} Control Center
              </h1>
              <p className="text-neutral-400 mt-1">
                Real-time operational dashboard • {dashboardData.depot.location}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-neutral-500">
                <span>Contact: {dashboardData.depot.contact_person}</span>
                <span>•</span>
                <span>Phone: {dashboardData.depot.contact_phone}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              Auto-refresh every 30 seconds
            </div>
          </div>

          {/* Overview Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Active Routes"
              value={dashboardData.overview.activeRoutes}
              subtitle={`of ${dashboardData.statistics.totalRoutes} total routes`}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              }
            />
            <StatCard
              title="Available Buses"
              value={dashboardData.overview.availableBuses}
              subtitle={`of ${dashboardData.overview.totalBuses} total buses`}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2v0a2 2 0 01-2-2v0a2 2 0 01-2-2H8z" />
                </svg>
              }
            />
            <StatCard
              title="Assigned Drivers"
              value={dashboardData.overview.assignedDrivers}
              subtitle="currently on duty"
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
            <StatCard
              title="Vehicle Utilization"
              value={`${dashboardData.statistics.vehicleUtilizationRate}%`}
              subtitle={`${dashboardData.statistics.tripsCompleted} trips completed (30d)`}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
            />
          </div>

          {/* Real-time Trip Status */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-neutral-800">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Real-Time Trip Status
              </h2>
              <p className="text-sm text-neutral-400 mt-1">Live monitoring of all ongoing operations</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-950 text-amber-500 text-xs font-semibold uppercase border-b border-neutral-800 tracking-wider">
                    <th className="p-4">Schedule</th>
                    <th className="p-4">Route</th>
                    <th className="p-4">Bus</th>
                    <th className="p-4">Driver</th>
                    <th className="p-4">Departure</th>
                    <th className="p-4">Expected Arrival</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50 text-sm">
                  {dashboardData.realTimeTrips.length > 0 ? (
                    dashboardData.realTimeTrips.map((trip) => (
                      <tr key={trip.schedule_id} className="hover:bg-neutral-850/30 transition-colors">
                        <td className="p-4">
                          <div className="font-mono text-amber-400">{trip.schedule_code}</div>
                          <div className="text-xs text-neutral-500">{trip.schedule_date}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-white">{trip.route_name || 'N/A'}</div>
                          <div className="text-xs text-neutral-400">
                            {trip.start_location} → {trip.end_location}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-white">{trip.bus_code || 'N/A'}</div>
                          <div className="text-xs text-neutral-500 font-mono">{trip.registration_number || 'N/A'}</div>
                        </td>
                        <td className="p-4 text-neutral-300">{trip.driver_name || 'Not Assigned'}</td>
                        <td className="p-4 text-neutral-400 font-mono">{trip.departure_time || 'N/A'}</td>
                        <td className="p-4 text-neutral-400 font-mono">{trip.expected_arrival_time || 'N/A'}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusColor(trip.trip_status)}`}>
                            {getStatusIcon(trip.trip_status)}
                            {trip.trip_status.replace('-', ' ').toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-neutral-500">
                        No active trips found for this depot
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Activities */}
          {dashboardData.recentActivities && dashboardData.recentActivities.length > 0 && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Recent Activities
              </h3>
              <div className="space-y-3">
                {dashboardData.recentActivities.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm text-white">{activity.message}</p>
                      <p className="text-xs text-neutral-500 mt-1">{activity.activity_date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}