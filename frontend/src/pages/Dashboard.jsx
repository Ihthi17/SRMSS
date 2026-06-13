import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // 🌟 Added for routing transitions
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import StatCard from "../components/StatCard";
import axios from "axios"; // Ensure your axios instance is imported here

export default function Dashboard() {
  const [role, setRole] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // 🌟 State hooks to maintain dynamic metrics values
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDepots: 0,
    totalRoutes: 0,
    totalBuses: 0,
    totalDrivers:0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/login"; 
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      
      if (payload.role) {
        const parsedRole = typeof payload.role === "object" 
          ? payload.role.role_name || payload.role.role_id 
          : payload.role;
          
        setRole(parsedRole || payload.role_name || "UNKNOWN ROLE");
      } else if (payload.role_name) {
        setRole(payload.role_name);
      } else {
        setRole("USER");
      }
    } catch (error) {
      console.error("Invalid token parsing error:", error);
      localStorage.removeItem("token");
      window.location.href = "/login";
    }

    // 🌟 Fetch database metric counters on component mount
    const fetchDashboardStats = async () => {
      try {
        setLoadingStats(true);
        // Configure headers if your backend protected routes require authorization tokens
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const res = await axios.get("http://localhost:5000/api/dashboard/stats", config);
        
        if (res.data) {
          setStats(res.data);
        }
      } catch (err) {
        console.error("❌ Failed to load live dashboard statistics:", err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchDashboardStats();
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-wide">Dashboard</h1>
              <p className="text-sm text-neutral-400">System overview metrics and live vehicle logs</p>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-500 font-semibold tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              {typeof role === "string" ? role.toUpperCase() : "LOADING..."}
            </div>
          </div>

          {/* 🌟 Grid layout containing interactive links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
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
        </div>
      </div>
    </div>
  );
}