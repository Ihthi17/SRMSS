import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const BASE = "http://localhost:5000/api";
const COLORS = ["#f5c542","#3b82f6","#10b981","#ef4444","#a855f7","#f97316","#06b6d4","#ec4899"];

function authHeader() {
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}
function fmt2(v) { return v != null ? parseFloat(v).toFixed(2) : "0.00"; }

// ─── Shared micro-components ──────────────────────────────────────────────────

function StatCard({ label, value, sub, color = "text-white" }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
      <div className="text-xs text-amber-500 font-semibold uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
      {sub && <div className="text-xs text-neutral-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest border-b border-neutral-800 pb-1 mb-4">
      {children}
    </h3>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl p-4 text-sm font-semibold">
      ⚠ {msg}
    </div>
  );
}

function EmptyChart() {
  return <div className="text-center py-10 text-neutral-500 text-sm">No data available.</div>;
}

// ─── Export buttons ───────────────────────────────────────────────────────────

function ExportButtons({ reportType, filters }) {
  const [exporting, setExporting] = useState(null);

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const res = await axios.get(`${BASE}/reports/export`, {
        params: { reportType, format, ...filters },
        headers: authHeader(),
        responseType: "blob"
      });
      const extMap  = { csv: "csv", excel: "xlsx", pdf: "pdf" };
      const mimeMap = {
        csv:   "text/csv",
        excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        pdf:   "application/pdf"
      };
      const url  = URL.createObjectURL(new Blob([res.data], { type: mimeMap[format] }));
      const link = document.createElement("a");
      link.href  = url;
      link.download = `${reportType}_report_${new Date().toISOString().split("T")[0]}.${extMap[format]}`;
      document.body.appendChild(link); link.click();
      document.body.removeChild(link); URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.status === 403
        ? "Access denied: your role cannot export reports."
        : "Export failed. Please try again.");
    } finally { setExporting(null); }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider mr-1">Export:</span>
      {["csv","excel","pdf"].map(fmt => (
        <button key={fmt} onClick={() => handleExport(fmt)} disabled={exporting === fmt}
          className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all border
            bg-neutral-800 border-neutral-700 text-white hover:bg-amber-500 hover:border-amber-500 hover:text-neutral-950
            disabled:opacity-50 disabled:cursor-not-allowed">
          {exporting === fmt ? "..." : fmt.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

// ─── TAB 1: FUEL CONSUMPTION ──────────────────────────────────────────────────

function FuelTab({ filters }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await axios.get(`${BASE}/reports/fuel-consumption`, { params: filters, headers: authHeader() });
      setData(res.data);
    } catch (e) { setError(e.response?.data?.message || "Failed to load fuel report."); }
    finally { setLoading(false); }
  // eslint-disable-next-line
  }, [JSON.stringify(filters)]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error)   return <ErrorBox msg={error} />;
  if (!data)   return null;

  const { summary, by_type, by_vehicle, trend } = data;

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportButtons reportType="fuel" filters={filters} /></div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Fuel (L)"     value={fmt2(summary.total_quantity)} />
        <StatCard label="Total Cost (LKR)"   value={fmt2(summary.total_cost)} />
        <StatCard label="Avg Efficiency"     value={`${fmt2(summary.avg_efficiency)} km/L`} />
        <StatCard label="Total Records"      value={summary.total_records} />
        <StatCard label="Vehicles Tracked"   value={summary.vehicles_tracked} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <SectionTitle>Fuel Type Breakdown</SectionTitle>
          {by_type.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={by_type} dataKey="quantity" nameKey="fuel_type" cx="50%" cy="50%" outerRadius={80} label={e => e.fuel_type}>
                  {by_type.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => [`${fmt2(v)} L`, "Quantity"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <SectionTitle>Top Vehicles by Fuel Usage</SectionTitle>
          {by_vehicle.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={by_vehicle.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <YAxis dataKey="registration_number" type="category" tick={{ fill: "#9ca3af", fontSize: 10 }} width={90} />
                <Tooltip formatter={v => [`${fmt2(v)} L`]} />
                <Bar dataKey="quantity" fill="#f5c542" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <SectionTitle>Daily Fuel Trend</SectionTitle>
        {trend.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={[...trend].reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="fuel_date" tick={{ fill: "#9ca3af", fontSize: 10 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="daily_quantity"       name="Quantity (L)"  stroke="#f5c542" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="daily_avg_efficiency" name="Avg Efficiency" stroke="#10b981" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ─── TAB 2: ROUTE MANAGEMENT ──────────────────────────────────────────────────

function RouteTab({ filters }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await axios.get(`${BASE}/reports/route-management`, { params: filters, headers: authHeader() });
      setData(res.data);
    } catch (e) { setError(e.response?.data?.message || "Failed to load route report."); }
    finally { setLoading(false); }
  // eslint-disable-next-line
  }, [JSON.stringify(filters)]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error)   return <ErrorBox msg={error} />;
  if (!data)   return null;

  const { routes, total_routes, total_trips, avg_completion } = data;

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportButtons reportType="routes" filters={filters} /></div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total Routes"       value={total_routes} />
        <StatCard label="Total Trips"        value={total_trips} />
        <StatCard label="Avg Completion"     value={`${avg_completion}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <SectionTitle>Top Routes by Trips</SectionTitle>
          {routes.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={routes.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <YAxis dataKey="route_name" type="category" tick={{ fill: "#9ca3af", fontSize: 9 }} width={120} />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed_trips" name="Completed" fill="#10b981" stackId="a" radius={[0,4,4,0]} />
                <Bar dataKey="cancelled_trips" name="Cancelled" fill="#ef4444" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <SectionTitle>Completion Rate by Route</SectionTitle>
          {routes.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={routes.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="route_code" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <Tooltip formatter={v => [`${v}%`]} />
                <Bar dataKey="completion_percentage" name="Completion %" fill="#f5c542" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="px-5 pt-4 pb-2"><SectionTitle>Route Summary Table</SectionTitle></div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-neutral-300">
            <thead>
              <tr className="bg-neutral-950/60 text-amber-500 font-semibold uppercase text-[10px] tracking-wider">
                {["Route","Code","Depot","Distance","Total Trips","Completed","Cancelled","Scheduled","Completion %"].map(h =>
                  <th key={h} className="px-3 py-3 text-left">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/40">
              {routes.length === 0
                ? <tr><td colSpan="9" className="text-center py-8 text-neutral-500">No routes found.</td></tr>
                : routes.map(r => (
                  <tr key={r.route_id} className="hover:bg-neutral-800/20">
                    <td className="px-3 py-2 font-medium">{r.route_name}</td>
                    <td className="px-3 py-2 font-mono text-amber-400">{r.route_code}</td>
                    <td className="px-3 py-2">{r.depot_name || "—"}</td>
                    <td className="px-3 py-2 font-mono">{r.total_distance ? `${r.total_distance} km` : "—"}</td>
                    <td className="px-3 py-2 font-mono">{r.total_trips}</td>
                    <td className="px-3 py-2 font-mono text-emerald-400">{r.completed_trips}</td>
                    <td className="px-3 py-2 font-mono text-rose-400">{r.cancelled_trips}</td>
                    <td className="px-3 py-2 font-mono text-amber-400">{r.scheduled_trips}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-neutral-800 rounded-full h-1.5">
                          <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${r.completion_percentage}%` }} />
                        </div>
                        <span className="font-mono">{r.completion_percentage}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── TAB 3: DEPOT MANAGEMENT ──────────────────────────────────────────────────

function DepotTab({ filters }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await axios.get(`${BASE}/reports/depot-management`, { params: { depot_id: filters.depot_id }, headers: authHeader() });
      setData(res.data);
    } catch (e) { setError(e.response?.data?.message || "Failed to load depot report."); }
    finally { setLoading(false); }
  // eslint-disable-next-line
  }, [filters.depot_id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error)   return <ErrorBox msg={error} />;
  if (!data)   return null;

  const { depots, total_depots } = data;

  const vehicleData = depots.map(d => ({ name: d.depot_name, available: d.available_vehicles, maintenance: d.maintenance_vehicles }));
  const driverData  = depots.map(d => ({ name: d.depot_name, total: d.total_drivers, available: d.available_drivers }));

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportButtons reportType="depots" filters={filters} /></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Depots"   value={total_depots} />
        <StatCard label="Total Vehicles" value={depots.reduce((s, d) => s + (d.total_vehicles || 0), 0)} />
        <StatCard label="Total Drivers"  value={depots.reduce((s, d) => s + (d.total_drivers  || 0), 0)} />
        <StatCard label="Active Routes"  value={depots.reduce((s, d) => s + (d.active_routes  || 0), 0)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <SectionTitle>Vehicle Count by Depot</SectionTitle>
          {vehicleData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={vehicleData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="available"    name="Available"    fill="#10b981" stackId="a" radius={[0,0,0,0]} />
                <Bar dataKey="maintenance"  name="Maintenance"  fill="#f97316" stackId="a" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <SectionTitle>Driver Availability by Depot</SectionTitle>
          {driverData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={driverData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total"     name="Total"     fill="#3b82f6" radius={[0,0,0,0]} stackId="a" />
                <Bar dataKey="available" name="Available" fill="#10b981" radius={[4,4,0,0]} stackId="b" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {depots.map(d => (
          <div key={d.depot_id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <div className="text-amber-400 font-bold text-sm mb-1">{d.depot_name}</div>
            <div className="text-xs text-neutral-500 mb-3">{d.location}</div>
            <div className="space-y-1 text-xs text-neutral-300">
              <div className="flex justify-between"><span>Total Vehicles</span><span className="font-mono text-white">{d.total_vehicles}</span></div>
              <div className="flex justify-between"><span>Available Vehicles</span><span className="font-mono text-emerald-400">{d.available_vehicles}</span></div>
              <div className="flex justify-between"><span>Under Maintenance</span><span className="font-mono text-orange-400">{d.maintenance_vehicles}</span></div>
              <div className="flex justify-between"><span>Total Drivers</span><span className="font-mono text-white">{d.total_drivers}</span></div>
              <div className="flex justify-between"><span>Available Drivers</span><span className="font-mono text-emerald-400">{d.available_drivers}</span></div>
              <div className="flex justify-between"><span>Active Routes</span><span className="font-mono text-blue-400">{d.active_routes}</span></div>
              <div className="flex justify-between"><span>Utilization</span><span className="font-mono text-amber-400">{d.vehicle_utilization}%</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TAB 4: SCHEDULES MANAGEMENT ─────────────────────────────────────────────

function SchedulesTab({ filters }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await axios.get(`${BASE}/reports/schedules`, { params: filters, headers: authHeader() });
      setData(res.data);
    } catch (e) { setError(e.response?.data?.message || "Failed to load schedules report."); }
    finally { setLoading(false); }
  // eslint-disable-next-line
  }, [JSON.stringify(filters)]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error)   return <ErrorBox msg={error} />;
  if (!data)   return null;

  const { summary, by_route, by_depot, recent_schedules } = data;

  const statusPie = [
    { name: "Scheduled",   value: summary.scheduled   || 0, fill: "#f5c542" },
    { name: "In Progress", value: summary.in_progress || 0, fill: "#3b82f6" },
    { name: "Completed",   value: summary.completed   || 0, fill: "#10b981" },
    { name: "Cancelled",   value: summary.cancelled   || 0, fill: "#ef4444" },
  ].filter(d => d.value > 0);

  const statusBadge = {
    "Scheduled":   "bg-amber-500/10 text-amber-400",
    "In Progress": "bg-blue-500/10 text-blue-400",
    "Completed":   "bg-emerald-500/10 text-emerald-400",
    "Cancelled":   "bg-rose-500/10 text-rose-400"
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportButtons reportType="schedules" filters={filters} /></div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Schedules" value={summary.total_schedules || 0} />
        <StatCard label="Scheduled"       value={summary.scheduled   || 0} color="text-amber-400" />
        <StatCard label="In Progress"     value={summary.in_progress || 0} color="text-blue-400" />
        <StatCard label="Completed"       value={summary.completed   || 0} color="text-emerald-400" />
        <StatCard label="Completion Rate" value={`${summary.completion_rate || 0}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <SectionTitle>Status Distribution</SectionTitle>
          {statusPie.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={e => `${e.name} (${e.value})`}>
                  {statusPie.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <SectionTitle>Top Routes by Schedules</SectionTitle>
          {by_route.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={by_route.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <YAxis dataKey="route_name" type="category" tick={{ fill: "#9ca3af", fontSize: 9 }} width={110} />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" name="Completed" fill="#10b981" stackId="a" />
                <Bar dataKey="scheduled" name="Scheduled" fill="#f5c542" stackId="a" />
                <Bar dataKey="cancelled" name="Cancelled" fill="#ef4444" stackId="a" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="px-5 pt-4 pb-2"><SectionTitle>Recent Schedules</SectionTitle></div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-neutral-300">
            <thead>
              <tr className="bg-neutral-950/60 text-amber-500 font-semibold uppercase text-[10px] tracking-wider">
                {["Code","Date","Type","Route","Depot","Departure","Arrival","Status"].map(h =>
                  <th key={h} className="px-3 py-3 text-left">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/40">
              {recent_schedules.length === 0
                ? <tr><td colSpan="8" className="text-center py-8 text-neutral-500">No schedules found.</td></tr>
                : recent_schedules.map(s => (
                  <tr key={s.schedule_id} className="hover:bg-neutral-800/20">
                    <td className="px-3 py-2 font-mono text-amber-400">{s.schedule_code}</td>
                    <td className="px-3 py-2 font-mono">{s.schedule_date ? String(s.schedule_date).split("T")[0] : "—"}</td>
                    <td className="px-3 py-2">{s.schedule_type || "—"}</td>
                    <td className="px-3 py-2">{s.route_name || "—"}</td>
                    <td className="px-3 py-2">{s.depot_name || "—"}</td>
                    <td className="px-3 py-2 font-mono">{s.departure_time || "—"}</td>
                    <td className="px-3 py-2 font-mono">{s.expected_arrival_time || "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusBadge[s.status] || "bg-neutral-700 text-neutral-300"}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── TAB 5: DRIVER SHIFT MANAGEMENT ──────────────────────────────────────────

function DriverShiftTab({ filters }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await axios.get(`${BASE}/reports/driver-shifts`, { params: filters, headers: authHeader() });
      setData(res.data);
    } catch (e) { setError(e.response?.data?.message || "Failed to load driver shift report."); }
    finally { setLoading(false); }
  // eslint-disable-next-line
  }, [JSON.stringify(filters)]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error)   return <ErrorBox msg={error} />;
  if (!data)   return null;

  const { summary, by_driver, shift_by_day } = data;

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportButtons reportType="driver_shifts" filters={filters} /></div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Active Drivers"    value={summary.active_drivers} />
        <StatCard label="Total Trips"       value={summary.total_trips} />
        <StatCard label="Completed"         value={summary.completed_trips} color="text-emerald-400" />
        <StatCard label="Delayed"           value={summary.delayed_trips} color="text-orange-400" />
        <StatCard label="Cancelled"         value={summary.cancelled_trips} color="text-rose-400" />
        <StatCard label="Completion Rate"   value={`${summary.completion_rate}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <SectionTitle>Daily Shift Activity</SectionTitle>
          {shift_by_day.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={[...shift_by_day].reverse().slice(-20)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="trip_date" tick={{ fill: "#9ca3af", fontSize: 9 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="drivers_working" name="Drivers Working" stroke="#f5c542"  dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="completed"       name="Trips Completed" stroke="#10b981" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <SectionTitle>Top Drivers by Trips</SectionTitle>
          {by_driver.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={by_driver.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <YAxis dataKey="driver_name" type="category" tick={{ fill: "#9ca3af", fontSize: 9 }} width={120} />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed_trips" name="Completed" fill="#10b981" stackId="a" />
                <Bar dataKey="cancelled_trips" name="Cancelled" fill="#ef4444" stackId="a" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="px-5 pt-4 pb-2"><SectionTitle>Driver Performance Table</SectionTitle></div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-neutral-300">
            <thead>
              <tr className="bg-neutral-950/60 text-amber-500 font-semibold uppercase text-[10px] tracking-wider">
                {["Driver","License","Depot","Total Trips","Completed","Cancelled","Working Days","Trips/Day","Completion %"].map(h =>
                  <th key={h} className="px-3 py-3 text-left">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/40">
              {by_driver.length === 0
                ? <tr><td colSpan="9" className="text-center py-8 text-neutral-500">No data found.</td></tr>
                : by_driver.map(d => (
                  <tr key={d.driver_id} className="hover:bg-neutral-800/20">
                    <td className="px-3 py-2 font-medium">{d.driver_name}</td>
                    <td className="px-3 py-2 font-mono text-neutral-400">{d.license_number}</td>
                    <td className="px-3 py-2">{d.depot_name || "—"}</td>
                    <td className="px-3 py-2 font-mono">{d.total_trips}</td>
                    <td className="px-3 py-2 font-mono text-emerald-400">{d.completed_trips}</td>
                    <td className="px-3 py-2 font-mono text-rose-400">{d.cancelled_trips}</td>
                    <td className="px-3 py-2 font-mono">{d.working_days}</td>
                    <td className="px-3 py-2 font-mono text-amber-400">{d.trips_per_day}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-neutral-800 rounded-full h-1.5">
                          <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${d.completion_percentage}%` }} />
                        </div>
                        <span className="font-mono">{d.completion_percentage}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── TAB 6: MAINTENANCE MANAGEMENT ───────────────────────────────────────────

function MaintenanceTab({ filters }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await axios.get(`${BASE}/reports/maintenance`, { params: filters, headers: authHeader() });
      setData(res.data);
    } catch (e) { setError(e.response?.data?.message || "Failed to load maintenance report."); }
    finally { setLoading(false); }
  // eslint-disable-next-line
  }, [JSON.stringify(filters)]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error)   return <ErrorBox msg={error} />;
  if (!data)   return null;

  const { summary, by_type, by_vehicle, trend } = data;

  const statusPie = [
    { name: "Scheduled",   value: summary.scheduled,   fill: "#f5c542" },
    { name: "In Progress", value: summary.in_progress, fill: "#3b82f6" },
    { name: "Completed",   value: summary.completed,   fill: "#10b981" },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportButtons reportType="maintenance" filters={filters} /></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Records"      value={summary.total_records} />
        <StatCard label="Completed"          value={summary.completed}    color="text-emerald-400" />
        <StatCard label="Total Cost (LKR)"   value={summary.total_cost} />
        <StatCard label="Completion Rate"    value={`${summary.completion_rate}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <SectionTitle>Status Distribution</SectionTitle>
          {statusPie.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={e => e.name}>
                  {statusPie.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <SectionTitle>By Maintenance Type</SectionTitle>
          {by_type.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={by_type}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="maintenance_type" tick={{ fill: "#9ca3af", fontSize: 9 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count"     name="Count"         fill="#f5c542" radius={[4,4,0,0]} />
                <Bar dataKey="completed" name="Completed"     fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <SectionTitle>Cost Trend</SectionTitle>
        {trend.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={[...trend].reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="maint_date" tick={{ fill: "#9ca3af", fontSize: 10 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="daily_cost" name="Daily Cost (LKR)" stroke="#f5c542" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="count"      name="Records"          stroke="#3b82f6" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="px-5 pt-4 pb-2"><SectionTitle>By Vehicle</SectionTitle></div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-neutral-300">
            <thead>
              <tr className="bg-neutral-950/60 text-amber-500 font-semibold uppercase text-[10px] tracking-wider">
                {["Vehicle","Depot","Total Records","Completed","Scheduled","Total Cost (LKR)","Last Maintenance"].map(h =>
                  <th key={h} className="px-3 py-3 text-left">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/40">
              {by_vehicle.length === 0
                ? <tr><td colSpan="7" className="text-center py-8 text-neutral-500">No records found.</td></tr>
                : by_vehicle.map((v, i) => (
                  <tr key={i} className="hover:bg-neutral-800/20">
                    <td className="px-3 py-2 font-mono text-amber-400">{v.registration_number || "—"}</td>
                    <td className="px-3 py-2">{v.depot_name || "—"}</td>
                    <td className="px-3 py-2 font-mono">{v.total_records}</td>
                    <td className="px-3 py-2 font-mono text-emerald-400">{v.completed}</td>
                    <td className="px-3 py-2 font-mono text-amber-400">{v.scheduled}</td>
                    <td className="px-3 py-2 font-mono">{v.total_cost ? parseFloat(v.total_cost).toFixed(2) : "0.00"}</td>
                    <td className="px-3 py-2 font-mono">{v.last_maintenance ? String(v.last_maintenance).split("T")[0] : "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── TABS CONFIG ──────────────────────────────────────────────────────────────

const TABS = [
  { id: "fuel",         label: "⛽ Fuel Consumption"    },
  { id: "routes",       label: "🗺 Route Management"    },
  { id: "depots",       label: "🏢 Depot Management"    },
  { id: "schedules",    label: "📅 Schedules"           },
  { id: "driver_shifts",label: "👤 Driver Shifts"       },
  { id: "maintenance",  label: "🔧 Maintenance"         },
];

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function ReportsAnalytics() {
  const [activeTab, setActiveTab]         = useState("fuel");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [startDate, setStartDate]         = useState("");
  const [endDate,   setEndDate]           = useState("");
  const [vehicleId, setVehicleId]         = useState("");
  const [depotId,   setDepotId]           = useState("");
  const [vehicles,  setVehicles]          = useState([]);
  const [depots,    setDepots]            = useState([]);
  const [permissionError, setPermissionError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [vRes, dRes] = await Promise.all([
          axios.get(`${BASE}/buses`).catch(() => ({ data: [] })),
          axios.get(`${BASE}/depots`).catch(() => ({ data: [] }))
        ]);
        if (Array.isArray(vRes.data)) setVehicles(vRes.data);
        if (Array.isArray(dRes.data)) setDepots(dRes.data);
      } catch { /* silent */ }
    })();

    (async () => {
      try {
        await axios.get(`${BASE}/reports/fuel-consumption`, { headers: authHeader() });
      } catch (e) {
        if (e.response?.status === 403)
          setPermissionError(e.response.data?.message || "Access denied: your role cannot view reports.");
      }
    })();
  }, []);

  const filters = {
    start_date: startDate || undefined,
    end_date:   endDate   || undefined,
    vehicle_id: vehicleId || undefined,
    depot_id:   depotId   || undefined,
  };

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white overflow-x-hidden font-sans">
      <Sidebar isOpen={isSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenuClick={() => setIsSidebarOpen(p => !p)} />

        <main className="flex-1 p-6 overflow-y-auto">
          {/* Page header */}
          <div className="mb-6">
            <h1 className="text-2xl font-black text-white tracking-tight">Reports &amp; Analytics</h1>
            <p className="text-sm text-neutral-500 mt-1">Operational insights across fuel, routes, depots, schedules, drivers and maintenance.</p>
          </div>

          {permissionError ? (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl p-6 text-sm font-semibold">
              🚫 {permissionError}
            </div>
          ) : (
            <>
              {/* Global filter bar */}
              <div className="flex flex-wrap gap-3 items-end bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">From</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">To</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                    className="px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">Vehicle</label>
                  <select value={vehicleId} onChange={e => setVehicleId(e.target.value)}
                    className="px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50">
                    <option value="">All Vehicles</option>
                    {vehicles.map(v => <option key={v.bus_id || v.vehicle_id} value={v.vehicle_id}>{v.registration_number || v.bus_code}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">Depot</label>
                  <select value={depotId} onChange={e => setDepotId(e.target.value)}
                    className="px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50">
                    <option value="">All Depots</option>
                    {depots.map(d => <option key={d.depot_id} value={d.depot_id}>{d.depot_name}</option>)}
                  </select>
                </div>
                <button onClick={() => { setStartDate(""); setEndDate(""); setVehicleId(""); setDepotId(""); }}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-bold tracking-wide transition-all">
                  Clear
                </button>
              </div>

              {/* Tab nav */}
              <div className="flex flex-wrap gap-1 mb-6 bg-neutral-900 border border-neutral-800 rounded-xl p-1">
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all whitespace-nowrap
                      ${activeTab === t.id
                        ? "bg-amber-500 text-neutral-950"
                        : "text-neutral-400 hover:text-white hover:bg-neutral-800"}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div>
                {activeTab === "fuel"          && <FuelTab          filters={filters} />}
                {activeTab === "routes"        && <RouteTab         filters={filters} />}
                {activeTab === "depots"        && <DepotTab         filters={filters} />}
                {activeTab === "schedules"     && <SchedulesTab     filters={filters} />}
                {activeTab === "driver_shifts" && <DriverShiftTab   filters={filters} />}
                {activeTab === "maintenance"   && <MaintenanceTab   filters={filters} />}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
