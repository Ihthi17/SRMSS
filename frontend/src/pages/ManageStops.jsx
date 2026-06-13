import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

export default function ManageStops() {
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [stops, setStops] = useState([]);
  const [search, setSearch] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [loadingStops, setLoadingStops] = useState(false);

  // Responsive UI Alert Banner Engine
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    message: "",
    type: "success", // 'success' | 'error'
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("create"); // 'create' | 'edit' | 'view'
  
  // Form State Linked Parameters
  const [formData, setFormData] = useState({
    stop_id: null,
    stop_sequence: "",
    stop_name: "",
    latitude: "",
    longitude: "",
    distance_from_start: "",
    estimated_arrival_time: "",
  });

  // Display custom responsive alerts
  const showAlert = (message, type = "success") => {
    setAlertConfig({ isOpen: true, message, type });
    setTimeout(() => {
      setAlertConfig((prev) => ({ ...prev, isOpen: false }));
    }, 4500);
  };

  // 1. Fetch available routes for the sidebar selector component
  const fetchRoutes = async () => {
    try {
      setLoadingRoutes(true);
      const response = await fetch("http://localhost:5000/api/routes");
      const resData = await response.json();

      // FIXED: Checks if response array container exists safely, avoiding telemetry blockages on empty tables
      if (response.ok && resData && resData.success && Array.isArray(resData.data)) {
        setRoutes(resData.data);
        
        // Only attempt to select the first route if the grid database has elements inside
        if (resData.data.length > 0) {
          setSelectedRouteId(resData.data[0].route_id);
        }
      } else {
        setRoutes([]);
        showAlert("Received invalid structural layout envelope from routes API registry.", "error");
      }
    } catch (error) {
      console.error("Connection error:", error);
      setRoutes([]);
      showAlert("Could not connect to backend tracking catalog systems.", "error");
    } finally {
      setLoadingRoutes(false);
    }
  };

  // 2. Fetch assigned relational stop nodes database matching active row layout vector
  const fetchStops = async (routeId) => {
    if (!routeId) {
      setStops([]);
      return;
    }
    try {
      setLoadingStops(true);
      const response = await fetch(`http://localhost:5000/api/route-stops/route/${routeId}`);
      const resData = await response.json();

      if (response.ok && resData && resData.success && Array.isArray(resData.data)) {
        setStops(resData.data);
      } else {
        setStops([]);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      showAlert("Failed to query target route path coordinates database metrics.", "error");
    } finally {
      setLoadingStops(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  useEffect(() => {
    if (selectedRouteId) {
      fetchStops(selectedRouteId);
    }
  }, [selectedRouteId]);

  // Handle Create and Update Layout State Submissions
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const isCreate = modalType === "create";
      const url = isCreate
        ? "http://localhost:5000/api/route-stops"
        : `http://localhost:5000/api/route-stops/${formData.stop_id}`;

      const response = await fetch(url, {
        method: isCreate ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, route_id: selectedRouteId }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showAlert(
          isCreate ? "Stop checkpoint configuration successfully mapped!" : "Spatial parameters updated successfully!",
          "success"
        );
        setIsModalOpen(false);
        fetchStops(selectedRouteId);
      } else {
        showAlert("Configuration Error: " + (result.error || "Unable to parse stop entry values."), "error");
      }
    } catch (error) {
      showAlert("Submission Query Error: " + error.message, "error");
    }
  };

  // Handle Drop Action Mutation Request
  const handleDeleteClick = async (stopId) => {
    if (window.confirm("Are you sure you want to drop this stop checkpoint configuration from route?")) {
      try {
        const response = await fetch(`http://localhost:5000/api/route-stops/${stopId}`, { method: "DELETE" });
        const data = await response.json();
        if (response.ok && data.success) {
          showAlert("Route checkpoint entry purged from system clusters.", "success");
          fetchStops(selectedRouteId);
        } else {
          showAlert("Unable to request stop destruction logic flow.", "error");
        }
      } catch (error) {
        showAlert("Mutation Error: " + error.message, "error");
      }
    }
  };

  // Safe client-side spatial search filter engine
  const filteredStops = Array.isArray(stops)
    ? stops.filter((stop) => stop.stop_name && stop.stop_name.toLowerCase().includes(search.toLowerCase()))
    : [];

  const openModal = (type, stop = null) => {
    setModalType(type);
    if (stop) {
      setFormData({
        stop_id: stop.stop_id,
        stop_sequence: stop.stop_sequence,
        stop_name: stop.stop_name,
        latitude: stop.latitude,
        longitude: stop.longitude,
        distance_from_start: stop.distance_from_start,
        estimated_arrival_time: stop.estimated_arrival_time || "",
      });
    } else {
      setFormData({
        stop_id: null,
        stop_sequence: "",
        stop_name: "",
        latitude: "",
        longitude: "",
        distance_from_start: "",
        estimated_arrival_time: "",
      });
    }
    setIsModalOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white overflow-x-hidden relative">
      
      {/* 🔔 Premium Responsive Notification Layer */}
      {alertConfig.isOpen && (
        <div className="fixed top-5 right-5 z-[100] max-w-sm w-[90%] sm:w-full bg-neutral-900 border rounded-xl shadow-2xl p-4 animate-fade-in-down transition-all duration-300 flex items-start gap-3 border-neutral-800">
          <div className="mt-0.5">
            {alertConfig.type === "success" ? (
              <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
              </div>
            ) : (
              <div className="p-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold capitalize text-white tracking-wide">
              {alertConfig.type === "success" ? "Mapping Success" : "Telemetry Alert"}
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">{alertConfig.message}</p>
          </div>
          <button onClick={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} className="text-neutral-500 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      <Sidebar isOpen={isSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} onLogout={() => window.location.href = "/"} />
        
        {/* Main Fluid Content Layout Space */}
        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
          
          {/* Header Action Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-wide">Route Stop Checkpoints</h1>
              <p className="text-sm text-neutral-400">
                Currently modifying spatial layout constraints for:{" "}
                <span className="text-amber-400 font-semibold font-mono">
                  {routes.find((r) => r.route_id === selectedRouteId)?.route_name || "No Track Route Target Selected"}
                </span>
              </p>
            </div>
            <button 
              onClick={() => openModal("create")}
              disabled={!selectedRouteId}
              className="bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold px-5 py-2.5 rounded-lg text-sm shadow-md tracking-wide hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + Append New Stop Point
            </button>
          </div>

          {/* Unified Form / Filter Control Cluster Layer */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* SUB-GRID SYSTEM LEFT: ROUTE LINE SELECTOR SIDEBAR TRACK */}
            <div className="md:col-span-4 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-neutral-800/80 bg-neutral-950/40">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500">Active Sequences Catalog</h3>
              </div>
              <div className="p-3 space-y-1.5 max-h-[520px] overflow-y-auto">
                {loadingRoutes ? (
                  <div className="text-center py-6 text-xs text-neutral-500 animate-pulse font-mono">Querying data registry...</div>
                ) : routes.length === 0 ? (
                  <div className="text-center py-6 text-xs text-neutral-500 tracking-wide">No lines registered inside system.</div>
                ) : (
                  routes.map((routeItem) => {
                    const isActive = routeItem.route_id === selectedRouteId;
                    return (
                      <button
                        key={routeItem.route_id}
                        onClick={() => setSelectedRouteId(routeItem.route_id)}
                        className={`w-full text-left p-3 rounded-lg text-xs transition-all flex items-center justify-between font-medium group ${
                          isActive
                            ? "bg-amber-500 text-neutral-950 font-bold shadow-md"
                            : "bg-neutral-950/40 hover:bg-neutral-800/60 text-neutral-400 border border-neutral-800/60"
                        }`}
                      >
                        <span className="truncate pr-2 tracking-wide">{routeItem.route_name}</span>
                        <span className={`font-mono text-[10px] px-2 py-0.5 rounded border transition-colors ${
                          isActive ? "bg-neutral-950 text-amber-400 border-neutral-950/30" : "bg-neutral-900 text-neutral-500 border-neutral-800"
                        }`}>
                          {routeItem.route_code}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* SUB-GRID SYSTEM RIGHT: STOPS REGISTRIES LOGS DATAGRID */}
            <div className="md:col-span-8 space-y-4">
              
              {/* Context Filtering Matrix Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-900 p-4 rounded-xl border border-neutral-800">
                <input 
                  type="text" 
                  placeholder="Filter active row nodes by terminal tag name parameters..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none text-sm placeholder-neutral-600" 
                />
                <div className="text-xs text-neutral-500 flex items-center justify-end font-mono">
                  Loaded Elements: {filteredStops.length} checkpoints
                </div>
              </div>

              {/* Primary Data Matrix Core Layout Box */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
                {loadingStops ? (
                  <div className="p-12 text-center text-xs text-neutral-500 animate-pulse font-mono">Parsing telemetry node clusters...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-neutral-950 text-amber-500 text-xs font-semibold uppercase border-b border-neutral-800 tracking-wider">
                          <th className="p-4 w-16">Seq</th>
                          <th className="p-4">Terminal Name</th>
                          <th className="p-4">GIS Coordinates</th>
                          <th className="p-4">Span Metrics</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/50 text-sm">
                        {filteredStops.map((stop) => (
                          <tr key={stop.stop_id} className="hover:bg-neutral-850/30 transition-colors">
                            <td className="p-4">
                              <span className="inline-flex justify-center items-center font-mono font-bold bg-neutral-950 border border-neutral-800 text-amber-400 rounded-md w-7 h-7 text-xs">
                                {stop.stop_sequence}
                              </span>
                            </td>
                            <td className="p-4 font-medium text-white tracking-wide">{stop.stop_name}</td>
                            <td className="p-4 text-xs font-mono text-neutral-500">
                              {stop.latitude ? Number(stop.latitude).toFixed(4) : "0.0000"}, {stop.longitude ? Number(stop.longitude).toFixed(4) : "0.0000"}
                            </td>
                            <td className="p-4 text-neutral-300 font-medium">
                              <span className="text-neutral-100 font-mono">{stop.distance_from_start} km</span>
                              <span className="text-neutral-700 mx-1.5">|</span>
                              <span className="text-emerald-500 font-mono">+{stop.estimated_arrival_time || 0} mins</span>
                            </td>
                            <td className="p-4 text-right space-x-2 whitespace-nowrap">
                              <button onClick={() => openModal("view", stop)} className="text-xs text-neutral-400 hover:text-white px-2 py-1 rounded bg-neutral-950 border border-neutral-800 transition-colors">View GIS</button>
                              <button onClick={() => openModal("edit", stop)} className="text-xs text-amber-500 hover:text-amber-400 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 transition-colors">Edit</button>
                              <button onClick={() => handleDeleteClick(stop.stop_id)} className="text-xs text-rose-500 hover:text-rose-400 px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20 transition-colors">Drop</button>
                            </td>
                          </tr>
                        ))}
                        {filteredStops.length === 0 && (
                          <tr>
                            <td colSpan="5" className="p-8 text-center text-neutral-500 tracking-wide">
                              No spatial parameters or checkpoint components loaded for this layout track.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Structural Data Mutation Canvas Modal Box PopUp */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-5 capitalize tracking-wide border-b border-neutral-800 pb-3">
              {modalType} Checkpoint Metrics
            </h2>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Sequence Order</label>
                  <input type="number" disabled={modalType === "view"} required placeholder="e.g. 1" value={formData.stop_sequence} onChange={(e) => setFormData({...formData, stop_sequence: e.target.value})} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white disabled:opacity-50 focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Stop Terminal Designation Name</label>
                  <input type="text" disabled={modalType === "view"} required placeholder="e.g. Pettah Central Depot" value={formData.stop_name} onChange={(e) => setFormData({...formData, stop_name: e.target.value})} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white disabled:opacity-50 focus:ring-1 focus:ring-amber-500 focus:outline-none placeholder-neutral-700" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">GPS Latitude Coordinate</label>
                  <input type="number" step="0.000001" disabled={modalType === "view"} required placeholder="6.9271" value={formData.latitude} onChange={(e) => setFormData({...formData, latitude: e.target.value})} className="w-full px-4 py-2 text-sm font-mono bg-neutral-950 border border-neutral-800 rounded-lg text-white disabled:opacity-50 focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">GPS Longitude Coordinate</label>
                  <input type="number" step="0.000001" disabled={modalType === "view"} required placeholder="79.8612" value={formData.longitude} onChange={(e) => setFormData({...formData, longitude: e.target.value})} className="w-full px-4 py-2 text-sm font-mono bg-neutral-950 border border-neutral-800 rounded-lg text-white disabled:opacity-50 focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Span Distance Offset (km)</label>
                  <input type="number" step="0.01" disabled={modalType === "view"} required placeholder="e.g. 14.50" value={formData.distance_from_start} onChange={(e) => setFormData({...formData, distance_from_start: e.target.value})} className="w-full px-4 py-2 text-sm font-mono bg-neutral-950 border border-neutral-800 rounded-lg text-white disabled:opacity-50 focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Est Travel Duration (mins)</label>
                  <input type="number" disabled={modalType === "view"} placeholder="e.g. 45" value={formData.estimated_arrival_time} onChange={(e) => setFormData({...formData, estimated_arrival_time: e.target.value})} className="w-full px-4 py-2 text-sm font-mono bg-neutral-950 border border-neutral-800 rounded-lg text-white disabled:opacity-50 focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-lg hover:text-white transition-colors">Dismiss</button>
                {modalType !== "view" && <button type="submit" className="bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold px-5 py-2 rounded-lg text-sm shadow-md hover:opacity-90 transition-opacity">Save Metrics Layout</button>}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}