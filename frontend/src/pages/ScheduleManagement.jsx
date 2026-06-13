import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

export default function ScheduleManagement() {
  const [schedules, setSchedules] = useState([]);
  const [depots, setDepots] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [distinctTypes, setDistinctTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Custom type manual creation selection trackers
  const [customTypeMode, setCustomTypeMode] = useState(false);

  const [formData, setFormData] = useState({
    depot_id: "",
    route_id: "",
    schedule_code: "",
    schedule_date: "",
    schedule_type: "",
    departure_time: "",
    expected_arrival_time: "",
    status: "Scheduled",
  });

  useEffect(() => {
    fetchRequiredDatasets();
  }, []);

  const fetchRequiredDatasets = async () => {
    try {
      setLoading(true);
      const [schedRes, depRes, routeRes, typeRes] = await Promise.all([
        fetch("http://localhost:5000/api/schedules"),
        fetch("http://localhost:5000/api/depots"),
        fetch("http://localhost:5000/api/routes"),
        fetch("http://localhost:5000/api/schedules/types")
      ]);

      const schedData = await schedRes.json();
      const depData = await depRes.json();
      const routeData = await routeRes.json();
      const typeData = await typeRes.json();

      setSchedules(Array.isArray(schedData) ? schedData : []);
      setDepots(Array.isArray(depData) ? depData : []);
      setRoutes(Array.isArray(routeData) ? routeData : []);
      setDistinctTypes(Array.isArray(typeData) ? typeData : []);
    } catch (error) {
      console.error("Critical infrastructure error pulling data registries:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openCreateModal = () => {
    setEditingSchedule(null);
    setCustomTypeMode(false);
    setFormData({
      depot_id: "",
      route_id: "",
      schedule_code: "",
      schedule_date: "",
      schedule_type: "",
      departure_time: "",
      expected_arrival_time: "",
      status: "Scheduled",
    });
    setShowModal(true);
  };

  const openEditModal = (sched) => {
    setEditingSchedule(sched);
    
    // Formatting standard SQL datetime responses cleanly into HTML values
    const formattedDate = sched.schedule_date ? sched.schedule_date.split("T")[0] : "";
    
    setFormData({
      depot_id: sched.depot_id || "",
      route_id: sched.route_id || "",
      schedule_code: sched.schedule_code || "",
      schedule_date: formattedDate,
      schedule_type: sched.schedule_type || "",
      departure_time: sched.departure_time || "",
      expected_arrival_time: sched.expected_arrival_time || "",
      status: sched.status || "Scheduled",
    });
    
    // Check if the current value exists in the suggestions array
    const exists = distinctTypes.includes(sched.schedule_type);
    setCustomTypeMode(!exists && sched.schedule_type ? true : false);
    
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editingSchedule
      ? `http://localhost:5000/api/schedules/${editingSchedule.schedule_id}`
      : "http://localhost:5000/api/schedules";
    const method = editingSchedule ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowModal(false);
        fetchRequiredDatasets();
      } else {
        alert("Failed to write schedule parameters into the database.");
      }
    } catch (error) {
      console.error("Submission error:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this schedule block?")) {
      try {
        const response = await fetch(`http://localhost:5000/api/schedules/${id}`, { method: "DELETE" });
        if (response.ok) fetchRequiredDatasets();
      } catch (error) {
        console.error("Purging action error:", error);
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white overflow-x-hidden relative">
      <Sidebar isOpen={isSidebarOpen} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} onLogout={() => window.location.href = "/"} />
        
        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Header Area */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-wide">Transit Schedules Control</h1>
              <p className="text-sm text-neutral-400">Monitor active dispatch matrix blocks, timeline updates, and route loads</p>
            </div>
            <button onClick={openCreateModal} className="bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold px-5 py-2.5 rounded-lg text-sm shadow-md tracking-wide hover:opacity-90 transition-opacity whitespace-nowrap">
              + Generate Block Schedule
            </button>
          </div>

          {/* Master Table Display Window */}
          {loading ? (
            <div className="text-center text-neutral-500 font-medium py-10 tracking-widest font-mono animate-pulse">LOADING LOG TIMELINES...</div>
          ) : (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse table-auto min-w-[900px]">
                  <thead>
                    <tr className="bg-neutral-950 text-amber-500 text-xs font-semibold uppercase border-b border-neutral-800 tracking-wider">
                      <th className="p-4">Code</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Depot Node</th>
                      <th className="p-4">Assigned Path</th>
                      <th className="p-4">Type</th>
                      <th className="p-4 text-center">Timings (Dep → Arr)</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/50 text-sm">
                    {schedules.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center p-8 text-neutral-500 tracking-wide">No schedules logged inside system records.</td>
                      </tr>
                    ) : (
                      schedules.map((sched) => (
                        <tr key={sched.schedule_id} className="hover:bg-neutral-850/30 transition-colors">
                          <td className="p-4 font-mono text-xs font-bold text-amber-400">#{sched.schedule_code || "N/A"}</td>
                          <td className="p-4 text-white font-medium whitespace-nowrap">{sched.schedule_date ? sched.schedule_date.split("T")[0] : "—"}</td>
                          <td className="p-4 text-neutral-300 truncate max-w-[150px]">{sched.depot_name || <span className="text-neutral-600 text-xs italic">No Depot</span>}</td>
                          <td className="p-4 text-neutral-300 truncate max-w-[180px]">{sched.route_name || <span className="text-neutral-600 text-xs italic">No Route Assigned</span>}</td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded text-xs bg-neutral-950 border border-neutral-800 font-mono text-zinc-400">
                              {sched.schedule_type || "Standard"}
                            </span>
                          </td>
                          <td className="p-4 text-center font-mono text-xs text-neutral-400 whitespace-nowrap">
                            <span className="text-emerald-400 font-bold">{sched.departure_time ? sched.departure_time.substring(0, 5) : "—"}</span>
                            <span className="mx-1.5 text-neutral-600">→</span>
                            <span className="text-amber-400 font-bold">{sched.expected_arrival_time ? sched.expected_arrival_time.substring(0, 5) : "—"}</span>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase whitespace-nowrap ${
                              sched.status === "Active" ? "bg-emerald-500/5 border border-emerald-500/10 text-emerald-400" :
                              sched.status === "Completed" ? "bg-blue-500/5 border border-blue-500/10 text-blue-400" :
                              sched.status === "Cancelled" ? "bg-rose-500/5 border border-rose-500/10 text-rose-400" :
                              "bg-zinc-500/5 border border-zinc-500/10 text-zinc-400"
                            }`}>
                              {sched.status}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-2 whitespace-nowrap">
                            <button onClick={() => openEditModal(sched)} className="text-xs text-amber-500 hover:text-amber-400 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 transition-colors">Modify</button>
                            <button onClick={() => handleDelete(sched.schedule_id)} className="text-xs bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-medium px-2.5 py-1 rounded transition-colors">Purge</button>
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

      {/* Control Configuration Canvas Modal View */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative shadow-2xl my-auto">
            <h2 className="text-xl font-bold text-white mb-5 tracking-wide border-b border-neutral-800 pb-3">
              {editingSchedule ? `Edit Schedule Parameters: [${formData.schedule_code}]` : "Formulate New Operational Schedule Group"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Schedule Reference Identifier *</label>
                  <input type="text" name="schedule_code" required value={formData.schedule_code} onChange={handleInputChange} placeholder="e.g. SCH-WKD-098" className="w-full px-4 py-2 text-sm font-mono bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none placeholder-neutral-700" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Target Operational Date</label>
                  <input type="date" name="schedule_date" value={formData.schedule_date} onChange={handleInputChange} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none [color-scheme:dark]" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Origin Depot Node Base</label>
                  <select name="depot_id" value={formData.depot_id} onChange={handleInputChange} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none">
                    <option value="">-- Associate Depot Target --</option>
                    {depots.map(d => <option key={d.depot_id} value={d.depot_id}>{d.depot_name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Assigned Corridor Path Way</label>
                  <select name="route_id" value={formData.route_id} onChange={handleInputChange} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none">
                    <option value="">-- Link Map Transit Route --</option>
                    {routes.map(r => <option key={r.route_id} value={r.route_id}>{r.route_name} ({r.route_code})</option>)}
                  </select>
                </div>

                {/* 🌟 COMBOBOX IMPLEMENTATION: Dynamic creation / selection logic */}
                <div className="md:col-span-2 bg-neutral-950/60 p-4 rounded-lg border border-neutral-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider">Schedule Type Strategy Category *</label>
                    <button type="button" onClick={() => { setCustomTypeMode(!customTypeMode); setFormData(prev => ({ ...prev, schedule_type: "" })); }} className="text-xs font-bold bg-neutral-800 border border-neutral-700 px-2 py-1 rounded text-amber-500 hover:text-white transition-colors">
                      {customTypeMode ? "Select Existing Registry Type" : "✍️ Define Custom Type Manual Setup"}
                    </button>
                  </div>
                  
                  {customTypeMode ? (
                    <input type="text" name="schedule_type" required value={formData.schedule_type} onChange={handleInputChange} placeholder="Type a custom operational profile (e.g. Monsoon Alternate, Midnight Cargo)" className="w-full px-4 py-2 text-sm bg-neutral-950 border border-amber-500/40 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none placeholder-neutral-700" />
                  ) : (
                    <select name="schedule_type" required value={formData.schedule_type} onChange={handleInputChange} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none">
                      <option value="">-- Choose Existing Configuration Variation --</option>
                      {distinctTypes.map((t, idx) => <option key={idx} value={t}>{t}</option>)}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Departure Timeline Time</label>
                  <input type="time" name="departure_time" value={formData.departure_time} onChange={handleInputChange} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none [color-scheme:dark]" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Expected Completion Time</label>
                  <input type="time" name="expected_arrival_time" value={formData.expected_arrival_time} onChange={handleInputChange} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none [color-scheme:dark]" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Transit Execution Monitoring Block State</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none">
                    <option value="Scheduled">Scheduled Plan Block</option>
                    <option value="Active">Active Route Dispatch</option>
                    <option value="Completed">Completed Cycle Log</option>
                    <option value="Cancelled">Cancelled/Suspended Outage</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-lg hover:text-white transition-colors">Close</button>
                <button type="submit" className="bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold px-5 py-2 rounded-lg text-sm shadow-md hover:opacity-90 transition-opacity">Save Scheduling Properties</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}