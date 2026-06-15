import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

export default function TripManagement() {
  const [trips, setTrips] = useState([]);
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);

  // CRUD form data
  const [schedules, setSchedules] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    message: "",
    type: "success",
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("view"); // "view", "create", "edit", "delete"
  const [selectedTrip, setSelectedTrip] = useState(null);
  
  // Form data for create/edit
  const [formData, setFormData] = useState({
    trip_id: "",
    schedule_id: "",
    vehicle_id: "",
    driver_id: "",
    trip_date: "",
    departure_time: "",
    arrival_time: "",
    actual_departure_time: "",
    actual_arrival_time: "",
    trip_status: "Scheduled",
    passengers_count: "",
    route_distance: "",
    fuel_consumed: ""
  });

  const showAlert = (message, type = "success") => {
    setAlertConfig({ isOpen: true, message, type });
    setTimeout(() => {
      setAlertConfig((prev) => ({ ...prev, isOpen: false }));
    }, 4500);
  };

  // Helper functions for time formatting
  const extractTime = (datetime) => {
    if (!datetime) return "";
    // Handle ISO format: "2026-06-15T18:30:00.000Z"
    if (datetime.includes('T')) {
      return datetime.split('T')[1].slice(0, 5);
    }
    // Handle regular datetime format: "2026-06-15 18:30:00"
    if (datetime.includes(' ')) {
      return datetime.split(' ')[1]?.slice(0, 5) || "";
    }
    // If it's already just time (HH:MM:SS)
    return datetime.slice(0, 5);
  };

  const extractDate = (datetime) => {
    if (!datetime) return new Date().toISOString().slice(0, 10);
    // Handle ISO format: "2026-06-15T18:30:00.000Z"
    if (datetime.includes('T')) {
      return datetime.split('T')[0];
    }
    // Handle regular datetime format: "2026-06-15 18:30:00"
    if (datetime.includes(' ')) {
      return datetime.split(' ')[0];
    }
    // If it's already just a date
    return datetime;
  };

  useEffect(() => {
    fetchTrips();
    fetchSchedules();
    fetchVehicles();
    fetchDrivers();
  }, []);

  useEffect(() => {
    let filtered = trips;

    if (search) {
      filtered = filtered.filter(trip => {
        const scheduleCode = trip.schedule_code ? trip.schedule_code.toLowerCase() : '';
        const routeName = trip.route_name ? trip.route_name.toLowerCase() : '';
        const busCode = trip.bus_code ? trip.bus_code.toLowerCase() : '';
        const driverName = trip.driver_name || (trip.driver_first_name || trip.driver_last_name) 
          ? `${trip.driver_first_name || ''} ${trip.driver_last_name || ''}`.toLowerCase() 
          : '';
        
        return scheduleCode.includes(search.toLowerCase()) ||
               routeName.includes(search.toLowerCase()) ||
               busCode.includes(search.toLowerCase()) ||
               driverName.includes(search.toLowerCase());
      });
    }

    if (statusFilter !== "All") {
      filtered = filtered.filter(trip => trip.trip_status === statusFilter);
    }

    setFilteredTrips(filtered);
    setCurrentPage(1);
  }, [trips, search, statusFilter]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:5000/api/trips");
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setTrips(data);
      } else {
        showAlert("Failed to load trips", "error");
      }
    } catch (error) {
      console.error("Error fetching trips:", error);
      showAlert("Could not connect to server", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/schedules");
      const data = await response.json();
      if (Array.isArray(data)) {
        setSchedules(data);
      }
    } catch (error) {
      console.error("Error fetching schedules:", error);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/buses");
      const data = await response.json();
      if (Array.isArray(data)) {
        setVehicles(data);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/drivers");
      const data = await response.json();
      if (Array.isArray(data)) {
        setDrivers(data);
      }
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  };

  const openModal = (type, trip = null) => {
    setModalType(type);
    setSelectedTrip(trip);
    
    if (type === "create") {
      setFormData({
        trip_id: "",
        schedule_id: "",
        vehicle_id: "",
        driver_id: "",
        trip_date: new Date().toISOString().slice(0, 10),
        departure_time: "",
        arrival_time: "",
        actual_departure_time: "",
        actual_arrival_time: "",
        trip_status: "Scheduled",
        passengers_count: "",
        route_distance: "",
        fuel_consumed: ""
      });
    } else if (type === "edit" && trip) {
      setFormData({
        trip_id: trip.trip_id || "",
        schedule_id: trip.schedule_id || "",
        vehicle_id: trip.vehicle_id || "",
        driver_id: trip.driver_id || "",
        trip_date: extractDate(trip.trip_date) || "",
        departure_time: extractTime(trip.departure_time),
        arrival_time: extractTime(trip.arrival_time),
        actual_departure_time: extractTime(trip.actual_departure_time),
        actual_arrival_time: extractTime(trip.actual_arrival_time),
        trip_status: trip.trip_status || "Scheduled",
        passengers_count: trip.passengers_count || "",
        route_distance: trip.route_distance || "",
        fuel_consumed: trip.fuel_consumed || ""
      });
    }
    
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const isCreate = modalType === "create";
      const url = isCreate 
        ? "http://localhost:5000/api/trips" 
        : `http://localhost:5000/api/trips/${formData.trip_id}`;
      
      // Helper function to convert TIME to DATETIME
      const formatTimeToDateTime = (date, time) => {
        if (!time) return null;
        return `${date} ${time}:00`;
      };
      
      const submitData = {
        schedule_id: parseInt(formData.schedule_id) || null,
        vehicle_id: parseInt(formData.vehicle_id) || null,
        driver_id: parseInt(formData.driver_id) || null,
        trip_date: formData.trip_date,
        departure_time: formatTimeToDateTime(formData.trip_date, formData.departure_time),
        arrival_time: formatTimeToDateTime(formData.trip_date, formData.arrival_time),
        actual_departure_time: formatTimeToDateTime(formData.trip_date, formData.actual_departure_time),
        actual_arrival_time: formatTimeToDateTime(formData.trip_date, formData.actual_arrival_time),
        trip_status: formData.trip_status,
        passengers_count: parseInt(formData.passengers_count) || null,
        route_distance: parseFloat(formData.route_distance) || null,
        fuel_consumed: parseFloat(formData.fuel_consumed) || null
      };

      const response = await fetch(url, {
        method: isCreate ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData)
      });

      const result = await response.json();

      if (response.ok) {
        showAlert(isCreate ? "Trip created successfully!" : "Trip updated successfully!", "success");
        setIsModalOpen(false);
        fetchTrips();
      } else {
        showAlert("Error: " + (result.error || "Failed to save trip"), "error");
      }
    } catch (error) {
      showAlert("Error: " + error.message, "error");
    }
  };

  const handleDelete = async () => {
    if (!selectedTrip) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/trips/${selectedTrip.trip_id}`, {
        method: "DELETE"
      });

      const result = await response.json();

      if (response.ok) {
        showAlert("Trip deleted successfully!", "success");
        setIsModalOpen(false);
        fetchTrips();
      } else {
        showAlert("Error: " + (result.error || "Failed to delete trip"), "error");
      }
    } catch (error) {
      showAlert("Error: " + error.message, "error");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'In Progress': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'Scheduled': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Delayed': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-neutral-400 bg-neutral-500/10 border-neutral-500/20';
    }
  };

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredTrips.slice(indexOfFirstRecord, indexOfLastRecord);

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white overflow-x-hidden relative">
      
      {alertConfig.isOpen && (
        <div className="fixed top-5 right-5 z-[100] max-w-sm w-[90%] sm:w-full bg-neutral-900 border rounded-xl shadow-2xl p-4 animate-fade-in-down transition-all duration-300 flex items-start gap-3 border-neutral-800">
          <div className="mt-0.5">
            {alertConfig.type === "success" ? (
              <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="p-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold capitalize text-white tracking-wide">
              {alertConfig.type === "success" ? "System Notification" : "Operational Alert"}
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">{alertConfig.message}</p>
          </div>
        </div>
      )}

      <Sidebar isOpen={isSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} onLogout={() => window.location.href = "/"} />
        
        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-wide">Trip Management</h1>
              <p className="text-sm text-neutral-400">Monitor and manage all transit trips in real-time</p>
            </div>
            <div className="flex gap-3">
              <button onClick={fetchTrips} className="bg-neutral-700 hover:bg-neutral-600 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
                🔄 Refresh
              </button>
              <button onClick={() => openModal("create")} className="bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold px-5 py-2.5 rounded-lg text-sm shadow-md tracking-wide hover:opacity-90 transition-opacity">
                + Create Trip
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-neutral-900 p-4 rounded-xl border border-neutral-800">
            <input 
              type="text" 
              placeholder="Search by schedule, route, bus, driver..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="sm:col-span-2 px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none text-sm placeholder-neutral-500" 
            />
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none text-sm"
            >
              <option>All</option>
              <option>Scheduled</option>
              <option>In Progress</option>
              <option>Completed</option>
              <option>Delayed</option>
            </select>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-950 text-amber-500 text-xs font-semibold uppercase border-b border-neutral-800 tracking-wider">
                    <th className="p-4">Trip ID</th>
                    <th className="p-4">Schedule</th>
                    <th className="p-4">Route</th>
                    <th className="p-4">Bus</th>
                    <th className="p-4">Driver</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Departure</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="p-8 text-center text-neutral-500">Loading trips...</td>
                    </tr>
                  ) : currentRecords.length > 0 ? (
                    currentRecords.map((trip) => {
                      const driverName = trip.driver_name || (trip.driver_first_name || trip.driver_last_name 
                        ? `${trip.driver_first_name || ''} ${trip.driver_last_name || ''}`.trim() 
                        : 'Unassigned');
                      return (
                      <tr key={trip.trip_id} className="hover:bg-neutral-850/30 transition-colors">
                        <td className="p-4 font-mono text-amber-400">#{trip.trip_id}</td>
                        <td className="p-4 font-medium">{trip.schedule_code || 'N/A'}</td>
                        <td className="p-4 text-neutral-300">{trip.route_name || 'N/A'}</td>
                        <td className="p-4 text-neutral-300">{trip.bus_code || 'N/A'}</td>
                        <td className="p-4 text-neutral-300">{driverName}</td>
                        <td className="p-4 text-neutral-400 font-mono">{extractDate(trip.trip_date) || 'N/A'}</td>
                        <td className="p-4 text-neutral-400 font-mono">{extractTime(trip.departure_time) || 'N/A'}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusColor(trip.trip_status)}`}>
                            {trip.trip_status || 'Unknown'}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button 
                            onClick={() => openModal("view", trip)} 
                            className="text-xs text-neutral-400 hover:text-white px-2 py-1 rounded bg-neutral-950 border border-neutral-800 transition-colors"
                          >
                            View
                          </button>
                          <button 
                            onClick={() => openModal("edit", trip)} 
                            className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 transition-colors"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => openModal("delete", trip)} 
                            className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-500/10 border border-red-500/20 transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                    })
                  ) : (
                    <tr>
                      <td colSpan="9" className="p-8 text-center text-neutral-500">No trips found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {filteredTrips.length > recordsPerPage && (
            <div className="flex justify-center gap-2">
              {Array.from({ length: Math.ceil(filteredTrips.length / recordsPerPage) }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    currentPage === page
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-6 capitalize tracking-wide border-b border-neutral-800 pb-3">
              {modalType === "view" ? "Trip Details" : 
               modalType === "create" ? "Create New Trip" : 
               modalType === "edit" ? "Edit Trip" : 
               "Delete Trip"}
            </h2>

            {modalType === "delete" ? (
              /* Delete Confirmation Modal */
              <div className="space-y-6">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <h3 className="text-lg font-bold text-red-400">Confirm Deletion</h3>
                      <p className="text-sm text-neutral-300 mt-1">
                        Are you sure you want to delete Trip #{selectedTrip?.trip_id}? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
                
                {selectedTrip && (
                  <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-neutral-500">Schedule:</span> <span className="text-white">{selectedTrip.schedule_code || 'N/A'}</span></div>
                      <div><span className="text-neutral-500">Route:</span> <span className="text-white">{selectedTrip.route_name || 'N/A'}</span></div>
                      <div><span className="text-neutral-500">Date:</span> <span className="text-white">{selectedTrip.trip_date || 'N/A'}</span></div>
                      <div><span className="text-neutral-500">Status:</span> <span className="text-white">{selectedTrip.trip_status || 'N/A'}</span></div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="px-5 py-2.5 text-sm text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-lg hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDelete}
                    className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-lg text-sm shadow-md hover:opacity-90 transition-opacity"
                  >
                    Delete Trip
                  </button>
                </div>
              </div>
            ) : modalType === "view" && selectedTrip ? (
              /* View Modal */
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-amber-500 mb-3">Basic Information</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-neutral-500">Trip ID:</span> <span className="text-white font-mono">#{selectedTrip.trip_id}</span></div>
                      <div><span className="text-neutral-500">Schedule:</span> <span className="text-white">{selectedTrip.schedule_code || 'N/A'}</span></div>
                      <div><span className="text-neutral-500">Route:</span> <span className="text-white">{selectedTrip.route_name || 'N/A'}</span></div>
                      <div><span className="text-neutral-500">Date:</span> <span className="text-white">{selectedTrip.trip_date || 'N/A'}</span></div>
                    </div>
                  </div>

                  <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-amber-500 mb-3">Resources</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-neutral-500">Bus:</span> <span className="text-white">{selectedTrip.bus_code || 'N/A'}</span></div>
                      <div><span className="text-neutral-500">Registration:</span> <span className="text-white font-mono">{selectedTrip.registration_number || 'N/A'}</span></div>
                      <div><span className="text-neutral-500">Driver:</span> <span className="text-white">{selectedTrip.driver_name || (selectedTrip.driver_first_name || selectedTrip.driver_last_name ? `${selectedTrip.driver_first_name || ''} ${selectedTrip.driver_last_name || ''}`.trim() : 'Unassigned')}</span></div>
                      <div><span className="text-neutral-500">Status:</span> 
                        <span className={`inline-flex items-center px-2 py-0.5 ml-2 rounded text-xs font-medium border ${getStatusColor(selectedTrip.trip_status)}`}>
                          {selectedTrip.trip_status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-amber-500 mb-3">Performance</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-neutral-500">Passengers:</span> <span className="text-white">{selectedTrip.passengers_count || '0'}</span></div>
                      <div><span className="text-neutral-500">Distance:</span> <span className="text-white">{selectedTrip.route_distance ? selectedTrip.route_distance + ' km' : 'N/A'}</span></div>
                      <div><span className="text-neutral-500">Fuel Used:</span> <span className="text-white">{selectedTrip.fuel_consumed ? selectedTrip.fuel_consumed + ' L' : 'N/A'}</span></div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-amber-500 mb-3">Planned Times</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-neutral-500">Departure:</span> <span className="text-white font-mono">{extractTime(selectedTrip.departure_time) || 'N/A'}</span></div>
                      <div><span className="text-neutral-500">Expected Arrival:</span> <span className="text-white font-mono">{extractTime(selectedTrip.arrival_time) || 'N/A'}</span></div>
                    </div>
                  </div>

                  <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-amber-500 mb-3">Actual Times</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-neutral-500">Actual Departure:</span> <span className="text-white font-mono">{extractTime(selectedTrip.actual_departure_time) || 'Not recorded'}</span></div>
                      <div><span className="text-neutral-500">Actual Arrival:</span> <span className="text-white font-mono">{extractTime(selectedTrip.actual_arrival_time) || 'Not recorded'}</span></div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="px-5 py-2.5 text-sm text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-lg hover:text-white transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (modalType === "create" || modalType === "edit") ? (
              /* Create/Edit Form Modal */
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Basic Information */}
                  <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-amber-500 mb-4">Basic Information</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Schedule</label>
                        <select 
                          value={formData.schedule_id}
                          onChange={(e) => setFormData({...formData, schedule_id: e.target.value})}
                          className="w-full px-3 py-2 text-sm bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                          required
                        >
                          <option value="">Select Schedule</option>
                          {schedules.map(schedule => (
                            <option key={schedule.schedule_id} value={schedule.schedule_id}>
                              {schedule.schedule_code} - {schedule.route_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Trip Date</label>
                        <input 
                          type="date"
                          value={formData.trip_date}
                          onChange={(e) => setFormData({...formData, trip_date: e.target.value})}
                          className="w-full px-3 py-2 text-sm bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Status</label>
                        <select 
                          value={formData.trip_status}
                          onChange={(e) => setFormData({...formData, trip_status: e.target.value})}
                          className="w-full px-3 py-2 text-sm bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        >
                          <option value="Scheduled">Scheduled</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Delayed">Delayed</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Resources */}
                  <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-amber-500 mb-4">Resources</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Vehicle/Bus</label>
                        <select 
                          value={formData.vehicle_id}
                          onChange={(e) => setFormData({...formData, vehicle_id: e.target.value})}
                          className="w-full px-3 py-2 text-sm bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        >
                          <option value="">Select Vehicle</option>
                          {vehicles.map(vehicle => (
                            <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                              {vehicle.bus_code} - {vehicle.registration_number}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Driver</label>
                        <select 
                          value={formData.driver_id}
                          onChange={(e) => setFormData({...formData, driver_id: e.target.value})}
                          className="w-full px-3 py-2 text-sm bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        >
                          <option value="">Select Driver</option>
                          {drivers.map(driver => (
                            <option key={driver.driver_id} value={driver.driver_id}>
                              {driver.first_name} {driver.last_name} - {driver.license_number}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-amber-500 mb-4">Metrics</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Passengers</label>
                        <input 
                          type="number"
                          min="0"
                          max="100"
                          value={formData.passengers_count}
                          onChange={(e) => setFormData({...formData, passengers_count: e.target.value})}
                          className="w-full px-3 py-2 text-sm bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Distance (km)</label>
                        <input 
                          type="number"
                          step="0.1"
                          min="0"
                          value={formData.route_distance}
                          onChange={(e) => setFormData({...formData, route_distance: e.target.value})}
                          className="w-full px-3 py-2 text-sm bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                          placeholder="0.0"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Fuel (Liters)</label>
                        <input 
                          type="number"
                          step="0.1"
                          min="0"
                          value={formData.fuel_consumed}
                          onChange={(e) => setFormData({...formData, fuel_consumed: e.target.value})}
                          className="w-full px-3 py-2 text-sm bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                          placeholder="0.0"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timing Section */}
                <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-amber-500 mb-4">Trip Timing</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Planned Departure</label>
                      <input 
                        type="time"
                        value={formData.departure_time}
                        onChange={(e) => setFormData({...formData, departure_time: e.target.value})}
                        className="w-full px-3 py-2 text-sm bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Planned Arrival</label>
                      <input 
                        type="time"
                        value={formData.arrival_time}
                        onChange={(e) => setFormData({...formData, arrival_time: e.target.value})}
                        className="w-full px-3 py-2 text-sm bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Actual Departure</label>
                      <input 
                        type="time"
                        value={formData.actual_departure_time}
                        onChange={(e) => setFormData({...formData, actual_departure_time: e.target.value})}
                        className="w-full px-3 py-2 text-sm bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Actual Arrival</label>
                      <input 
                        type="time"
                        value={formData.actual_arrival_time}
                        onChange={(e) => setFormData({...formData, actual_arrival_time: e.target.value})}
                        className="w-full px-3 py-2 text-sm bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-neutral-800">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="px-5 py-2.5 text-sm text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-lg hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold rounded-lg text-sm shadow-md hover:opacity-90 transition-opacity"
                  >
                    {modalType === "create" ? "Create Trip" : "Update Trip"}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}