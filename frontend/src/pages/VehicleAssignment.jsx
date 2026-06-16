import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

export default function VehicleAssignment() {
  const [assignments, setAssignments] = useState([]);
  const [vehicles, setVehicles]       = useState([]);
  const [schedules, setSchedules]     = useState([]);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage]   = useState(1);
  const [recordsPerPage]                = useState(10);

  const [alertConfig, setAlertConfig] = useState({ isOpen: false, message: "", type: "success" });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType]     = useState("create");
  const [formData, setFormData]       = useState({
    assignment_id: "", schedule_id: "", vehicle_id: "",
    assignment_date: "", start_time: "08:00", end_time: "16:00", status: "Assigned"
  });

  const showAlert = (message, type = "success") => {
    setAlertConfig({ isOpen: true, message, type });
    setTimeout(() => setAlertConfig(p => ({ ...p, isOpen: false })), 4500);
  };

  const fetchAll = async () => {
    try {
      const [aRes, vRes, sRes] = await Promise.all([
        fetch("http://localhost:5000/api/assignments/vehicles"),
        fetch("http://localhost:5000/api/assignments/vehicles/selection"),
        fetch("http://localhost:5000/api/assignments/schedules/selection"),
      ]);
      const [aData, vData, sData] = await Promise.all([aRes.json(), vRes.json(), sRes.json()]);
      setAssignments(Array.isArray(aData) ? aData : []);
      setVehicles(Array.isArray(vData) ? vData : []);
      setSchedules(Array.isArray(sData) ? sData : []);
    } catch (err) {
      console.error("Fetch error:", err);
      showAlert("Could not connect to server.", "error");
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const isCreate = modalType === "create";
      const url = isCreate
        ? "http://localhost:5000/api/assignments/vehicles"
        : `http://localhost:5000/api/assignments/vehicles/${formData.assignment_id}`;

      const res = await fetch(url, {
        method: isCreate ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (res.ok) {
        showAlert(result.message || "Vehicle assignment saved.", "success");
        setIsModalOpen(false);
        fetchAll();
      } else {
        showAlert(result.error || "Failed to save.", "error");
      }
    } catch (err) {
      showAlert("Error: " + err.message, "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this vehicle assignment?")) return;
    try {
      const res = await fetch(`http://localhost:5000/api/assignments/vehicles/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (res.ok) { showAlert(result.message, "success"); fetchAll(); }
      else showAlert(result.error || "Delete failed.", "error");
    } catch (err) {
      showAlert("Error: " + err.message, "error");
    }
  };

  const openModal = (type, row = null) => {
    setModalType(type);
    if (row) {
      setFormData({
        assignment_id:   row.assignment_id,
        schedule_id:     row.schedule_id || "",
        vehicle_id:      row.vehicle_id  || "",
        assignment_date: row.assignment_date ? row.assignment_date.split("T")[0] : "",
        start_time:      row.start_time  || "08:00",
        end_time:        row.end_time    || "16:00",
        status:          row.status      || "Assigned",
      });
    } else {
      setFormData({
        assignment_id: "", schedule_id: "", vehicle_id: "",
        assignment_date: "", start_time: "08:00", end_time: "16:00", status: "Assigned"
      });
    }
    setIsModalOpen(true);
  };

  const filtered = assignments.filter(a => {
    const matchSearch =
      (a.registration_number || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.route_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.schedule_code || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const paged = filtered.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);

  const statusBadge = (s) => ({
    Assigned:  "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "In Use":  "bg-blue-500/10 text-blue-400 border-blue-500/20",
    Completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  }[s] || "bg-neutral-800 text-neutral-400 border-transparent");

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white overflow-x-hidden">

      {/* Alert */}
      {alertConfig.isOpen && (
        <div className="fixed top-5 right-5 z-[100] max-w-sm w-[90%] bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-4 flex items-start gap-3">
          <div className={`p-1 rounded-lg ${alertConfig.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
            {alertConfig.type === "success"
              ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
              : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01M6 20h12a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>}
          </div>
          <div className="flex-1">
            <p className="text-xs text-neutral-400 mt-0.5">{alertConfig.message}</p>
          </div>
          <button onClick={() => setAlertConfig(p => ({ ...p, isOpen: false }))} className="text-neutral-500 hover:text-white">✕</button>
        </div>
      )}

      <Sidebar isOpen={isSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} onLogout={() => window.location.href = "/"} />

        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-wide">Vehicle Assignments</h1>
              <p className="text-sm text-neutral-400">Assign vehicles to schedules so driver shifts show correct bus details</p>
            </div>
            <button onClick={() => openModal("create")} className="bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold px-5 py-2.5 rounded-lg text-sm shadow-md hover:opacity-90 transition-opacity">
              + Assign Vehicle
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-neutral-900 p-4 rounded-xl border border-neutral-800">
            <input
              type="text" placeholder="Search by vehicle, route, schedule..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="sm:col-span-2 px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none placeholder-neutral-500"
            />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm focus:outline-none text-neutral-300">
              <option value="">All Statuses</option>
              <option value="Assigned">Assigned</option>
              <option value="In Use">In Use</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-950 text-amber-500 text-xs font-semibold uppercase border-b border-neutral-800 tracking-wider">
                    {["Vehicle","Schedule","Route","Date","Time Window","Status","Actions"].map(h =>
                      <th key={h} className="p-4">{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50 text-sm">
                  {paged.map(a => (
                    <tr key={a.assignment_id} className="hover:bg-neutral-800/20 transition-colors">
                      <td className="p-4 font-mono text-amber-400">
                        {a.registration_number || "—"}
                        {a.bus_code && <span className="ml-1 text-neutral-500 text-xs">({a.bus_code})</span>}
                      </td>
                      <td className="p-4 font-mono text-neutral-300">{a.schedule_code || `#${a.schedule_id}`}</td>
                      <td className="p-4 text-neutral-300">{a.route_name || "—"}</td>
                      <td className="p-4 text-neutral-400 font-mono">
                        {a.assignment_date ? a.assignment_date.split("T")[0] : "—"}
                      </td>
                      <td className="p-4 text-neutral-400 font-mono text-xs">
                        {a.start_time || "—"} → {a.end_time || "—"}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${statusBadge(a.status)}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        <button onClick={() => openModal("edit", a)} className="text-xs text-amber-500 hover:text-amber-400 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 transition-colors">Edit</button>
                        <button onClick={() => handleDelete(a.assignment_id)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-500/10 border border-red-500/20 transition-colors">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {paged.length === 0 && (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-neutral-500">
                        No vehicle assignments found.{" "}
                        <button onClick={() => openModal("create")} className="text-amber-400 underline">Assign a vehicle</button> to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {filtered.length > recordsPerPage && (
            <div className="flex justify-center gap-2">
              {Array.from({ length: Math.ceil(filtered.length / recordsPerPage) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setCurrentPage(p)}
                  className={`px-4 py-2 rounded-lg transition-colors ${currentPage === p ? "bg-amber-500 text-neutral-950 font-bold" : "bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white"}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-5 border-b border-neutral-800 pb-3 tracking-wide capitalize">
              {modalType} Vehicle Assignment
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Vehicle</label>
                <select required value={formData.vehicle_id} onChange={e => setFormData({ ...formData, vehicle_id: e.target.value })}
                  className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none">
                  <option value="">-- Select Vehicle --</option>
                  {vehicles.map(v => (
                    <option key={v.vehicle_id} value={v.vehicle_id}>
                      {v.registration_number}{v.bus_code ? ` (${v.bus_code})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Schedule</label>
                <select required value={formData.schedule_id} onChange={e => setFormData({ ...formData, schedule_id: e.target.value })}
                  className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none">
                  <option value="">-- Select Schedule --</option>
                  {schedules.map(s => (
                    <option key={s.schedule_id} value={s.schedule_id}>
                      {s.route_name ? `${s.route_name} (${s.schedule_code || s.schedule_id})` : `Schedule #${s.schedule_id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Assignment Date</label>
                <input type="date" required value={formData.assignment_date}
                  onChange={e => setFormData({ ...formData, assignment_date: e.target.value })}
                  className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Start Time</label>
                  <input type="time" value={formData.start_time}
                    onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">End Time</label>
                  <input type="time" value={formData.end_time}
                    onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Status</label>
                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none">
                  <option value="Assigned">Assigned</option>
                  <option value="In Use">In Use</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-lg hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit"
                  className="bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold px-5 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity">
                  {modalType === "create" ? "Assign Vehicle" : "Update Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
