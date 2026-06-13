import { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

export default function ManageStops() {
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [stops, setStops] = useState([]);
  const [search, setSearch] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [loadingStops, setLoadingStops] = useState(false);

  // Map Instance references to bypass wrapper hooks safely
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);

  const [alertConfig, setAlertConfig] = useState({ isOpen: false, message: "", type: "success" });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("create");
  
  const [formData, setFormData] = useState({
    stop_id: null, stop_sequence: "", stop_name: "",
    latitude: "", longitude: "", distance_from_start: "", estimated_arrival_time: "",
  });

  const showAlert = (message, type = "success") => {
    setAlertConfig({ isOpen: true, message, type });
    setTimeout(() => setAlertConfig(prev => ({ ...prev, isOpen: false })), 4500);
  };

  // 1. Core Dynamic Map Initialization Engine
  useEffect(() => {
    // Check if script is already loaded globally, if not inject it
    if (!window.google) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY`;
      script.async = true;
      script.defer = true;
      script.onload = () => initializeMap();
      document.head.appendChild(script);
    } else {
      initializeMap();
    }

    function initializeMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;
      
      // Standard dark mode palette vector configurations
      const darkStyles = [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
        { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
        { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }
      ];

      mapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current, {
        center: { lat: 6.9271, lng: 79.8612 }, // Default Colombo center point vector
        zoom: 11,
        styles: darkStyles,
        disableDefaultUI: false,
      });
    }
  }, []);

  // 2. Synchronize GIS markers and path metrics dynamically when state changes
  useEffect(() => {
    if (!window.google || !mapInstanceRef.current) return;

    // Clear existing markers from the canvas
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Clear existing polylines
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    const validStops = stops.filter(s => s.latitude && s.longitude);
    if (validStops.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    const pathCoordinates = [];

    // Map each stop checkpoint node onto the visual map space
    validStops.forEach((stop) => {
      const position = { lat: parseFloat(stop.latitude), lng: parseFloat(stop.longitude) };
      pathCoordinates.push(position);
      bounds.extend(position);

      const marker = new window.google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        title: stop.stop_name,
        label: {
          text: String(stop.stop_sequence),
          color: "#0a0a0a",
          fontWeight: "bold",
          fontSize: "11px"
        },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: "#f59e0b", // Amber theme matching your palette
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: "#ffffff",
          scale: 14,
        }
      });

      markersRef.current.push(marker);
    });

    // Draw lines connecting the markers if there are 2 or more stops
    if (pathCoordinates.length >= 2) {
      polylineRef.current = new window.google.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: "#f59e0b",
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map: mapInstanceRef.current
      });
    }

    // Auto fit viewport grid bounding box parameters
    mapInstanceRef.current.fitBounds(bounds);
  }, [stops]);

  // Handle smooth map panning focus actions
  const focusOnMap = (lat, lng) => {
    if (window.google && mapInstanceRef.current && lat && lng) {
      mapInstanceRef.current.panTo({ lat: parseFloat(lat), lng: parseFloat(lng) });
      mapInstanceRef.current.setZoom(14);
    }
  };

  // REST OF CODE REPLICATED EXACTLY FOR COMPLETE SYNC
  const fetchRoutes = async () => {
    try {
      setLoadingRoutes(true);
      const response = await fetch("http://localhost:5000/api/routes");
      const resData = await response.json();
      if (response.ok) {
        const routesList = Array.isArray(resData) ? resData : resData.data || [];
        setRoutes(routesList);
        if (routesList.length > 0) setSelectedRouteId(routesList[0].route_id);
      }
    } catch (error) { showAlert("Could not connect to tracking systems.", "error"); }
    finally { setLoadingRoutes(false); }
  };

  const fetchStops = async (routeId) => {
    if (!routeId) return setStops([]);
    try {
      setLoadingStops(true);
      const response = await fetch(`http://localhost:5000/api/route-stops/route/${routeId}`);
      const resData = await response.json();
      if (response.ok && resData.success && Array.isArray(resData.data)) {
        setStops(resData.data);
      }
    } catch (error) { showAlert("Failed to query route path coordinates.", "error"); }
    finally { setLoadingStops(false); }
  };

  useEffect(() => { fetchRoutes(); }, []);
  useEffect(() => { if (selectedRouteId) fetchStops(selectedRouteId); }, [selectedRouteId]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const isCreate = modalType === "create";
      const url = isCreate ? "http://localhost:5000/api/route-stops" : `http://localhost:5000/api/route-stops/${formData.stop_id}`;
      const response = await fetch(url, {
        method: isCreate ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, route_id: selectedRouteId }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        showAlert(isCreate ? "Stop checkpoint mapped!" : "Parameters updated!", "success");
        setIsModalOpen(false);
        fetchStops(selectedRouteId);
      }
    } catch (error) { showAlert("Error: " + error.message, "error"); }
  };

  const handleDeleteClick = async (stopId) => {
    if (window.confirm("Drop this stop checkpoint configuration?")) {
      try {
        const response = await fetch(`http://localhost:5000/api/route-stops/${stopId}`, { method: "DELETE" });
        const data = await response.json();
        if (response.ok && data.success) {
          showAlert("Route checkpoint purged.", "success");
          fetchStops(selectedRouteId);
        }
      } catch (error) { showAlert("Error: " + error.message, "error"); }
    }
  };

  const filteredStops = Array.isArray(stops)
    ? stops.filter(stop => stop.stop_name && stop.stop_name.toLowerCase().includes(search.toLowerCase()))
    : [];

  const openModal = (type, stop = null) => {
    setModalType(type);
    if (stop) {
      setFormData({
        stop_id: stop.stop_id, stop_sequence: stop.stop_sequence, stop_name: stop.stop_name,
        latitude: stop.latitude, longitude: stop.longitude, distance_from_start: stop.distance_from_start,
        estimated_arrival_time: stop.estimated_arrival_time || "",
      });
    } else {
      setFormData({ stop_id: null, stop_sequence: "", stop_name: "", latitude: "", longitude: "", distance_from_start: "", estimated_arrival_time: "" });
    }
    setIsModalOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white overflow-x-hidden relative">
      
      {alertConfig.isOpen && (
        <div className="fixed top-5 right-5 z-[100] max-w-sm w-[90%] bg-neutral-900 border rounded-xl p-4 flex border-neutral-800 shadow-2xl">
          <div className="text-xs text-amber-500 font-bold">{alertConfig.message}</div>
        </div>
      )}

      <Sidebar isOpen={isSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} onLogout={() => window.location.href = "/"} />
        
        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-wide">Live Route Mapping Engine</h1>
              <p className="text-sm text-neutral-400">
                Modifying Layout: <span className="text-amber-400 font-mono font-bold">{routes.find(r => r.route_id === selectedRouteId)?.route_name || "Select Route"}</span>
              </p>
            </div>
            <button onClick={() => openModal("create")} disabled={!selectedRouteId} className="bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold px-5 py-2.5 rounded-lg text-sm disabled:opacity-40 shadow-md">
              + Add Stop Checkpoint
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Data Side Layout Column Tracker */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl p-4">
                <h3 className="text-xs font-bold uppercase text-amber-500 mb-3">Available Operational Lines</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {routes.map(r => (
                    <button key={r.route_id} onClick={() => setSelectedRouteId(r.route_id)} className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex justify-between items-center ${r.route_id === selectedRouteId ? "bg-amber-500 text-neutral-950 font-bold" : "bg-neutral-950/60 border border-neutral-800 text-neutral-400 hover:bg-neutral-800"}`}>
                      <span className="truncate">{r.route_name}</span>
                      <span className="font-mono text-[10px]">{r.route_code}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-xl space-y-3">
                <input type="text" placeholder="Filter text parameters..." value={search} onChange={e => setSearch(e.target.value)} className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 text-white" />
                
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {filteredStops.map(stop => (
                    <div key={stop.stop_id} className="bg-neutral-950/40 p-3 rounded-lg border border-neutral-800/60 flex justify-between items-center text-xs hover:border-neutral-700 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono font-bold bg-neutral-900 text-amber-400 border border-neutral-800 rounded px-1.5 py-0.5">{stop.stop_sequence}</span>
                        <div className="truncate">
                          <h4 className="font-medium text-white truncate">{stop.stop_name}</h4>
                          <p className="text-[10px] text-neutral-500 font-mono">{stop.distance_from_start} km | +{stop.estimated_arrival_time || 0}m</p>
                        </div>
                      </div>
                      <div className="flex gap-1 pl-2">
                        <button onClick={() => focusOnMap(stop.latitude, stop.longitude)} className="text-[10px] bg-neutral-900 border border-neutral-800 hover:text-white px-1.5 py-1 rounded">Map</button>
                        <button onClick={() => openModal("edit", stop)} className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-1.5 py-1 rounded">Edit</button>
                        <button onClick={() => handleDeleteClick(stop.stop_id)} className="text-[10px] bg-rose-500/10 border border-rose-500/20 text-rose-400 px-1.5 py-1 rounded">Drop</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Map Canvas Container (Direct Vanilla Ref injection point) */}
            <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl h-[585px] relative">
              <div ref={mapContainerRef} className="w-full h-full" />
              
              {filteredStops.length === 0 && (
                <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 text-center z-10">
                  <p className="text-xs font-mono text-neutral-500">No GIS coordinate metrics mapped to this route vector.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* PopUp Configuration Modal Canvas Box */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold border-b border-neutral-800 pb-2 mb-4 capitalize">{modalType} Checkpoint</h2>
            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Sequence</label>
                  <input type="number" required value={formData.stop_sequence} onChange={e => setFormData({...formData, stop_sequence: e.target.value})} className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded text-white" />
                </div>
                <div className="col-span-2">
                  <label className="block text-neutral-400 mb-1">Terminal Designation Name</label>
                  <input type="text" required value={formData.stop_name} onChange={e => setFormData({...formData, stop_name: e.target.value})} className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Latitude</label>
                  <input type="number" step="0.000001" required value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded text-white font-mono" />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Longitude</label>
                  <input type="number" step="0.000001" required value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded text-white font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Distance (km)</label>
                  <input type="number" step="0.01" required value={formData.distance_from_start} onChange={e => setFormData({...formData, distance_from_start: e.target.value})} className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded text-white font-mono" />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Travel Time (mins)</label>
                  <input type="number" value={formData.estimated_arrival_time} onChange={e => setFormData({...formData, estimated_arrival_time: e.target.value})} className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded text-white font-mono" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-neutral-400 hover:text-white">Dismiss</button>
                <button type="submit" className="bg-amber-500 text-neutral-950 font-bold px-4 py-1.5 rounded hover:opacity-90">Save Checkpoint</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}