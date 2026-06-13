import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
// If using react-router-dom:
// import { useSearchParams } from "react-router-dom";

const BusManagement = () => {
  // const [searchParams] = useSearchParams(); // Uncomment if using react-router-dom
  const [buses, setBuses] = useState([]);
  const [depots, setDepots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBus, setEditingBus] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [redirectedBusId, setRedirectedBusId] = useState(null);

  const [formData, setFormData] = useState({
    vehicle_id: "", 
    bus_code: "",
    registration_number: "",
    depot_id: "",
    manufacturer: "",
    model_year: "",
    total_mileage: "",
    capacity: 40,
    service_type: "Normal",
    status: "Available"
  });

  // Fetch initial base tables
  useEffect(() => {
    fetchBusesAndDepots();
  }, []);

  // Catch dynamic search parameter redirects
  useEffect(() => {
    if (!loading && buses.length > 0) {
      // For standard URL parsing:
      const params = new URLSearchParams(window.location.search);
      const targetBusId = params.get("highlightBusId");
      
      // For react-router-dom:
      // const targetBusId = searchParams.get("highlightBusId");

      if (targetBusId) {
        setRedirectedBusId(Number(targetBusId));
        const matchingBus = buses.find(b => Number(b.bus_id) === Number(targetBusId));
        if (matchingBus) {
          // Open modal to view and modify data instantly
          openEditModal(matchingBus);
          
          // Clear query string clean history up
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    }
  }, [loading, buses]);

  const fetchBusesAndDepots = async () => {
    try {
      setLoading(true);
      const busRes = await fetch("http://localhost:5000/api/buses");
      const busData = await busRes.json();
      setBuses(Array.isArray(busData) ? busData : []);

      const depotsRes = await fetch("http://localhost:5000/api/depots");
      const depotsData = await depotsRes.json();
      setDepots(Array.isArray(depotsData) ? depotsData : []);
    } catch (error) {
      console.error("Error connecting to inventory databases:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openCreateModal = () => {
    setEditingBus(null);
    setFormData({
      vehicle_id: "",
      bus_code: "",
      registration_number: "",
      depot_id: "",
      manufacturer: "",
      model_year: new Date().getFullYear(),
      total_mileage: "0.00",
      capacity: 40,
      service_type: "Normal",
      status: "Available"
    });
    setShowModal(true);
  };

  const openEditModal = (bus) => {
    setEditingBus(bus);
    setFormData({
      vehicle_id: bus.vehicle_id || "",
      bus_code: bus.bus_code || "",
      registration_number: bus.registration_number || "",
      depot_id: bus.depot_id || "",
      manufacturer: bus.manufacturer || "",
      model_year: bus.model_year || "",
      total_mileage: bus.total_mileage || "0.00",
      capacity: bus.capacity || 40,
      service_type: bus.service_type || "Normal",
      status: bus.bus_status || "Available"
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editingBus 
      ? `http://localhost:5000/api/buses/${editingBus.bus_id}`
      : "http://localhost:5000/api/buses";
    const method = editingBus ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowModal(false);
        fetchBusesAndDepots();
      } else {
        alert("An error occurred applying structural asset modifications.");
      }
    } catch (error) {
      console.error("Submission pipeline failure:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to completely remove this bus asset? This will clear its diagnostic indexes as well.")) {
      try {
        const response = await fetch(`http://localhost:5000/api/buses/${id}`, {
          method: "DELETE",
        });
        if (response.ok) fetchBusesAndDepots();
      } catch (error) {
        console.error("Error executing asset deletion sequence:", error);
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white overflow-x-hidden relative">
      <Sidebar isOpen={isSidebarOpen} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          onLogout={() => window.location.href = "/"} 
        />
        
        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-wide">Bus Asset Configuration Manager</h1>
              <p className="text-sm text-neutral-400">Manage seating capacity matrices, operational statuses, and diagnostics logging limits</p>
            </div>
            <button onClick={openCreateModal} className="bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold px-5 py-2.5 rounded-lg text-sm shadow-md tracking-wide hover:opacity-90 transition-opacity whitespace-nowrap">
              + Initialize New Bus
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800">
              <p className="text-xs text-neutral-400 font-bold tracking-wider uppercase">Active Fleet Array</p>
              <p className="text-2xl font-bold text-amber-500 mt-1">{buses.length}</p>
            </div>
            <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800">
              <p className="text-xs text-neutral-400 font-bold tracking-wider uppercase">Buses On-Route</p>
              <p className="text-2xl font-bold text-white mt-1">{buses.filter(b => b.bus_status === "In Service" || b.bus_status === "Assigned").length}</p>
            </div>
            <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800">
              <p className="text-xs text-neutral-400 font-bold tracking-wider uppercase">Available Reserve Pool</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{buses.filter(b => b.bus_status === "Available").length}</p>
            </div>
            <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800">
              <p className="text-xs text-neutral-400 font-bold tracking-wider uppercase">Maintenance Bay</p>
              <p className="text-2xl font-bold text-rose-500 mt-1">{buses.filter(b => b.bus_status === "Maintenance").length}</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center text-neutral-500 font-medium py-10 tracking-widest font-mono animate-pulse">
              SYNCHRONIZING ASSET MATRICES...
            </div>
          ) : (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse table-auto min-w-[1000px]">
                  <thead>
                    <tr className="bg-neutral-950 text-amber-500 text-xs font-semibold uppercase border-b border-neutral-800 tracking-wider">
                      <th className="p-4">Bus Code</th>
                      <th className="p-4">License Plate</th>
                      <th className="p-4">Base Depot</th>
                      <th className="p-4">Make & Manufacturer</th>
                      <th className="p-4 text-center">Capacity</th>
                      <th className="p-4 text-center">Service Tier</th>
                      <th className="p-4 text-center">Logged Mileage</th>
                      <th className="p-4 text-center">Operational Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/50 text-sm">
                    {buses.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center p-8 text-neutral-500 tracking-wide">
                          No passenger bus configurations verified inside current operational matrices.
                        </td>
                      </tr>
                    ) : (
                      buses.map((bus) => (
                        <tr 
                          key={bus.bus_id} 
                          className={`transition-colors ${
                            redirectedBusId === Number(bus.bus_id) 
                              ? "bg-amber-500/10 hover:bg-amber-500/15 border-y border-amber-500/30 animate-pulse" 
                              : "hover:bg-neutral-850/30"
                          }`}
                        >
                          <td className="p-4 font-mono text-xs font-bold text-amber-400">#{bus.bus_code}</td>
                          <td className="p-4 font-semibold text-white uppercase">{bus.registration_number}</td>
                          <td className="p-4 text-neutral-300">{bus.depot_name || <span className="text-neutral-600 text-xs italic">Unassigned Base</span>}</td>
                          <td className="p-4 text-xs text-neutral-400">
                            <span className="text-white font-medium">{bus.manufacturer || "N/A"}</span> ({bus.model_year || "N/A"})
                          </td>
                          <td className="p-4 text-center text-white font-medium">{bus.capacity} Seats</td>
                          <td className="p-4 text-center">
                            <span className="px-2 py-0.5 rounded text-[11px] bg-neutral-950 border border-neutral-800 text-neutral-300 font-mono">
                              {bus.service_type}
                            </span>
                          </td>
                          <td className="p-4 text-center font-mono text-amber-400">{parseFloat(bus.total_mileage).toLocaleString()} km</td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                              bus.bus_status === "Available" ? "bg-emerald-500/5 border border-emerald-500/10 text-emerald-400" :
                              bus.bus_status === "In Service" || bus.bus_status === "Assigned" ? "bg-amber-500/5 border border-amber-500/10 text-amber-400" :
                              "bg-rose-500/5 border border-rose-500/10 text-rose-400"
                            }`}>
                              {bus.bus_status}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-2 whitespace-nowrap">
                            <button onClick={() => openEditModal(bus)} className="text-xs text-amber-500 hover:text-amber-400 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 transition-colors">Modify</button>
                            <button onClick={() => handleDelete(bus.bus_id)} className="text-xs bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-medium px-2.5 py-1 rounded transition-colors">Purge</button>
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

      {/* Form Input Dialog Modal Frame */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-5 tracking-wide border-b border-neutral-800 pb-3">
              {editingBus ? `Edit Fleet Asset Profile: [${formData.bus_code}]` : "Register Commercial Fleet Transport Unit"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Internal Bus Code *</label>
                  <input type="text" name="bus_code" required value={formData.bus_code} onChange={handleInputChange} placeholder="e.g. BUS-COL-401" className="w-full px-4 py-2 text-sm font-mono bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none placeholder-neutral-700" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Registration License Plate *</label>
                  <input type="text" name="registration_number" required value={formData.registration_number} onChange={handleInputChange} placeholder="e.g. WP-NB-4812" className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none placeholder-neutral-700 uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Assigned Base Depot</label>
                  <select name="depot_id" value={formData.depot_id} onChange={handleInputChange} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none">
                    <option value="">-- Choose Target Depot --</option>
                    {depots.map((dep) => (
                      <option key={dep.depot_id} value={dep.depot_id}>{dep.depot_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Manufacturer</label>
                  <input type="text" name="manufacturer" value={formData.manufacturer} onChange={handleInputChange} placeholder="e.g. Tata, Ashok Leyland" className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Model Year</label>
                  <input type="number" name="model_year" value={formData.model_year} onChange={handleInputChange} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Total Mileage (KM)</label>
                  <input type="number" step="0.01" name="total_mileage" value={formData.total_mileage} onChange={handleInputChange} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Seating Capacity</label>
                  <input type="number" name="capacity" value={formData.capacity} onChange={handleInputChange} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Service Tier Type</label>
                  <select name="service_type" value={formData.service_type} onChange={handleInputChange} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none">
                    <option value="Normal">Normal</option>
                    <option value="Semi-Luxury">Semi-Luxury</option>
                    <option value="Luxury">Luxury</option>
                    <option value="Super-Luxury">Super-Luxury</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Operational Fleet Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none">
                    <option value="Available">Available</option>
                    <option value="In Service">In Service</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-lg hover:text-white transition-colors">Close</button>
                <button type="submit" className="bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold px-5 py-2 rounded-lg text-sm shadow-md hover:opacity-90 transition-opacity">Commit Asset Configuration</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusManagement;