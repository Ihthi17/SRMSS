import { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";

// Fix default Leaflet marker icons broken by webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Numbered amber marker for each stop
const makeStopIcon = (seq) =>
  L.divIcon({
    className: "",
    html: `<div style="
      background: #f59e0b;
      color: #1a1a1a;
      width: 28px; height: 28px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 12px;
      border: 2px solid #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.5);
    ">${seq}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });

// Component that pans the map when bounds change
function MapFitter({ stops }) {
  const map = useMap();
  useEffect(() => {
    const valid = stops.filter((s) => s.latitude && s.longitude);
    if (valid.length === 1) {
      map.setView([valid[0].latitude, valid[0].longitude], 13);
    } else if (valid.length > 1) {
      const bounds = L.latLngBounds(valid.map((s) => [s.latitude, s.longitude]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [stops, map]);
  return null;
}

// Component that captures map clicks for picking coordinates
function MapClickHandler({ onMapClick, active }) {
  useMapEvents({
    click(e) {
      if (active) onMapClick(e.latlng);
    },
  });
  return null;
}

export default function ManageStops() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stopsLoading, setStopsLoading] = useState(false);

  const [alertConfig, setAlertConfig] = useState({ isOpen: false, message: "", type: "success" });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("create");
  const [selectedStop, setSelectedStop] = useState(null);
  const [pickingCoords, setPickingCoords] = useState(false);

  const [formData, setFormData] = useState({
    stop_sequence: "",
    stop_name: "",
    latitude: "",
    longitude: "",
    distance_from_start: "",
    estimated_arrival_time: "",
  });

  const showAlert = (message, type = "success") => {
    setAlertConfig({ isOpen: true, message, type });
    setTimeout(() => setAlertConfig((p) => ({ ...p, isOpen: false })), 4500);
  };

  useEffect(() => { fetchRoutes(); }, []);

  useEffect(() => {
    if (selectedRouteId) {
      fetchStops(selectedRouteId);
      setSelectedRoute(routes.find((r) => String(r.route_id) === String(selectedRouteId)) || null);
    } else {
      setStops([]);
      setSelectedRoute(null);
    }
  }, [selectedRouteId, routes]);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/api/routes");
      const data = await res.json();
      if (Array.isArray(data)) setRoutes(data);
    } catch { showAlert("Failed to load routes", "error"); }
    finally { setLoading(false); }
  };

  const fetchStops = async (routeId) => {
    try {
      setStopsLoading(true);
      const res = await fetch(`http://localhost:5000/api/route-stops/route/${routeId}`);
      const data = await res.json();
      setStops(data.success ? data.data : []);
    } catch { showAlert("Failed to load stops", "error"); }
    finally { setStopsLoading(false); }
  };

  const resetForm = () =>
    setFormData({ stop_sequence: "", stop_name: "", latitude: "", longitude: "", distance_from_start: "", estimated_arrival_time: "" });

  const openModal = (type, stop = null) => {
    setModalType(type);
    setSelectedStop(stop);
    setPickingCoords(false);
    if (type === "edit" && stop) {
      setFormData({
        stop_sequence: stop.stop_sequence || "",
        stop_name: stop.stop_name || "",
        latitude: stop.latitude || "",
        longitude: stop.longitude || "",
        distance_from_start: stop.distance_from_start || "",
        estimated_arrival_time: stop.estimated_arrival_time || "",
      });
    } else if (type === "create") {
      resetForm();
      const maxSeq = stops.length > 0 ? Math.max(...stops.map((s) => s.stop_sequence)) : 0;
      setFormData((p) => ({ ...p, stop_sequence: maxSeq + 1 }));
    }
    setIsModalOpen(true);
  };

  const handleMapClick = useCallback((latlng) => {
    setFormData((p) => ({ ...p, latitude: latlng.lat.toFixed(6), longitude: latlng.lng.toFixed(6) }));
    setPickingCoords(false);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const isCreate = modalType === "create";
      const url = isCreate
        ? "http://localhost:5000/api/route-stops"
        : `http://localhost:5000/api/route-stops/${selectedStop.stop_id}`;

      const body = {
        ...formData,
        route_id: parseInt(selectedRouteId),
        stop_sequence: parseInt(formData.stop_sequence),
        latitude: parseFloat(formData.latitude) || null,
        longitude: parseFloat(formData.longitude) || null,
        distance_from_start: parseFloat(formData.distance_from_start) || null,
        estimated_arrival_time: formData.estimated_arrival_time || null,
      };

      const res = await fetch(url, { method: isCreate ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        showAlert(isCreate ? "Stop added successfully!" : "Stop updated successfully!");
        setIsModalOpen(false);
        fetchStops(selectedRouteId);
      } else {
        showAlert("Error: " + (data.error || "Failed to save stop"), "error");
      }
    } catch (err) { showAlert("Error: " + err.message, "error"); }
  };

  const handleDelete = async () => {
    if (!selectedStop) return;
    try {
      const res = await fetch(`http://localhost:5000/api/route-stops/${selectedStop.stop_id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showAlert("Stop deleted successfully!");
        setIsModalOpen(false);
        fetchStops(selectedRouteId);
      } else { showAlert("Error: " + (data.error || "Failed to delete"), "error"); }
    } catch (err) { showAlert("Error: " + err.message, "error"); }
  };

  // Stops that have valid coordinates for the map
  const mappableStops = stops.filter((s) => s.latitude && s.longitude);
  const polylinePositions = [...mappableStops]
    .sort((a, b) => a.stop_sequence - b.stop_sequence)
    .map((s) => [parseFloat(s.latitude), parseFloat(s.longitude)]);

  // Default map center — Sri Lanka
  const defaultCenter = [7.8731, 80.7718];

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white overflow-x-hidden relative">
      {/* Alert */}
      {alertConfig.isOpen && (
        <div className="fixed top-5 right-5 z-[100] max-w-sm w-[90%] sm:w-full bg-neutral-900 border rounded-xl shadow-2xl p-4 flex items-start gap-3 border-neutral-800">
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
            <h3 className="text-sm font-bold text-white">{alertConfig.type === "success" ? "Success" : "Error"}</h3>
            <p className="text-xs text-neutral-400 mt-0.5">{alertConfig.message}</p>
          </div>
        </div>
      )}

      <Sidebar isOpen={isSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} onLogout={() => (window.location.href = "/")} />

        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-wide">Route Stop Management</h1>
              <p className="text-sm text-neutral-400">Manage route checkpoints and stops</p>
            </div>
          </div>

          {/* Route Selector */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <label className="block text-xs font-semibold text-amber-500 uppercase mb-2 tracking-wider">Select Route</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                <option value="">-- Select a route to manage stops --</option>
                {routes.map((r) => (
                  <option key={r.route_id} value={r.route_id}>
                    {r.route_name} ({r.start_location} → {r.end_location})
                  </option>
                ))}
              </select>
              {selectedRouteId && (
                <button
                  onClick={() => openModal("create")}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold px-5 py-2.5 rounded-lg text-sm shadow-md hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                  + Add Stop
                </button>
              )}
            </div>
            {selectedRoute && (
              <div className="flex flex-wrap gap-3 mt-4">
                <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-full">{selectedRoute.route_name}</span>
                <span className="px-3 py-1 bg-neutral-800 text-neutral-300 text-xs rounded-full">{selectedRoute.start_location} → {selectedRoute.end_location}</span>
                {selectedRoute.total_distance && (
                  <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs rounded-full">{selectedRoute.total_distance} km</span>
                )}
                <span className="px-3 py-1 bg-neutral-800 text-neutral-300 text-xs rounded-full">{stops.length} Stop{stops.length !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          {selectedRouteId ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* ── Stops Table ── */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-950 text-amber-500 text-xs font-semibold uppercase border-b border-neutral-800 tracking-wider">
                        <th className="p-4">Seq</th>
                        <th className="p-4">Stop Name</th>
                        <th className="p-4">Latitude</th>
                        <th className="p-4">Longitude</th>
                        <th className="p-4">Dist (km)</th>
                        <th className="p-4">Est. Arrival</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/50 text-sm">
                      {stopsLoading ? (
                        <tr><td colSpan="7" className="p-8 text-center text-neutral-500">Loading stops...</td></tr>
                      ) : stops.length > 0 ? (
                        stops.map((stop) => (
                          <tr key={stop.stop_id} className="hover:bg-neutral-800/30 transition-colors">
                            <td className="p-4">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
                                {stop.stop_sequence}
                              </span>
                            </td>
                            <td className="p-4 font-medium text-white">{stop.stop_name}</td>
                            <td className="p-4 text-neutral-400 font-mono text-xs">{stop.latitude ?? "—"}</td>
                            <td className="p-4 text-neutral-400 font-mono text-xs">{stop.longitude ?? "—"}</td>
                            <td className="p-4 text-neutral-300">{stop.distance_from_start != null ? `${stop.distance_from_start}` : "—"}</td>
                            <td className="p-4 text-neutral-300 font-mono">{stop.estimated_arrival_time || "—"}</td>
                            <td className="p-4 text-right space-x-2">
                              <button onClick={() => openModal("edit", stop)} className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 transition-colors">Edit</button>
                              <button onClick={() => openModal("delete", stop)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-500/10 border border-red-500/20 transition-colors">Delete</button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="p-10 text-center">
                            <div className="flex flex-col items-center gap-2 text-neutral-500">
                              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <p className="text-sm">No stops found for this route</p>
                              <button onClick={() => openModal("create")} className="mt-2 text-xs text-amber-400 hover:text-amber-300 underline">Add the first stop</button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Map Panel ── */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
                <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Route Map</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {mappableStops.length > 0
                        ? `Showing ${mappableStops.length} of ${stops.length} stops with coordinates`
                        : "Add stops with coordinates to visualise the route"}
                    </p>
                  </div>
                  {mappableStops.length > 0 && (
                    <span className="text-xs px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full">
                      {mappableStops.length} mapped
                    </span>
                  )}
                </div>

                <div className="relative flex-1" style={{ minHeight: "420px" }}>
                  <MapContainer
                    center={
                      mappableStops.length > 0
                        ? [parseFloat(mappableStops[0].latitude), parseFloat(mappableStops[0].longitude)]
                        : defaultCenter
                    }
                    zoom={mappableStops.length > 0 ? 10 : 7}
                    style={{ height: "100%", width: "100%", minHeight: "420px" }}
                    className="z-0"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <MapFitter stops={mappableStops} />
                    <MapClickHandler onMapClick={handleMapClick} active={pickingCoords} />

                    {/* Route polyline */}
                    {polylinePositions.length > 1 && (
                      <Polyline
                        positions={polylinePositions}
                        pathOptions={{ color: "#f59e0b", weight: 3, opacity: 0.85, dashArray: "6 4" }}
                      />
                    )}

                    {/* Stop markers */}
                    {mappableStops
                      .sort((a, b) => a.stop_sequence - b.stop_sequence)
                      .map((stop) => (
                        <Marker
                          key={stop.stop_id}
                          position={[parseFloat(stop.latitude), parseFloat(stop.longitude)]}
                          icon={makeStopIcon(stop.stop_sequence)}
                        >
                          <Popup>
                            <div className="text-xs" style={{ minWidth: 160 }}>
                              <p className="font-bold text-sm mb-1">#{stop.stop_sequence} — {stop.stop_name}</p>
                              {stop.distance_from_start != null && (
                                <p>📍 {stop.distance_from_start} km from start</p>
                              )}
                              {stop.estimated_arrival_time && (
                                <p>🕐 Est. arrival: {stop.estimated_arrival_time}</p>
                              )}
                              <p className="text-gray-500 mt-1">{stop.latitude}, {stop.longitude}</p>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                  </MapContainer>

                  {/* Pick-coords overlay hint */}
                  {pickingCoords && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[999] bg-amber-500 text-neutral-950 text-xs font-bold px-4 py-2 rounded-full shadow-lg pointer-events-none">
                      📍 Click on the map to pick coordinates
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-16 text-center">
              <div className="flex flex-col items-center gap-3 text-neutral-500">
                <svg className="w-14 h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <p className="text-sm font-medium">Select a route above to view and manage its stops</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-6 border-b border-neutral-800 pb-3">
                {modalType === "create" ? "Add New Stop" : modalType === "edit" ? "Edit Stop" : "Delete Stop"}
              </h2>

              {modalType === "delete" ? (
                <div className="space-y-5">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-bold text-red-400">Confirm Deletion</h3>
                      <p className="text-xs text-neutral-300 mt-1">
                        Are you sure you want to delete stop <span className="text-white font-semibold">"{selectedStop?.stop_name}"</span>? This cannot be undone.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-sm text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-lg hover:text-white">Cancel</button>
                    <button onClick={handleDelete} className="px-5 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-lg text-sm hover:opacity-90">Delete Stop</button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Basic fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Sequence #</label>
                      <input type="number" min="1" value={formData.stop_sequence} onChange={(e) => setFormData({ ...formData, stop_sequence: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Stop Name</label>
                      <input type="text" value={formData.stop_name} onChange={(e) => setFormData({ ...formData, stop_name: e.target.value })}
                        placeholder="e.g. Colombo Fort"
                        className="w-full px-3 py-2 text-sm bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" required />
                    </div>
                  </div>

                  {/* Coordinates + map picker */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Coordinates</label>
                      <button
                        type="button"
                        onClick={() => setPickingCoords((v) => !v)}
                        className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${pickingCoords ? "bg-amber-500 text-neutral-950" : "bg-neutral-800 text-neutral-300 hover:bg-amber-500/20 hover:text-amber-400"}`}
                      >
                        {pickingCoords ? "📍 Picking… (click map)" : "📍 Pick from map"}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="number" step="any" value={formData.latitude} onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                        placeholder="Latitude  e.g. 6.9271"
                        className="w-full px-3 py-2 text-sm bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                      <input type="number" step="any" value={formData.longitude} onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                        placeholder="Longitude  e.g. 79.8612"
                        className="w-full px-3 py-2 text-sm bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                    </div>

                    {/* Mini map inside modal */}
                    <div className="mt-3 rounded-lg overflow-hidden border border-neutral-700" style={{ height: 220 }}>
                      <MapContainer
                        center={
                          formData.latitude && formData.longitude
                            ? [parseFloat(formData.latitude), parseFloat(formData.longitude)]
                            : mappableStops.length > 0
                            ? [parseFloat(mappableStops[0].latitude), parseFloat(mappableStops[0].longitude)]
                            : defaultCenter
                        }
                        zoom={formData.latitude ? 13 : 7}
                        style={{ height: "100%", width: "100%" }}
                        className="z-0"
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapClickHandler onMapClick={handleMapClick} active={pickingCoords} />
                        {formData.latitude && formData.longitude && (
                          <Marker position={[parseFloat(formData.latitude), parseFloat(formData.longitude)]} icon={makeStopIcon(formData.stop_sequence || "?")}>
                            <Popup><b>{formData.stop_name || "New Stop"}</b><br />{formData.latitude}, {formData.longitude}</Popup>
                          </Marker>
                        )}
                      </MapContainer>
                    </div>
                    {pickingCoords && (
                      <p className="text-xs text-amber-400 mt-1 text-center">Click anywhere on the map above to set coordinates</p>
                    )}
                  </div>

                  {/* Distance + Arrival */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Distance from Start (km)</label>
                      <input type="number" step="0.01" min="0" value={formData.distance_from_start} onChange={(e) => setFormData({ ...formData, distance_from_start: e.target.value })}
                        placeholder="0.00"
                        className="w-full px-3 py-2 text-sm bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Est. Arrival Time</label>
                      <input type="time" value={formData.estimated_arrival_time} onChange={(e) => setFormData({ ...formData, estimated_arrival_time: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-sm text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-lg hover:text-white">Cancel</button>
                    <button type="submit" className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold rounded-lg text-sm hover:opacity-90">
                      {modalType === "create" ? "Add Stop" : "Save Changes"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
