import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import StatCard from "../components/StatCard";
import axios from "axios";

const COLORS = ["#f5c542", "#3b82f6", "#10b981", "#ef4444", "#a855f7"];

export default function Dashboard() {
  const [role, setRole] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDepots: 0,
    totalRoutes: 0,
    totalBuses: 0,
    totalDrivers: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Trip metrics
  const [tripMetrics, setTripMetrics] = useState({
    active_trips: 0,
    completed_trips: 0,
    delayed_trips: 0,
    total_today: 0,
    fuel_used_today: "0.00"
  });
  const [loadingTrips, setLoadingTrips] = useState(false);

  // Trip chart
  const [tripChart, setTripChart] = useState([]);
  const [loadingChart, setLoadingChart] = useState(false);

  // Route performance
  const [routePerf, setRoutePerf] = useState([]);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Live trips
  const [liveTrips, setLiveTrips] = useState([]);
  const [loadingLiveTrips, setLoadingLiveTrips] = useState(false);

  // Vehicle status
  const [vehicleStatus, setVehicleStatus] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // Fuel weekly
  const [fuelWeekly, setFuelWeekly] = useState([]);
  const [loadingFuel, setLoadingFuel] = useState(false);

  // Depot summary
  const [depotSummary, setDepotSummary] = useState([]);
  const [loadingDepots, setLoadingDepots] = useState(false);

  const navigate = useNavigate();

  const authHeader = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Parse JWT and set role
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const parsedRole = typeof payload.role === "object"
        ? payload.role.role_name || payload.role.role_id
        : payload.role;
      setRole(parsedRole || "USER");
    } catch (error) {
      console.error("❌ Invalid token:", error);
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  }, []);

  // Fetch all data
  useEffect(() => {
    const fetchAll = async () => {
      const headers = authHeader();

      // Stats
      try {
        setLoadingStats(true);
        const res = await axios.get("http://localhost:5000/api/dashboard/stats", { headers });
        setStats(res.data);
      } catch (err) {
        console.error("❌ Failed to load stats:", err);
      } finally {
        setLoadingStats(false);
      }

      // Trip metrics
      try {
        setLoadingTrips(true);
        const res = await axios.get("http://localhost:5000/api/dashboard/trip-metrics", { headers });
        setTripMetrics(res.data);
      } catch (err) {
        console.error("❌ Failed to load trip metrics:", err);
      } finally {
        setLoadingTrips(false);
      }

      // Trip chart
      try {
        setLoadingChart(true);
        const res = await axios.get("http://localhost:5000/api/dashboard/trip-chart", { headers });
        setTripChart(res.data);
      } catch (err) {
        console.error("❌ Failed to load trip chart:", err);
      } finally {
        setLoadingChart(false);
      }

      // Route performance
      try {
        setLoadingRoute(true);
        const res = await axios.get("http://localhost:5000/api/dashboard/route-performance", { headers });
        setRoutePerf(res.data);
      } catch (err) {
        console.error("❌ Failed to load route performance:", err);
      } finally {
        setLoadingRoute(false);
      }

      // Live trips
      try {
        setLoadingLiveTrips(true);
        const res = await axios.get("http://localhost:5000/api/dashboard/live-trips", { headers });
        setLiveTrips(res.data);
      } catch (err) {
        console.error("❌ Failed to load live trips:", err);
      } finally {
        setLoadingLiveTrips(false);
      }

      // Vehicle status
      try {
        setLoadingVehicles(true);
        const res = await axios.get("http://localhost:5000/api/dashboard/vehicle-status", { headers });
        setVehicleStatus(res.data);
      } catch (err) {
        console.error("❌ Failed to load vehicle status:", err);
      } finally {
        setLoadingVehicles(false);
      }

      // Fuel weekly
      try {
        setLoadingFuel(true);
        const res = await axios.get("http://localhost:5000/api/dashboard/fuel-weekly", { headers });
        setFuelWeekly(res.data);
      } catch (err) {
        console.error("❌ Failed to load fuel data:", err);
      } finally {
        setLoadingFuel(false);
      }

      // Depot summary
      try {
        setLoadingDepots(true);
        const res = await axios.get("http://localhost:5000/api/dashboard/depot-summary", { headers });
        setDepotSummary(res.data);
      } catch (err) {
        console.error("❌ Failed to load depot summary:", err);
      } finally {
        setLoadingDepots(false);
      }
    };

    fetchAll();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white overflow-x-hidden">
      <Sidebar isOpen={isSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onLogout={handleLogout}
        />

        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-wide">Dashboard</h1>
              <p className="text-sm text-neutral-400">System overview metrics and live vehicle logs</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-500 font-semibold tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {typeof role === "string" ? role.toUpperCase() : "LOADING..."}
            </div>
          </div>

          {/* System Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div onClick={() => navigate("/user")} className="cursor-pointer group">
              <StatCard
                title="Total Users"
                value={loadingStats ? "..." : stats.totalUsers}
                className="group-hover:border-amber-500/40 transition-all duration-200"
              />
            </div>
            <div onClick={() => navigate("/driver-management")} className="cursor-pointer group">
              <StatCard
                title="Total Drivers"
                value={loadingStats ? "..." : stats.totalDrivers}
                className="group-hover:border-amber-500/40 transition-all duration-200"
              />
            </div>
            <div onClick={() => navigate("/depots")} className="cursor-pointer group">
              <StatCard
                title="Total Depots"
                value={loadingStats ? "..." : stats.totalDepots}
                className="group-hover:border-amber-500/40 transition-all duration-200"
              />
            </div>
            <div onClick={() => navigate("/routes")} className="cursor-pointer group">
              <StatCard
                title="Total Routes"
                value={loadingStats ? "..." : stats.totalRoutes}
                className="group-hover:border-amber-500/40 transition-all duration-200"
              />
            </div>
            <div onClick={() => navigate("/buses")} className="cursor-pointer group">
              <StatCard
                title="Active Buses"
                value={loadingStats ? "..." : stats.totalBuses}
                className="group-hover:border-amber-500/40 transition-all duration-200"
              />
            </div>
          </div>

          {/* Today's Trip Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {[
              { label: "Total Trips",  value: tripMetrics.total_today,     icon: "📊" },
              { label: "Active",       value: tripMetrics.active_trips,    icon: "🚌" },
              { label: "Completed",    value: tripMetrics.completed_trips, icon: "✅" },
              { label: "Delayed",      value: tripMetrics.delayed_trips,   icon: "⚠️" },
              { label: "Cancelled",    value: tripMetrics.cancelled_trips || 0, icon: "❌" },
              { label: "Fuel Used (L)", value: tripMetrics.fuel_used_today, icon: "⛽" },
            ].map((item, i) => (
              <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-xs text-neutral-500 font-mono">All time</span>
                </div>
                <div className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-1">
                  {item.label}
                </div>
                <div className="text-2xl font-bold text-white font-mono">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trip Chart - This Week */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-4">
                Trips This Week
              </h3>
              {loadingChart ? (
                <div className="h-64 flex items-center justify-center text-neutral-500">Loading...</div>
              ) : tripChart.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-neutral-500">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={tripChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} dot={true} />
                    <Line type="monotone" dataKey="active"    name="Active"    stroke="#3b82f6" strokeWidth={2} dot={true} />
                    <Line type="monotone" dataKey="delayed"   name="Delayed"   stroke="#f97316" strokeWidth={2} dot={true} />
                    <Line type="monotone" dataKey="cancelled" name="Cancelled" stroke="#ef4444" strokeWidth={2} dot={true} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Route Performance */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-4">
                Route Performance
              </h3>
              {loadingRoute ? (
                <div className="h-64 flex items-center justify-center text-neutral-500">Loading...</div>
              ) : routePerf.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-neutral-500">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={routePerf.slice(0, 6)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="route_name" tick={{ fill: "#9ca3af", fontSize: 9 }} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="delayed"   fill="#f97316" name="Delayed"   radius={[4, 4, 0, 0]} />
                    <Bar dataKey="active"    fill="#3b82f6" name="Active"    radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Vehicle Status Pie Chart */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-4">
                Vehicle Status Distribution
              </h3>
              {loadingVehicles ? (
                <div className="h-64 flex items-center justify-center text-neutral-500">Loading...</div>
              ) : vehicleStatus.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-neutral-500">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={vehicleStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={e => `${e.status} (${e.count})`}
                    >
                      {vehicleStatus.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Fuel Consumption This Week */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest">
                  Fuel Consumption This Week
                </h3>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="px-2 py-1 bg-neutral-950 border border-neutral-800 rounded text-xs text-white"
                />
              </div>
              {loadingFuel ? (
                <div className="h-64 flex items-center justify-center text-neutral-500">Loading...</div>
              ) : fuelWeekly.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-neutral-500">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={fuelWeekly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="quantity" fill="#f5c542" name="Quantity (L)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Live Trip Status */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-4">
              Recent Trips
            </h3>
            {loadingLiveTrips ? (
              <div className="text-center py-8 text-neutral-500">Loading...</div>
            ) : liveTrips.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">No trips found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-neutral-300">
                  <thead>
                    <tr className="bg-neutral-950/60 text-amber-500 font-semibold uppercase text-[10px] border-b border-neutral-800">
                      <th className="px-4 py-3 text-left">Trip ID</th>
                      <th className="px-4 py-3 text-left">Route</th>
                      <th className="px-4 py-3 text-left">Bus</th>
                      <th className="px-4 py-3 text-left">Driver</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Departure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/40">
                    {liveTrips.slice(0, 10).map(trip => (
                      <tr key={trip.trip_id} className="hover:bg-neutral-800/20">
                        <td className="px-4 py-2 font-mono text-amber-400">#{trip.trip_id}</td>
                        <td className="px-4 py-2">{trip.route_name || "—"}</td>
                        <td className="px-4 py-2 font-mono">{trip.bus_code || trip.registration_number || "—"}</td>
                        <td className="px-4 py-2">{trip.driver_name || "—"}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            trip.trip_status === "Completed"   ? "bg-emerald-500/10 text-emerald-400"
                            : trip.trip_status === "In Progress" ? "bg-blue-500/10 text-blue-400"
                            : trip.trip_status === "Delayed"     ? "bg-orange-500/10 text-orange-400"
                            : trip.trip_status === "Cancelled"   ? "bg-red-500/10 text-red-400"
                            : "bg-amber-500/10 text-amber-400"
                          }`}>
                            {trip.trip_status}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-mono">{trip.trip_date}</td>
                        <td className="px-4 py-2 font-mono">{trip.departure_time || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Depot Summary */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-4">
              Depot Summary
            </h3>
            {loadingDepots ? (
              <div className="text-center py-8 text-neutral-500">Loading...</div>
            ) : depotSummary.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">No depots</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {depotSummary.map(depot => (
                  <div key={depot.depot_id} className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                    <div className="font-bold text-white text-sm mb-2">{depot.depot_name}</div>
                    <div className="space-y-1 text-xs text-neutral-300">
                      <div>🚌 Vehicles: <span className="font-mono text-amber-400">{depot.vehicles}</span></div>
                      <div>👨 Drivers: <span className="font-mono text-amber-400">{depot.drivers}</span></div>
                      <div>📍 Trips Today: <span className="font-mono text-amber-400">{depot.trips_today}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
