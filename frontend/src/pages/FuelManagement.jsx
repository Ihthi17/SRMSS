import { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const BASE = "http://localhost:5000/api";

const FUEL_TYPES = ["Diesel", "Petrol", "CNG", "Electric", "Hybrid"];

const emptyForm = {
  vehicle_id: "",
  trip_id: "",
  fuel_quantity: "",
  fuel_cost: "",
  fuel_type: "Diesel",
  fuel_date: "",
  fuel_time: "",
  odometer_reading: "",
};

export default function FuelManagement() {
  const [records, setRecords]       = useState([]);
  const [vehicles, setVehicles]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [alertMessage, setAlertMessage]   = useState(null);

  // Filters
  const [filterVehicle, setFilterVehicle]   = useState("");
  const [filterType, setFilterType]         = useState("");
  const [filterStart, setFilterStart]       = useState("");
  const [filterEnd, setFilterEnd]           = useState("");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId]     = useState(null);
  const [formData, setFormData]       = useState(emptyForm);

  useEffect(() => {
    fetchVehicles();
    fetchRecords();
  }, []);

  const showAlert = (text, type = "success") => {
    setAlertMessage({ text, type });
    setTimeout(() => setAlertMessage(null), 4000);
  };

  const fetchVehicles = async () => {
    try {
      const res = await axios.get(`${BASE}/buses`);
      if (Array.isArray(res.data)) setVehicles(res.data);
    } catch { /* silent */ }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterVehicle) params.vehicle_id  = filterVehicle;
      if (filterType)    params.fuel_type   = filterType;
      if (filterStart)   params.start_date  = filterStart;
      if (filterEnd)     params.end_date    = filterEnd;
      const res = await axios.get(`${BASE}/fuel`, { params });
      if (Array.isArray(res.data)) setRecords(res.data);
    } catch {
      showAlert("Failed to load fuel records.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const handleEditClick = (rec) => {
    setEditingId(rec.fuel_id);
    setFormData({
      vehicle_id:       rec.vehicle_id,
      trip_id:          rec.trip_id || "",
      fuel_quantity:    rec.fuel_quantity,
      fuel_cost:        rec.fuel_cost,
      fuel_type:        rec.fuel_type,
      fuel_date:        rec.fuel_date ? rec.fuel_date.split("T")[0] : "",
      fuel_time:        rec.fuel_time || "",
      odometer_reading: rec.odometer_reading,
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm("Delete this fuel record?")) return;
    try {
      await axios.delete(`${BASE}/fuel/${id}`);
      showAlert("Fuel record deleted successfully.");
      fetchRecords();
    } catch {
      showAlert("Failed to delete fuel record.", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      trip_id: formData.trip_id || null,
      fuel_quantity:    parseFloat(formData.fuel_quantity),
      fuel_cost:        parseFloat(formData.fuel_cost),
      odometer_reading: parseFloat(formData.odometer_reading),
    };
    try {
      if (editingId) {
        await axios.put(`${BASE}/fuel/${editingId}`, payload);
        showAlert("Fuel record updated successfully.");
      } else {
        await axios.post(`${BASE}/fuel`, payload);
        showAlert("Fuel record created successfully.");
      }
      setIsModalOpen(false);
      fetchRecords();
    } catch (err) {
      showAlert(err.response?.data?.message || "Operation failed.", "error");
    }
  };

  // Summary cards
  const totalQty  = records.reduce((s, r) => s + parseFloat(r.fuel_quantity || 0), 0).toFixed(2);
  const totalCost = records.reduce((s, r) => s + parseFloat(r.fuel_cost || 0), 0).toFixed(2);
  const avgEff    = (() => {
    const valid = records.filter(r => r.fuel_efficiency != null);
    if (!valid.length) return "N/A";
    return (valid.reduce((s, r) => s + parseFloat(r.fuel_efficiency), 0) / valid.length).toFixed(2);
  })();

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white overflow-x-hidden font-sans">
      <Sidebar isOpen={isSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onLogout={() => { localStorage.removeItem("token"); window.location.href = "/"; }}
        />

        {/* Alert Banner */}
        {alertMessage && (
          <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold tracking-wide shadow-2xl transition-all duration-300 ${
            alertMessage.type === "error"
              ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          }`}>
            <span className={`w-2 h-2 rounded-full ${alertMessage.type === "error" ? "bg-rose-500" : "bg-emerald-500"}`} />
            {alertMessage.text}
          </div>
        )}

        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-wide text-white">Fuel Management</h1>
              <p className="text-sm text-neutral-400">Track fuel consumption, costs, and efficiency per vehicle</p>
            </div>
            <button
              onClick={handleAddClick}
              className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-semibold px-4 py-2.5 rounded-lg text-sm transition-all shadow-md active:scale-[0.98]"
            >
              + Log Fuel Record
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total Fuel (L/units)", value: totalQty },
              { label: "Total Cost (LKR)",     value: `${totalCost}` },
              { label: "Avg Efficiency (km/L)", value: avgEff },
            ].map(card => (
              <div key={card.label} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                <div className="text-xs text-amber-500 font-semibold uppercase tracking-wider mb-1">{card.label}</div>
                <div className="text-2xl font-bold text-white font-mono">{card.value}</div>
              </div>
            ))}
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-neutral-900 p-4 border border-neutral-800 rounded-xl">
            <div>
              <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Vehicle</label>
              <select
                value={filterVehicle}
                onChange={e => setFilterVehicle(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50"
              >
                <option value="">All Vehicles</option>
                {vehicles.map(v => (
                  <option key={v.vehicle_id} value={v.vehicle_id}>
                    {v.registration_number || `Vehicle #${v.vehicle_id}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Fuel Type</label>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50"
              >
                <option value="">All Types</option>
                {FUEL_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">From Date</label>
              <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">To Date</label>
              <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50" />
            </div>
            <div className="md:col-span-4 flex gap-3 pt-1">
              <button onClick={fetchRecords}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 rounded-lg text-xs font-bold tracking-wide">
                Apply Filters
              </button>
              <button onClick={() => { setFilterVehicle(""); setFilterType(""); setFilterStart(""); setFilterEnd(""); }}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold">
                Clear
              </button>
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-950/60 border-b border-neutral-800 text-xs font-semibold text-amber-500 uppercase tracking-wider">
                    <th className="px-4 py-4">Vehicle</th>
                    <th className="px-4 py-4">Fuel Type</th>
                    <th className="px-4 py-4">Qty (L)</th>
                    <th className="px-4 py-4">Cost (LKR)</th>
                    <th className="px-4 py-4">Efficiency</th>
                    <th className="px-4 py-4">Odometer</th>
                    <th className="px-4 py-4">Date / Time</th>
                    <th className="px-4 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50 text-sm text-neutral-300">
                  {loading ? (
                    <tr><td colSpan="8" className="text-center py-12 font-mono text-neutral-500 animate-pulse">Loading fuel records...</td></tr>
                  ) : records.length === 0 ? (
                    <tr><td colSpan="8" className="text-center py-12 font-mono text-neutral-500">No fuel records found.</td></tr>
                  ) : records.map(rec => (
                    <tr key={rec.fuel_id} className="hover:bg-neutral-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-white font-semibold">
                        {rec.registration_number || `#${rec.vehicle_id}`}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {rec.fuel_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{parseFloat(rec.fuel_quantity).toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{parseFloat(rec.fuel_cost).toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-emerald-400">
                        {rec.fuel_efficiency != null ? `${parseFloat(rec.fuel_efficiency).toFixed(2)} km/L` : <span className="text-neutral-500">N/A</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{parseFloat(rec.odometer_reading).toFixed(0)} km</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <div>{rec.fuel_date ? rec.fuel_date.split("T")[0] : "—"}</div>
                        <div className="text-neutral-500">{rec.fuel_time || "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-center space-x-3 whitespace-nowrap">
                        <button onClick={() => handleEditClick(rec)}
                          className="text-amber-500 hover:text-amber-400 font-semibold text-xs tracking-wider uppercase transition-colors">
                          Edit
                        </button>
                        <button onClick={() => handleDeleteClick(rec.fuel_id)}
                          className="text-neutral-500 hover:text-rose-400 font-semibold text-xs tracking-wider uppercase transition-colors">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-bold text-white mb-4 tracking-wide border-b border-neutral-800 pb-3">
              {editingId ? "✏️ Edit Fuel Record" : "⛽ Log New Fuel Record"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">Vehicle *</label>
                  <select required value={formData.vehicle_id}
                    onChange={e => setFormData({ ...formData, vehicle_id: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50">
                    <option value="">Select Vehicle</option>
                    {vehicles.map(v => (
                      <option key={v.vehicle_id} value={v.vehicle_id}>
                        {v.registration_number || `Vehicle #${v.vehicle_id}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">Fuel Type *</label>
                  <select required value={formData.fuel_type}
                    onChange={e => setFormData({ ...formData, fuel_type: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50">
                    {FUEL_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">Fuel Quantity (L) *</label>
                  <input required type="number" step="0.01" min="0.01"
                    value={formData.fuel_quantity}
                    onChange={e => setFormData({ ...formData, fuel_quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 font-mono" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">Fuel Cost (LKR) *</label>
                  <input required type="number" step="0.01" min="0"
                    value={formData.fuel_cost}
                    onChange={e => setFormData({ ...formData, fuel_cost: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 font-mono" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">Fuel Date *</label>
                  <input required type="date" value={formData.fuel_date}
                    onChange={e => setFormData({ ...formData, fuel_date: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 font-mono" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">Fuel Time *</label>
                  <input required type="time" value={formData.fuel_time}
                    onChange={e => setFormData({ ...formData, fuel_time: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 font-mono" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">Odometer Reading (km) *</label>
                  <input required type="number" step="0.01" min="0"
                    value={formData.odometer_reading}
                    onChange={e => setFormData({ ...formData, odometer_reading: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 font-mono" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">Trip ID (optional)</label>
                  <input type="number" min="1" value={formData.trip_id}
                    onChange={e => setFormData({ ...formData, trip_id: e.target.value })}
                    placeholder="Leave blank if N/A"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 font-mono" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm font-semibold transition-colors">
                  Cancel
                </button>
                <button type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold rounded-lg text-sm transition-all shadow-md">
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
