import { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const BASE = "http://localhost:5000/api";

const MAINTENANCE_TYPES = [
  "Routine", "Oil Change", "Tire Replacement", "Brake Service",
  "Engine Repair", "Electrical", "Suspension", "Other"
];
const STATUSES = ["Scheduled", "In Progress", "Completed"];

// Status workflow: what next states are available from current
const NEXT_STATUSES = {
  "Scheduled":   ["Scheduled", "In Progress", "Completed"],
  "In Progress": ["In Progress", "Completed"],
  "Completed":   ["Completed"]
};

const STATUS_COLORS = {
  "Scheduled":   "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  "In Progress": "bg-sky-500/10 text-sky-400 border-sky-500/20",
  "Completed":   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const emptyForm = {
  vehicle_id: "",
  maintenance_type: "Routine",
  maintenance_date: "",
  maintenance_time: "",
  description: "",
  cost: "",
  performed_by: "",
  maintenance_status: "Scheduled",
  next_maintenance_date: "",
};

export default function MaintenanceManagement() {
  const [records, setRecords]             = useState([]);
  const [vehicles, setVehicles]           = useState([]);
  const [loading, setLoading]             = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [alertMessage, setAlertMessage]   = useState(null);

  // Filters
  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterStatus, setFilterStatus]   = useState("");
  const [filterType, setFilterType]       = useState("");
  const [filterStart, setFilterStart]     = useState("");
  const [filterEnd, setFilterEnd]         = useState("");

  // Modal
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [editingId, setEditingId]       = useState(null);
  const [currentStatus, setCurrentStatus] = useState("Scheduled"); // tracks status of editing record
  const [formData, setFormData]         = useState(emptyForm);

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
      if (filterVehicle) params.vehicle_id         = filterVehicle;
      if (filterStatus)  params.maintenance_status = filterStatus;
      if (filterType)    params.maintenance_type   = filterType;
      if (filterStart)   params.start_date         = filterStart;
      if (filterEnd)     params.end_date           = filterEnd;
      const res = await axios.get(`${BASE}/maintenance`, { params });
      if (Array.isArray(res.data)) setRecords(res.data);
    } catch {
      showAlert("Failed to load maintenance records.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    setEditingId(null);
    setCurrentStatus("Scheduled");
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const handleEditClick = (rec) => {
    setEditingId(rec.maintenance_id);
    setCurrentStatus(rec.maintenance_status);
    setFormData({
      vehicle_id:            rec.vehicle_id,
      maintenance_type:      rec.maintenance_type,
      maintenance_date:      rec.maintenance_date ? rec.maintenance_date.split("T")[0] : "",
      maintenance_time:      rec.maintenance_time || "",
      description:           rec.description || "",
      cost:                  rec.cost,
      performed_by:          rec.performed_by || "",
      maintenance_status:    rec.maintenance_status,
      next_maintenance_date: rec.next_maintenance_date ? rec.next_maintenance_date.split("T")[0] : "",
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm("Delete this maintenance record? Related alerts will also be removed.")) return;
    try {
      await axios.delete(`${BASE}/maintenance/${id}`);
      showAlert("Maintenance record deleted successfully.");
      fetchRecords();
    } catch {
      showAlert("Failed to delete maintenance record.", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.maintenance_status === "Completed" && !formData.next_maintenance_date) {
      showAlert("next_maintenance_date is required when status is Completed.", "error");
      return;
    }
    const payload = {
      ...formData,
      cost: parseFloat(formData.cost),
      next_maintenance_date: formData.next_maintenance_date || null,
    };
    try {
      if (editingId) {
        await axios.put(`${BASE}/maintenance/${editingId}`, payload);
        showAlert("Maintenance record updated successfully.");
      } else {
        await axios.post(`${BASE}/maintenance`, payload);
        showAlert("Maintenance record created successfully.");
      }
      setIsModalOpen(false);
      fetchRecords();
    } catch (err) {
      showAlert(err.response?.data?.message || "Operation failed.", "error");
    }
  };

  const availableStatuses = NEXT_STATUSES[currentStatus] || STATUSES;

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

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-wide text-white">Maintenance Management</h1>
              <p className="text-sm text-neutral-400">Log routine and corrective maintenance activities for each vehicle</p>
            </div>
            <button onClick={handleAddClick}
              className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-semibold px-4 py-2.5 rounded-lg text-sm transition-all shadow-md active:scale-[0.98]">
              + Log Maintenance
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total Records",    value: records.length },
              { label: "Scheduled",        value: records.filter(r => r.maintenance_status === "Scheduled").length },
              { label: "Completed",        value: records.filter(r => r.maintenance_status === "Completed").length },
            ].map(c => (
              <div key={c.label} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                <div className="text-xs text-amber-500 font-semibold uppercase tracking-wider mb-1">{c.label}</div>
                <div className="text-2xl font-bold text-white font-mono">{c.value}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-neutral-900 p-4 border border-neutral-800 rounded-xl">
            <div>
              <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Vehicle</label>
              <select value={filterVehicle} onChange={e => setFilterVehicle(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50">
                <option value="">All</option>
                {vehicles.map(v => (
                  <option key={v.vehicle_id} value={v.vehicle_id}>
                    {v.registration_number || `#${v.vehicle_id}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50">
                <option value="">All</option>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Type</label>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50">
                <option value="">All</option>
                {MAINTENANCE_TYPES.map(t => <option key={t}>{t}</option>)}
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
            <div className="md:col-span-5 flex gap-3 pt-1">
              <button onClick={fetchRecords}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 rounded-lg text-xs font-bold tracking-wide">
                Apply Filters
              </button>
              <button onClick={() => { setFilterVehicle(""); setFilterStatus(""); setFilterType(""); setFilterStart(""); setFilterEnd(""); }}
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
                    <th className="px-4 py-4">Type</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Date / Time</th>
                    <th className="px-4 py-4">Cost (LKR)</th>
                    <th className="px-4 py-4">Performed By</th>
                    <th className="px-4 py-4">Next Service</th>
                    <th className="px-4 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50 text-sm text-neutral-300">
                  {loading ? (
                    <tr><td colSpan="8" className="text-center py-12 font-mono text-neutral-500 animate-pulse">Loading maintenance records...</td></tr>
                  ) : records.length === 0 ? (
                    <tr><td colSpan="8" className="text-center py-12 font-mono text-neutral-500">No maintenance records found.</td></tr>
                  ) : records.map(rec => (
                    <tr key={rec.maintenance_id} className="hover:bg-neutral-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-white font-semibold">
                        {rec.registration_number || `#${rec.vehicle_id}`}
                      </td>
                      <td className="px-4 py-3 text-xs">{rec.maintenance_type}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${STATUS_COLORS[rec.maintenance_status] || ""}`}>
                          {rec.maintenance_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <div>{rec.maintenance_date ? rec.maintenance_date.split("T")[0] : "—"}</div>
                        <div className="text-neutral-500">{rec.maintenance_time || "—"}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{parseFloat(rec.cost || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs">{rec.performed_by || <span className="text-neutral-500">—</span>}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {rec.next_maintenance_date ? rec.next_maintenance_date.split("T")[0] : <span className="text-neutral-500">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center space-x-3 whitespace-nowrap">
                        <button onClick={() => handleEditClick(rec)}
                          className="text-amber-500 hover:text-amber-400 font-semibold text-xs tracking-wider uppercase transition-colors">
                          Edit
                        </button>
                        <button onClick={() => handleDeleteClick(rec.maintenance_id)}
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
              {editingId ? "✏️ Edit Maintenance Record" : "🔧 Log New Maintenance Record"}
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
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">Maintenance Type *</label>
                  <select required value={formData.maintenance_type}
                    onChange={e => setFormData({ ...formData, maintenance_type: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50">
                    {MAINTENANCE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">Maintenance Date *</label>
                  <input required type="date" value={formData.maintenance_date}
                    onChange={e => setFormData({ ...formData, maintenance_date: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 font-mono" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">Maintenance Time *</label>
                  <input required type="time" value={formData.maintenance_time}
                    onChange={e => setFormData({ ...formData, maintenance_time: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 font-mono" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">Cost (LKR) *</label>
                  <input required type="number" step="0.01" min="0" value={formData.cost}
                    onChange={e => setFormData({ ...formData, cost: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 font-mono" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">Performed By</label>
                  <input type="text" value={formData.performed_by}
                    onChange={e => setFormData({ ...formData, performed_by: e.target.value })}
                    placeholder="Technician name / ID"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 font-mono" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">Status *</label>
                  <select required value={formData.maintenance_status}
                    onChange={e => setFormData({ ...formData, maintenance_status: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50">
                    {availableStatuses.map(s => <option key={s}>{s}</option>)}
                  </select>
                  {editingId && currentStatus === "Completed" && (
                    <p className="text-xs text-neutral-500 mt-1 font-mono">Status is final — cannot be changed.</p>
                  )}
                </div>

                {/* next_maintenance_date — always visible but required only when Completed */}
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">
                    Next Maintenance Date {formData.maintenance_status === "Completed" && <span className="text-rose-400">*</span>}
                  </label>
                  <input
                    type="date"
                    value={formData.next_maintenance_date}
                    required={formData.maintenance_status === "Completed"}
                    onChange={e => setFormData({ ...formData, next_maintenance_date: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 font-mono" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">Description</label>
                <textarea rows="2" value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Details of maintenance work performed..."
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 font-mono" />
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
