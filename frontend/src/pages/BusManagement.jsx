import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

// Vehicle types — Bus gets extra bus-specific fields; others use base vehicle fields only
const VEHICLE_TYPES = ["Bus", "Lorry", "Staff Vehicle", "Van", "Mini Bus", "Other"];
const BUS_TYPES = ["Bus", "Mini Bus"];

const SERVICE_TYPES = ["Normal", "Semi-Luxury", "Luxury", "AC", "Non-AC"];
const STATUSES = ["Available", "Assigned", "In Service", "Maintenance"];

const EMPTY_FORM = {
  vehicle_id: "",
  vehicle_type: "Bus",
  bus_code: "",
  registration_number: "",
  depot_id: "",
  manufacturer: "",
  model_year: new Date().getFullYear(),
  total_mileage: "0.00",
  seating_capacity: "",
  capacity: 40,
  service_type: "Normal",
  status: "Available",
  current_fuel_level: "",
  fuel_tank_capacity: "",
  purchase_date: "",
  next_maintenance_date: "",
};

const BusManagement = () => {
  const [vehicles, setVehicles] = useState([]);
  const [depots, setDepots]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [typeFilter, setTypeFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState(EMPTY_FORM);

  const [alert, setAlert] = useState({ show: false, message: "", type: "success" });
  const showAlert = (message, type = "success") => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert(a => ({ ...a, show: false })), 4000);
  };

  const isBusType = (type) => BUS_TYPES.includes(type);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vRes, dRes] = await Promise.all([
        fetch("http://localhost:5000/api/buses"),
        fetch("http://localhost:5000/api/depots"),
      ]);
      const [vData, dData] = await Promise.all([vRes.json(), dRes.json()]);
      setVehicles(Array.isArray(vData) ? vData : []);
      setDepots(Array.isArray(dData) ? dData : []);
    } catch (err) {
      console.error("Fetch error:", err);
      showAlert("Could not connect to server.", "error");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingVehicle(null);
    setFormData({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const openEditModal = (v) => {
    setEditingVehicle(v);
    setFormData({
      vehicle_id:           v.vehicle_id || "",
      vehicle_type:         v.vehicle_type || "Bus",
      bus_code:             v.bus_code || "",
      registration_number:  v.registration_number || "",
      depot_id:             v.depot_id || "",
      manufacturer:         v.manufacturer || "",
      model_year:           v.model_year || "",
      total_mileage:        v.total_mileage || "0.00",
      seating_capacity:     v.seating_capacity || "",
      capacity:             v.capacity || 40,
      service_type:         v.service_type || "Normal",
      status:               v.status || "Available",
      current_fuel_level:   v.current_fuel_level || "",
      fuel_tank_capacity:   v.fuel_tank_capacity || "",
      purchase_date:        v.purchase_date ? v.purchase_date.split("T")[0] : "",
      next_maintenance_date: v.next_maintenance_date ? v.next_maintenance_date.split("T")[0] : "",
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isEdit = !!editingVehicle;
    // For edit: use bus_id if bus type, else vehicle_id
    const urlId = isEdit
      ? (editingVehicle.bus_id || editingVehicle.vehicle_id)
      : null;
    const url = isEdit
      ? `http://localhost:5000/api/buses/${urlId}`
      : "http://localhost:5000/api/buses";

    try {
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        showAlert(data.message || "Vehicle saved successfully.", "success");
        setShowModal(false);
        fetchData();
      } else {
        showAlert(data.error || "Failed to save vehicle.", "error");
      }
    } catch (err) {
      showAlert("Server error: " + err.message, "error");
    }
  };

  const handleDelete = async (v) => {
    if (!window.confirm(`Remove vehicle "${v.registration_number}"? This cannot be undone.`)) return;
    const id = v.bus_id || v.vehicle_id;
    try {
      const res = await fetch(`http://localhost:5000/api/buses/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) { showAlert(data.message, "success"); fetchData(); }
      else showAlert(data.error || "Delete failed.", "error");
    } catch (err) {
      showAlert("Server error: " + err.message, "error");
    }
  };

  const filtered = vehicles.filter(v => {
    const matchType   = typeFilter === "All" || v.vehicle_type === typeFilter;
    const matchSearch = !searchTerm ||
      (v.registration_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.bus_code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.depot_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.vehicle_type || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchType && matchSearch;
  });

  const typeBadge = (type) => ({
    "Bus":           "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "Mini Bus":      "bg-sky-500/10 text-sky-400 border-sky-500/20",
    "Lorry":         "bg-orange-500/10 text-orange-400 border-orange-500/20",
    "Staff Vehicle": "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "Van":           "bg-teal-500/10 text-teal-400 border-teal-500/20",
    "Other":         "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
  }[type] || "bg-neutral-500/10 text-neutral-400 border-neutral-500/20");

  const statusBadge = (s) => ({
    "Available":   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "In Service":  "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "Assigned":    "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "Maintenance": "bg-rose-500/10 text-rose-400 border-rose-500/20",
  }[s] || "bg-neutral-500/10 text-neutral-400 border-neutral-500/20");

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white overflow-x-hidden">

      {alert.show && (
        <div className={`fixed top-5 right-5 z-[100] max-w-sm bg-neutral-900 border rounded-xl shadow-2xl p-4 flex items-start gap-3 ${alert.type === "success" ? "border-neutral-800" : "border-red-800"}`}>
          <div className={`p-1 rounded-lg ${alert.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
            {alert.type === "success"
              ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
              : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>}
          </div>
          <p className="text-xs text-neutral-300 mt-0.5">{alert.message}</p>
          <button onClick={() => setAlert(a => ({ ...a, show: false }))} className="ml-auto text-neutral-500 hover:text-white">✕</button>
        </div>
      )}

      <Sidebar isOpen={isSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} onLogout={() => window.location.href = "/"} />

        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-wide">Fleet Vehicle Management</h1>
              <p className="text-sm text-neutral-400">Manage all fleet vehicles — buses, lorries, staff vehicles, and more</p>
            </div>
            <button onClick={openCreateModal} className="bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold px-5 py-2.5 rounded-lg text-sm shadow-md hover:opacity-90 transition-opacity">
              + Add Vehicle
            </button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Fleet",    value: vehicles.length,                                          color: "text-white" },
              { label: "Available",      value: vehicles.filter(v => v.status === "Available").length,    color: "text-emerald-400" },
              { label: "In Service",     value: vehicles.filter(v => ["In Service","Assigned"].includes(v.status)).length, color: "text-amber-400" },
              { label: "Maintenance",    value: vehicles.filter(v => v.status === "Maintenance").length,  color: "text-rose-400" },
            ].map(c => (
              <div key={c.label} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">{c.label}</p>
                <p className={`text-2xl font-bold mt-1 font-mono ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
            <input type="text" placeholder="Search by plate, code, depot, type..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="sm:col-span-2 px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none placeholder-neutral-500" />
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-300 focus:outline-none">
              <option value="All">All Types</option>
              {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-neutral-950 text-amber-500 text-xs font-semibold uppercase border-b border-neutral-800 tracking-wider">
                    {["Type","Reg. Plate","Bus Code","Depot","Manufacturer","Seats","Mileage","Status","Actions"].map(h =>
                      <th key={h} className="p-4">{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50 text-sm">
                  {loading ? (
                    <tr><td colSpan="9" className="p-8 text-center text-neutral-500 animate-pulse">Loading vehicles...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan="9" className="p-8 text-center text-neutral-500">No vehicles found.</td></tr>
                  ) : filtered.map(v => (
                    <tr key={v.vehicle_id} className="hover:bg-neutral-800/20 transition-colors">
                      <td className="p-4">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${typeBadge(v.vehicle_type)}`}>
                          {v.vehicle_type || "—"}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-white uppercase">{v.registration_number}</td>
                      <td className="p-4 font-mono text-amber-400 text-xs">{v.bus_code || <span className="text-neutral-600">—</span>}</td>
                      <td className="p-4 text-neutral-300">{v.depot_name || <span className="text-neutral-600 italic text-xs">Unassigned</span>}</td>
                      <td className="p-4 text-neutral-400 text-xs">{v.manufacturer ? `${v.manufacturer} (${v.model_year || "—"})` : "—"}</td>
                      <td className="p-4 text-center font-mono">{v.seating_capacity || v.capacity || "—"}</td>
                      <td className="p-4 text-center font-mono text-amber-400">
                        {v.total_mileage != null ? parseFloat(v.total_mileage).toLocaleString() + " km" : "—"}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${statusBadge(v.status)}`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        <button onClick={() => openEditModal(v)} className="text-xs text-amber-500 hover:text-amber-400 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">Edit</button>
                        <button onClick={() => handleDelete(v)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-500/10 border border-red-500/20">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-5 border-b border-neutral-800 pb-3 tracking-wide">
              {editingVehicle ? `Edit Vehicle — ${formData.registration_number}` : "Register New Vehicle"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Vehicle Type */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Vehicle Type *</label>
                  <div className="flex flex-wrap gap-2">
                    {VEHICLE_TYPES.map(t => (
                      <button key={t} type="button"
                        onClick={() => setFormData(p => ({ ...p, vehicle_type: t }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          formData.vehicle_type === t
                            ? "bg-amber-500 text-neutral-950 border-amber-500"
                            : "bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-600"
                        }`}>{t}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Registration Plate *</label>
                  <input type="text" name="registration_number" required value={formData.registration_number}
                    onChange={handleChange} placeholder="e.g. WP-NB-4812"
                    className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white uppercase focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Assigned Depot</label>
                  <select name="depot_id" value={formData.depot_id} onChange={handleChange}
                    className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none">
                    <option value="">— No Depot —</option>
                    {depots.map(d => <option key={d.depot_id} value={d.depot_id}>{d.depot_name}</option>)}
                  </select>
                </div>

                {/* Bus-specific fields */}
                {isBusType(formData.vehicle_type) && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Bus Code *</label>
                      <input type="text" name="bus_code" required={isBusType(formData.vehicle_type)}
                        value={formData.bus_code} onChange={handleChange} placeholder="e.g. BUS-COL-401"
                        className="w-full px-4 py-2 text-sm font-mono bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Service Type</label>
                      <select name="service_type" value={formData.service_type} onChange={handleChange}
                        className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none">
                        {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Manufacturer</label>
                  <input type="text" name="manufacturer" value={formData.manufacturer} onChange={handleChange}
                    placeholder="e.g. Tata, Toyota"
                    className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Model Year</label>
                  <input type="number" name="model_year" value={formData.model_year} onChange={handleChange}
                    className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Seating Capacity</label>
                  <input type="number" name="seating_capacity" value={formData.seating_capacity} onChange={handleChange}
                    placeholder="e.g. 40"
                    className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Total Mileage (km)</label>
                  <input type="number" step="0.01" name="total_mileage" value={formData.total_mileage} onChange={handleChange}
                    className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Fuel Level (L)</label>
                  <input type="number" step="0.1" name="current_fuel_level" value={formData.current_fuel_level} onChange={handleChange}
                    className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Tank Capacity (L)</label>
                  <input type="number" step="0.1" name="fuel_tank_capacity" value={formData.fuel_tank_capacity} onChange={handleChange}
                    className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Purchase Date</label>
                  <input type="date" name="purchase_date" value={formData.purchase_date} onChange={handleChange}
                    className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Next Maintenance Date</label>
                  <input type="date" name="next_maintenance_date" value={formData.next_maintenance_date} onChange={handleChange}
                    className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Status</label>
                  <select name="status" value={formData.status} onChange={handleChange}
                    className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-lg hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit"
                  className="bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold px-5 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity">
                  {editingVehicle ? "Update Vehicle" : "Register Vehicle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusManagement;
