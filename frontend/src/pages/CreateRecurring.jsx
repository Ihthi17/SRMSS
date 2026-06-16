import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const SCHEDULE_TYPES = ["Regular","Express","Limited","Night Service","Peak Hour","Off-Peak","Emergency","Charter"];
const STATUSES = ["Scheduled","Active"];

const EMPTY_FORM = {
  depot_id: "", route_id: "", schedule_code_prefix: "",
  start_date: "", end_date: "",
  departure_time: "", expected_arrival_time: "",
  schedule_type: "Regular", status: "Scheduled",
  recurring_pattern: "daily", days_of_week: [], frequency: 1,
};

export default function CreateRecurring() {
  const [isSidebarOpen, setIsSidebarOpen]     = useState(true);
  const [formData, setFormData]               = useState(EMPTY_FORM);
  const [depots, setDepots]                   = useState([]);
  const [routes, setRoutes]                   = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [previewRows, setPreviewRows]         = useState([]);
  const [showPreview, setShowPreview]         = useState(false);
  const [createdSchedules, setCreatedSchedules] = useState([]);
  const [showCreated, setShowCreated]         = useState(false);
  const [previewSearch, setPreviewSearch]     = useState("");
  const [createdSearch, setCreatedSearch]     = useState("");
  const [previewPage, setPreviewPage]         = useState(1);
  const [createdPage, setCreatedPage]         = useState(1);
  const PAGE_SIZE = 10;

  const [alert, setAlert] = useState({ show: false, message: "", type: "success" });
  const showAlert = (message, type = "success") => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert(a => ({ ...a, show: false })), 5000);
  };

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [dRes, rRes] = await Promise.all([
          fetch("http://localhost:5000/api/depots"),
          fetch("http://localhost:5000/api/routes"),
        ]);
        const [dData, rData] = await Promise.all([dRes.json(), rRes.json()]);
        setDepots(Array.isArray(dData) ? dData : []);
        setRoutes(Array.isArray(rData) ? rData : []);
      } catch (err) {
        showAlert("Failed to load depots/routes: " + err.message, "error");
      }
    };
    fetchDropdowns();
  }, []);

  const generateDates = () => {
    const dates = [];
    const start = new Date(formData.start_date + "T00:00:00");
    const end   = new Date(formData.end_date   + "T00:00:00");
    const freq  = Math.max(1, parseInt(formData.frequency) || 1);
    let cur = new Date(start);

    while (cur <= end && dates.length < 365) {
      if (formData.recurring_pattern === "daily") {
        dates.push(new Date(cur));
        cur.setDate(cur.getDate() + freq);
      } else if (formData.recurring_pattern === "weekly") {
        if (formData.days_of_week.length > 0) {
          if (formData.days_of_week.includes(cur.getDay())) dates.push(new Date(cur));
          cur.setDate(cur.getDate() + 1);
        } else {
          dates.push(new Date(cur));
          cur.setDate(cur.getDate() + 7 * freq);
        }
      } else if (formData.recurring_pattern === "monthly") {
        dates.push(new Date(cur));
        cur.setMonth(cur.getMonth() + freq);
      }
    }
    return dates;
  };

  const buildSchedules = () => {
    const prefix = formData.schedule_code_prefix || "SCH";
    return generateDates().map((date, i) => {
      const ds = date.toISOString().split("T")[0].replace(/-/g, "");
      return {
        depot_id:              formData.depot_id   || null,
        route_id:              formData.route_id   || null,
        schedule_code:         `${prefix}_${ds}_${String(i + 1).padStart(3, "0")}`,
        schedule_date:         date.toISOString().split("T")[0],
        schedule_type:         formData.schedule_type,
        departure_time:        formData.departure_time,
        expected_arrival_time: formData.expected_arrival_time,
        status:                formData.status,
        day_name:              DAY_NAMES[date.getDay()],
      };
    });
  };

  const handlePreview = () => {
    if (!formData.start_date || !formData.end_date) {
      showAlert("Please select start and end dates first.", "error"); return;
    }
    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      showAlert("End date must be after start date.", "error"); return;
    }
    const rows = buildSchedules();
    if (rows.length === 0) {
      showAlert("No dates match the selected pattern in this range.", "error"); return;
    }
    setPreviewRows(rows);
    setShowPreview(true);
    setPreviewPage(1);
    setPreviewSearch("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const schedules = buildSchedules();
    if (schedules.length === 0) {
      showAlert("No schedules to create. Adjust your date range or pattern.", "error"); return;
    }
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/schedules/bulk-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedules }),
      });
      const result = await res.json();
      if (res.ok) {
        showAlert(`✅ Created ${result.created} schedules${result.skipped > 0 ? ` (${result.skipped} skipped due to conflicts)` : ""}.`, "success");
        setCreatedSchedules(schedules.slice(0, result.created));
        setShowCreated(true);
        setShowPreview(false);
        setCreatedPage(1);
        setCreatedSearch("");
        setFormData(EMPTY_FORM);
        setPreviewRows([]);
      } else {
        showAlert(result.error || "Failed to create schedules.", "error");
      }
    } catch (err) {
      showAlert("Network error: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (d) => {
    const days = formData.days_of_week.includes(d)
      ? formData.days_of_week.filter(x => x !== d)
      : [...formData.days_of_week, d];
    setFormData({ ...formData, days_of_week: days });
  };

  const field = (name, value) => setFormData(p => ({ ...p, [name]: value }));

  // Filter + paginate helpers
  const filterRows = (rows, search) =>
    search ? rows.filter(r =>
      r.schedule_code.toLowerCase().includes(search.toLowerCase()) ||
      r.schedule_date.includes(search) ||
      (r.day_name || "").toLowerCase().includes(search.toLowerCase())
    ) : rows;

  const paginate = (rows, page) => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = (rows) => Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  const depotName  = (id) => depots.find(d => String(d.depot_id) === String(id))?.depot_name  || "—";
  const routeName  = (id) => routes.find(r => String(r.route_id) === String(id))?.route_name  || "—";

  const TableSection = ({ title, rows, search, setSearch, page, setPage, badge, badgeColor = "bg-amber-500" }) => {
    const filtered = filterRows(rows, search);
    const paged    = paginate(filtered, page);
    const total    = totalPages(filtered);

    return (
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {title}
            <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${badgeColor} text-neutral-950 font-bold`}>{badge}</span>
          </h2>
          <input type="text" placeholder="Search by code, date, day..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white w-56 focus:ring-1 focus:ring-amber-500 focus:outline-none placeholder-neutral-600" />
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-950 text-amber-500 font-semibold uppercase tracking-wider border-b border-neutral-800">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Schedule Code</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Day</th>
                  <th className="px-4 py-3">Departure</th>
                  <th className="px-4 py-3">Arrival</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/50">
                {paged.length === 0 ? (
                  <tr><td colSpan="8" className="px-4 py-8 text-center text-neutral-500">No records match.</td></tr>
                ) : paged.map((r, i) => (
                  <tr key={i} className="hover:bg-neutral-800/20 transition-colors text-neutral-300">
                    <td className="px-4 py-2.5 text-neutral-500 font-mono">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-4 py-2.5 font-mono text-amber-400 font-semibold">{r.schedule_code}</td>
                    <td className="px-4 py-2.5 font-mono">{r.schedule_date}</td>
                    <td className="px-4 py-2.5 text-neutral-400">{r.day_name}</td>
                    <td className="px-4 py-2.5 font-mono">{r.departure_time || "—"}</td>
                    <td className="px-4 py-2.5 font-mono">{r.expected_arrival_time || "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">{r.schedule_type}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-800 bg-neutral-950/40">
              <span className="text-xs text-neutral-500 font-mono">
                Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-2.5 py-1 rounded text-xs bg-neutral-800 text-neutral-300 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  ‹ Prev
                </button>
                {Array.from({ length: Math.min(total, 7) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${page === p ? "bg-amber-500 text-neutral-950 font-bold" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"}`}>
                    {p}
                  </button>
                ))}
                <button disabled={page === total} onClick={() => setPage(p => p + 1)}
                  className="px-2.5 py-1 rounded text-xs bg-neutral-800 text-neutral-300 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  Next ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white overflow-x-hidden">

      {/* Alert */}
      {alert.show && (
        <div className={`fixed top-5 right-5 z-[100] max-w-sm bg-neutral-900 border rounded-xl shadow-2xl p-4 flex items-start gap-3 ${alert.type === "success" ? "border-neutral-800" : "border-red-700"}`}>
          <div className={`p-1 rounded-lg ${alert.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
            {alert.type === "success"
              ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>}
          </div>
          <p className="text-xs text-neutral-300 flex-1 mt-0.5">{alert.message}</p>
          <button onClick={() => setAlert(a => ({ ...a, show: false }))} className="text-neutral-500 hover:text-white">✕</button>
        </div>
      )}

      <Sidebar isOpen={isSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} onLogout={() => window.location.href = "/"} />

        <div className="p-6 max-w-7xl w-full mx-auto space-y-8">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-wide">Create Recurring Schedules</h1>
              <p className="text-sm text-neutral-400">Generate multiple schedules with automated recurrence patterns</p>
            </div>
          </div>

          {/* Config Form */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white border-b border-neutral-800 pb-3 mb-5">Schedule Configuration</h2>

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Basic Information */}
              <div>
                <h3 className="text-sm font-semibold text-amber-500 uppercase tracking-wider mb-3">Basic Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Depot *</label>
                    <select required value={formData.depot_id} onChange={e => field("depot_id", e.target.value)}
                      className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none">
                      <option value="">Select Depot</option>
                      {depots.map(d => <option key={d.depot_id} value={d.depot_id}>{d.depot_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Route *</label>
                    <select required value={formData.route_id} onChange={e => field("route_id", e.target.value)}
                      className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none">
                      <option value="">Select Route</option>
                      {routes.map(r => <option key={r.route_id} value={r.route_id}>{r.route_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Code Prefix *</label>
                    <input type="text" required value={formData.schedule_code_prefix} onChange={e => field("schedule_code_prefix", e.target.value)}
                      placeholder="e.g., RT001, MORNING"
                      className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Schedule Type</label>
                    <select value={formData.schedule_type} onChange={e => field("schedule_type", e.target.value)}
                      className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none">
                      {SCHEDULE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Default Status</label>
                    <select value={formData.status} onChange={e => field("status", e.target.value)}
                      className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none">
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Timing */}
              <div>
                <h3 className="text-sm font-semibold text-amber-500 uppercase tracking-wider mb-3">Timing</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Departure Time *</label>
                    <input type="time" required value={formData.departure_time} onChange={e => field("departure_time", e.target.value)}
                      className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Expected Arrival *</label>
                    <input type="time" required value={formData.expected_arrival_time} onChange={e => field("expected_arrival_time", e.target.value)}
                      className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono" />
                  </div>
                </div>
              </div>

              {/* Recurrence */}
              <div>
                <h3 className="text-sm font-semibold text-amber-500 uppercase tracking-wider mb-3">Recurrence Pattern</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Start Date *</label>
                    <input type="date" required value={formData.start_date} onChange={e => field("start_date", e.target.value)}
                      className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">End Date *</label>
                    <input type="date" required value={formData.end_date} onChange={e => field("end_date", e.target.value)}
                      className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Pattern</label>
                    <select value={formData.recurring_pattern} onChange={e => field("recurring_pattern", e.target.value)}
                      className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Every N {formData.recurring_pattern === "daily" ? "Days" : formData.recurring_pattern === "weekly" ? "Weeks" : "Months"}</label>
                    <input type="number" min="1" max="30" value={formData.frequency} onChange={e => field("frequency", e.target.value)}
                      className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono" />
                  </div>
                </div>

                {/* Days of week for weekly pattern */}
                {formData.recurring_pattern === "weekly" && (
                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-amber-500 uppercase mb-2 tracking-wider">Days of Week (leave empty = every week)</label>
                    <div className="flex flex-wrap gap-2">
                      {DAY_NAMES.map((name, idx) => (
                        <button key={idx} type="button" onClick={() => toggleDay(idx)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            formData.days_of_week.includes(idx)
                              ? "bg-amber-500 text-neutral-950 border-amber-500"
                              : "bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-600"
                          }`}>{name.slice(0,3)}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Summary line */}
              {formData.start_date && formData.end_date && (
                <div className="bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-xs text-neutral-400 font-mono">
                  Depot: <span className="text-amber-400">{depotName(formData.depot_id)}</span> ·
                  Route: <span className="text-amber-400">{routeName(formData.route_id)}</span> ·
                  Pattern: <span className="text-white">{formData.recurring_pattern}</span> ·
                  Range: <span className="text-white">{formData.start_date}</span> → <span className="text-white">{formData.end_date}</span> ·
                  Est. schedules: <span className="text-amber-400 font-bold">{buildSchedules().length}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4 pt-2 border-t border-neutral-800">
                <button type="button" onClick={handlePreview}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-neutral-700 hover:bg-neutral-600 text-white font-semibold rounded-lg text-sm transition-colors">
                  👁 Preview Schedules
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold rounded-lg text-sm shadow-md hover:opacity-90 disabled:opacity-50 transition-opacity">
                  {loading ? "Creating..." : "✓ Create Schedules"}
                </button>
              </div>
            </form>
          </div>

          {/* Preview Table */}
          {showPreview && previewRows.length > 0 && (
            <div className="bg-neutral-900 border border-amber-500/20 rounded-xl p-6 space-y-4">
              <TableSection
                title="Schedule Preview"
                rows={previewRows}
                search={previewSearch} setSearch={setPreviewSearch}
                page={previewPage} setPage={setPreviewPage}
                badge={`${previewRows.length} schedules`}
                badgeColor="bg-amber-500"
              />
              <p className="text-xs text-neutral-500">These schedules will be created when you click "Create Schedules". Existing conflicting schedules will be skipped.</p>
            </div>
          )}

          {/* Created Schedules Table */}
          {showCreated && createdSchedules.length > 0 && (
            <div className="bg-neutral-900 border border-emerald-500/20 rounded-xl p-6 space-y-4">
              <TableSection
                title="✅ Created Schedules"
                rows={createdSchedules}
                search={createdSearch} setSearch={setCreatedSearch}
                page={createdPage} setPage={setCreatedPage}
                badge={`${createdSchedules.length} created`}
                badgeColor="bg-emerald-500"
              />
              <p className="text-xs text-neutral-400">
                These schedules are now visible in <strong className="text-white">Schedule Management</strong>.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
