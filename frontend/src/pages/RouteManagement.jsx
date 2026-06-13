import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";


const RouteManagement = () => {
  const [routes, setRoutes] = useState([]);
  const [depots, setDepots] = useState([]);
  const [allocationPool, setAllocationPool] = useState({ buses: [], drivers: [] });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [formData, setFormData] = useState({
    depot_id: "",
    route_code: "",
    route_name: "",
    start_location: "",
    end_location: "",
    total_distance: "",
    total_stops: "",
    estimated_duration: "",
    default_bus_id: "",
    default_driver_id: "",
    is_active: 1
  });

  useEffect(() => {
    fetchDashboardMatrix();
  }, []);

  const fetchDashboardMatrix = async () => {
    try {
      setLoading(true);
      // 1. Fetch Routes System Record Table
      const routesRes = await fetch("http://localhost:5000/api/routes");
      const routesData = await routesRes.json();
      setRoutes(Array.isArray(routesData) ? routesData : []);

      // 2. Fetch Base Depots for Core Configuration Dropdown
      const depotsRes = await fetch("http://localhost:5000/api/depots");
      const depotsData = await depotsRes.json();
      setDepots(Array.isArray(depotsData) ? depotsData : []);

      // 3. Fetch Unified Asset Allocation Pools (Buses and Drivers)
      const allocationRes = await fetch("http://localhost:5000/api/routes/allocation-pool");
      const allocationData = await allocationRes.json();
      setAllocationPool(allocationData || { buses: [], drivers: [] });
    } catch (error) {
      console.error("Data synchronization pipeline broke:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Cascade-reset default allocations if the user shifts the operational terminal depot context
      ...(name === "depot_id" && { default_bus_id: "", default_driver_id: "" })
    }));
  };

  const openCreateModal = () => {
    setEditingRoute(null);
    setFormData({
      depot_id: "",
      route_code: "",
      route_name: "",
      start_location: "",
      end_location: "",
      total_distance: "",
      total_stops: "",
      estimated_duration: "",
      default_bus_id: "",
      default_driver_id: "",
      is_active: 1
    });
    setShowModal(true);
  };

  const openEditModal = (route) => {
    setEditingRoute(route);
    setFormData({
      depot_id: route.depot_id || "",
      route_code: route.route_code || "",
      route_name: route.route_name || "",
      start_location: route.start_location || "",
      end_location: route.end_location || "",
      total_distance: route.total_distance || "",
      total_stops: route.total_stops || "",
      estimated_duration: route.estimated_duration || "",
      default_bus_id: route.default_bus_id || "",
      default_driver_id: route.default_driver_id || "",
      is_active: route.is_active !== undefined ? route.is_active : 1
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editingRoute 
      ? `http://localhost:5000/api/routes/${editingRoute.route_id}`
      : "http://localhost:5000/api/routes";
    const method = editingRoute ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowModal(false);
        fetchDashboardMatrix();
      } else {
        alert("Server validation error applying route configuration updates.");
      }
    } catch (error) {
      console.error("Failed to commit route structural log form entry:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to completely purge this route log configuration profile?")) {
      try {
        const response = await fetch(`http://localhost:5000/api/routes/${id}`, {
          method: "DELETE",
        });
        if (response.ok) fetchDashboardMatrix();
      } catch (error) {
        console.error("Purge channel pipeline execution error:", error);
      }
    }
  };

  // Cross-reference filters: Display assets mapped specifically to the active form depot
  const activeBuses = allocationPool.buses.filter(
    (bus) => !formData.depot_id || Number(bus.depot_id) === Number(formData.depot_id)
  );

  const activeDrivers = allocationPool.drivers.filter(
    (driver) => !formData.depot_id || Number(driver.depot_id) === Number(formData.depot_id)
  );

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white overflow-x-hidden relative">
      <Sidebar isOpen={isSidebarOpen} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} onLogout={() => window.location.href = "/"} />
        
        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-wide">Route Log Configurations</h1>
              <p className="text-sm text-neutral-400">Map operational travel spans, specify total halts, and assign default standby transit rosters</p>
            </div>
            <button onClick={openCreateModal} className="bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold px-5 py-2.5 rounded-lg text-sm tracking-wide shadow-md hover:opacity-90 transition-opacity whitespace-nowrap">
              + Establish Route Track
            </button>
          </div>

          {loading ? (
            <div className="text-center text-neutral-500 font-medium py-10 tracking-widest font-mono animate-pulse">
              LOADING OPERATIONAL ROUTE CONFIGURATIONS...
            </div>
          ) : (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse table-auto min-w-[1000px]">
                  <thead>
                    <tr className="bg-neutral-950 text-amber-500 text-xs font-semibold uppercase border-b border-neutral-800 tracking-wider">
                      <th className="p-4">Code</th>
                      <th className="p-4">Route Name Descriptions</th>
                      <th className="p-4">Terminal Depot Base</th>
                      <th className="p-4">Travel Span / Sector</th>
                      <th className="p-4 text-center">Distance</th>
                      <th className="p-4 text-center">Duration</th>
                      <th className="p-4">Assigned Bus Unit</th>
                      <th className="p-4">Assigned Pilot (Driver)</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/50 text-sm">
                    {routes.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center p-8 text-neutral-500">
                          No transit routes tracked inside current network parameters.
                        </td>
                      </tr>
                    ) : (
                      routes.map((route) => (
                        <tr key={route.route_id} className="hover:bg-neutral-850/30 transition-colors">
                          <td className="p-4 font-mono text-xs font-bold text-amber-400">#{route.route_code}</td>
                          <td className="p-4 font-semibold text-white">{route.route_name}</td>
                          <td className="p-4 text-neutral-300">{route.depot_name || "Unassigned Terminus"}</td>
                          <td className="p-4 text-xs text-neutral-400">
                            <span className="text-white">{route.start_location}</span> → <span className="text-white">{route.end_location}</span>
                          </td>
                          <td className="p-4 text-center font-mono text-neutral-200">{route.total_distance} km</td>
                          <td className="p-4 text-center text-xs text-neutral-300">{route.estimated_duration} mins</td>
                          <td className="p-4 text-xs">
                            {route.bus_code ? (
                              <div className="font-mono text-amber-400 font-semibold">{route.bus_code} <span className="text-neutral-500 text-[11px]">({route.registration_number})</span></div>
                            ) : (
                              <span className="text-neutral-600 italic text-xs">Unallocated</span>
                            )}
                          </td>
                          <td className="p-4 text-xs text-neutral-300">
                            {route.first_name ? `${route.first_name} ${route.last_name}` : <span className="text-neutral-600 italic text-xs">Standby Queue</span>}
                          </td>
                          <td className="p-4 text-right space-x-2 whitespace-nowrap">
                            <button onClick={() => openEditModal(route)} className="text-xs text-amber-500 hover:text-amber-400 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 transition-colors">Modify</button>
                            <button onClick={() => handleDelete(route.route_id)} className="text-xs bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-medium px-2.5 py-1 rounded transition-colors">Purge</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Unified Form Inputs Entry Dialog Frame */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative shadow-2xl my-auto max-h-[95vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-5 tracking-wide border-b border-neutral-800 pb-3">
              {editingRoute ? `Edit Route Framework Parameter: [${formData.route_code}]` : "Register Operational Network Route Line"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Assigned Depot Base Location *</label>
                  <select name="depot_id" required value={formData.depot_id} onChange={handleInputChange} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none">
                    <option value="">-- Select Master Terminal Target --</option>
                    {depots.map((dep) => (
                      <option key={dep.depot_id} value={dep.depot_id}>{dep.depot_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Route Reference Code *</label>
                  <input type="text" name="route_code" required value={formData.route_code} onChange={handleInputChange} placeholder="e.g. RT-CMB-01" className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Route Label Name *</label>
                  <input type="text" name="route_name" required value={formData.route_name} onChange={handleInputChange} placeholder="e.g. Colombo Express Track" className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Start Origin Location Terminus *</label>
                  <input type="text" name="start_location" required value={formData.start_location} onChange={handleInputChange} placeholder="Origin Hub" className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">End Destination Hub Terminal *</label>
                  <input type="text" name="end_location" required value={formData.end_location} onChange={handleInputChange} placeholder="Destination Hub" className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Total Track Distance (KM)</label>
                  <input type="number" step="0.01" name="total_distance" value={formData.total_distance} onChange={handleInputChange} placeholder="0.00" className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Total Scheduled Halts / Stations</label>
                  <input type="number" name="total_stops" value={formData.total_stops} onChange={handleInputChange} placeholder="0" className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Estimated Transit Duration Span (Minutes)</label>
                  <input type="number" name="estimated_duration" value={formData.estimated_duration} onChange={handleInputChange} placeholder="Minutes" className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>
              </div>

              {/* Dynamic Depot Asset-Allocation Section Node */}
              <div className="p-4 mt-2 bg-neutral-950 border border-neutral-800/80 rounded-xl space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500/90 flex items-center gap-1.5">
                  ⚙️ Standby Fleet Roster Asset Allocation Sync Channels
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bus Select Field */}
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-400 mb-1">Assign Default standby Bus Unit</label>
                    <select name="default_bus_id" value={formData.default_bus_id} disabled={!formData.depot_id} onChange={handleInputChange} className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none">
                      <option value="">-- Standby Queue / Unassigned --</option>
                      {activeBuses.map((bus) => (
                        <option key={bus.bus_id} value={bus.bus_id}>
                          {bus.bus_code} ({bus.registration_number}) - Seating Cap: {bus.capacity}
                        </option>
                      ))}
                    </select>
                    {!formData.depot_id && <p className="text-[10px] text-neutral-600 mt-1 italic">Select a depot location above to unlock matching vehicles inventory pool</p>}
                  </div>

                  {/* Driver Select Field */}
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-400 mb-1">Assign Primary Route Pilot (Driver)</label>
                    <select name="default_driver_id" value={formData.default_driver_id} disabled={!formData.depot_id} onChange={handleInputChange} className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none">
                      <option value="">-- Standby Queue / Unassigned --</option>
                      {activeDrivers.map((driver) => (
                        <option key={driver.driver_id} value={driver.driver_id}>
                          {driver.first_name} {driver.last_name} ({driver.license_number})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-lg hover:text-white transition-colors">Close</button>
                <button type="submit" className="bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold px-5 py-2 rounded-lg text-sm shadow-md hover:opacity-90 transition-opacity">Commit Route Configuration</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteManagement;