import { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

export default function DriverManagement() {
  const [assignments, setAssignments] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("create");
  const [formData, setFormData] = useState({
    assignment_id: "", schedule_id: "", driver_id: "", assignment_date: "", shift_start_time: "", shift_end_time: "", status: "Pending"
  });

  // Custom searchable dropdown tracking parameters
  const [isDriverDropdownOpen, setIsDriverDropdownOpen] = useState(false);
  const [driverSearchQuery, setDriverSearchQuery] = useState("");
  const driverDropdownRef = useRef(null);

  const fetchAllData = async () => {
    try {
      const assignRes = await fetch("http://localhost:5000/api/assignments");
      const assignData = await assignRes.json();
      setAssignments(Array.isArray(assignData) ? assignData : assignData.data || []);

      // Pointing directly to your clean dropdown utility route endpoints
      const driversRes = await fetch("http://localhost:5000/api/assignments/drivers/selection");
      const driversData = await driversRes.json();
      setDrivers(Array.isArray(driversData) ? driversData : driversData.data || []);

      const schedulesRes = await fetch("http://localhost:5000/api/assignments/schedules/selection");
      const schedulesData = await schedulesRes.json();
      setSchedules(Array.isArray(schedulesData) ? schedulesData : schedulesData.data || []);
    } catch (error) {
      console.error("❌ Error loading operational dataset:", error);
      setAssignments([]);
      setDrivers([]);
      setSchedules([]);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Structural Click Interceptor layout handles closing search drop boxes dynamically
  useEffect(() => {
    function handleClickOutside(event) {
      if (driverDropdownRef.current && !driverDropdownRef.current.contains(event.target)) {
        setIsDriverDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const config = {
        method: modalType === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      };

      const url = modalType === "create" 
        ? "http://localhost:5000/api/assignments" 
        : `http://localhost:5000/api/assignments/${formData.assignment_id}`;

      const response = await fetch(url, config);
      const result = await response.json();

      if (response.ok) {
        alert(result.message || "Assignment scheduled successfully!");
        setIsModalOpen(false);
        fetchAllData();
      } else {
        alert("Error: " + (result.error || result.message));
      }
    } catch (error) {
      alert("Submission crashed: " + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Revoke this driver's assignment schedule row?")) return;
    try {
      const response = await fetch(`http://localhost:5000/api/assignments/${id}`, {
        method: "DELETE"
      });
      const result = await response.json();

      if (response.ok) {
        alert(result.message || "Assignment wiped clean.");
        fetchAllData();
      } else {
        alert("Error: " + (result.error || result.message));
      }
    } catch (error) {
      alert("Action crashed: " + error.message);
    }
  };

  const filteredAssignments = Array.isArray(assignments) 
    ? assignments.filter((item) => {
        const driverName = (item.driver_name || "").toLowerCase();
        const routeName = (item.route_name || "").toLowerCase();
        const matchesSearch = driverName.includes(search.toLowerCase()) || routeName.includes(search.toLowerCase());
        const matchesStatus = statusFilter === "" || item.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
    : [];

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredAssignments.slice(indexOfFirstRecord, indexOfLastRecord);

  // Helper utility to safely construct the display label parsing database name entries
  const getDriverDisplayName = (driver) => {
    if (!driver) return "";
    if (driver.driver_name) return driver.driver_name;
    if (driver.first_name || driver.last_name) {
      return `${driver.first_name || ""} ${driver.last_name || ""}`.trim();
    }
    const id = driver.driver_id || driver.id;
    return id ? `Driver ID #${id}` : "Unknown Driver";
  };

  // Dynamic evaluation parses live inputs inside custom dropdown selector modal layers
  const filteredDriversList = drivers.filter(d => {
    const nameStr = getDriverDisplayName(d).toLowerCase();
    const licenseStr = (d.license_number || "").toLowerCase();
    return nameStr.includes(driverSearchQuery.toLowerCase()) || licenseStr.includes(driverSearchQuery.toLowerCase());
  });

  // Display value calculation targets context strings safely
  const selectedDriverObject = drivers.find(d => String(d.driver_id || d.id) === String(formData.driver_id));
  const selectedDriverDisplayLabel = selectedDriverObject 
    ? getDriverDisplayName(selectedDriverObject)
    : "-- Choose Driver --";

  const openModal = (type, assignment = null) => {
    setModalType(type);
    setDriverSearchQuery("");
    setIsDriverDropdownOpen(false);

    if (assignment) {
      const formattedDate = assignment.assignment_date ? assignment.assignment_date.split("T")[0] : "";
      setFormData({ ...assignment, assignment_date: formattedDate });
    } else {
      const fallbackDriverId = drivers[0]?.driver_id || drivers[0]?.id || "";
      setFormData({
        assignment_id: "",
        schedule_id: schedules[0]?.schedule_id || "",
        driver_id: fallbackDriverId,
        assignment_date: "",
        shift_start_time: "08:00:00",
        shift_end_time: "16:00:00",
        status: "Pending"
      });
    }
    setIsModalOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white overflow-x-hidden">
      <Sidebar isOpen={isSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} onLogout={() => window.location.href = "/"} />
        
        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-wide">Driver Shift Assignments</h1>
              <p className="text-sm text-neutral-400">Map active logistics drivers into pre-configured timeline transit routes and shifts</p>
            </div>
            <button onClick={() => openModal("create")} className="bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold px-5 py-2.5 rounded-lg text-sm shadow-md tracking-wide hover:opacity-90 transition-opacity">
              + Dispatch Shift Assignment
            </button>
          </div>

          {/* Filtering Control Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-neutral-900 p-4 rounded-xl border border-neutral-800">
            <input type="text" placeholder="Search driver or route name..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none text-sm placeholder-neutral-500 text-white" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none text-sm text-neutral-300">
              <option value="">All Verification States</option>
              <option value="Pending">Pending</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <select value={recordsPerPage} onChange={(e) => setRecordsPerPage(Number(e.target.value))} className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none text-sm text-neutral-300">
              <option value={5}>5 Shifts / Page</option>
              <option value={10}>10 Shifts / Page</option>
            </select>
          </div>

          {/* Core Table Layout Frame */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-950 text-amber-500 text-xs font-semibold uppercase border-b border-neutral-800 tracking-wider">
                    <th className="p-4">Driver Pilot</th>
                    <th className="p-4">Route Info</th>
                    <th className="p-4">Target Date</th>
                    <th className="p-4">Shift Windows</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50 text-sm">
                  {currentRecords.map((item) => (
                    <tr key={item.assignment_id} className="hover:bg-neutral-850/30 transition-colors">
                      <td className="p-4 font-medium text-white">{item.driver_name || `Driver ID #${item.driver_id}`}</td>
                      <td className="p-4 text-neutral-300 font-mono">
                        {item.route_name ? `${item.route_name} [${item.bus_number || 'No Vehicle Assigned'}]` : `Schedule Plan #${item.schedule_id}`}
                      </td>
                      <td className="p-4 text-neutral-400 font-mono">
                        {item.assignment_date ? item.assignment_date.split("T")[0] : "—"}
                      </td>
                      <td className="p-4 text-neutral-300 font-mono text-xs">
                        {item.shift_start_time} - {item.shift_end_time}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border tracking-wide ${
                          item.status === "Active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          item.status === "Pending" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                          "bg-neutral-800 text-neutral-400 border-transparent"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        <button onClick={() => openModal("view", item)} className="text-xs text-neutral-400 hover:text-white px-2 py-1 rounded bg-neutral-950 border border-neutral-800 transition-colors">View</button>
                        <button onClick={() => openModal("edit", item)} className="text-xs text-amber-500 hover:text-amber-400 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 transition-colors">Edit</button>
                        <button onClick={() => handleDelete(item.assignment_id)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-500/10 border border-red-500/20 transition-colors">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {currentRecords.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center p-8 text-neutral-500 bg-neutral-950/40">No shift roster allocations found matching filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Roster Config Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-5 capitalize tracking-wide border-b border-neutral-800 pb-3">{modalType} Roster Shift Assignment</h2>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* ADVANCED SEARCHABLE CUSTOM DROPDOWN SELECTOR */}
                <div className="relative" ref={driverDropdownRef}>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Select Driver</label>
                  
                  <div
                    onClick={() => modalType !== "view" && setIsDriverDropdownOpen(!isDriverDropdownOpen)}
                    className={`w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white flex justify-between items-center cursor-pointer select-none ${
                      modalType === "view" ? "opacity-50 cursor-not-allowed" : "focus:ring-1 focus:ring-amber-500"
                    }`}
                  >
                    <span className={formData.driver_id ? "text-white" : "text-neutral-500"}>
                      {selectedDriverDisplayLabel}
                    </span>
                    <span className="text-neutral-500 text-xs">▼</span>
                  </div>

                  {isDriverDropdownOpen && modalType !== "view" && (
                    <div className="absolute z-50 w-full mt-1.5 bg-neutral-950 border border-neutral-800 rounded-lg shadow-2xl overflow-hidden flex flex-col">
                      
                      <div className="p-2 border-b border-neutral-800 bg-neutral-900">
                        <input
                          type="text"
                          placeholder="Type to filter drivers..."
                          value={driverSearchQuery}
                          onChange={(e) => setDriverSearchQuery(e.target.value)}
                          className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                          autoFocus
                        />
                      </div>

                      <div className="max-h-48 overflow-y-auto divide-y divide-neutral-900">
                        {filteredDriversList.length > 0 ? (
                          filteredDriversList.map((d) => {
                            const dId = d.driver_id || d.id;
                            const isSelected = String(dId) === String(formData.driver_id);
                            return (
                              <div
                                key={dId}
                                onClick={() => {
                                  setFormData({ ...formData, driver_id: dId });
                                  setIsDriverDropdownOpen(false);
                                  setDriverSearchQuery("");
                                }}
                                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors text-left ${
                                  isSelected 
                                    ? "bg-amber-500 text-neutral-950 font-semibold" 
                                    : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
                                }`}
                              >
                                {getDriverDisplayName(d)} {d.license_number ? `(${d.license_number})` : ""}
                              </div>
                            );
                          })
                        ) : (
                          <div className="px-4 py-3 text-xs text-neutral-500 text-center bg-neutral-950">
                            No active fleet drivers matched
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Select Route Schedule Plan</label>
                  <select disabled={modalType === "view"} value={formData.schedule_id || ""} onChange={(e) => setFormData({...formData, schedule_id: e.target.value})} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white disabled:opacity-50 focus:ring-1 focus:ring-amber-500 focus:outline-none">
                    <option value="" disabled>-- Choose Route/Schedule --</option>
                    {schedules.map(s => <option key={s.schedule_id} value={s.schedule_id}>{s.route_name ? `${s.route_name} (${s.schedule_code || s.schedule_id})` : `Plan #${s.schedule_id}`}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Assignment Date</label>
                  <input type="date" disabled={modalType === "view"} required value={formData.assignment_date || ""} onChange={(e) => setFormData({...formData, assignment_date: e.target.value})} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Shift Start Time</label>
                  <input type="time" step="1" disabled={modalType === "view"} required value={formData.shift_start_time || ""} onChange={(e) => setFormData({...formData, shift_start_time: e.target.value})} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white disabled:opacity-50 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Shift End Time</label>
                  <input type="time" step="1" disabled={modalType === "view"} required value={formData.shift_end_time || ""} onChange={(e) => setFormData({...formData, shift_end_time: e.target.value})} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white disabled:opacity-50 focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Operational Status State</label>
                <select disabled={modalType === "view"} value={formData.status || "Pending"} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-amber-500">
                  <option value="Pending">Pending</option>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-lg hover:text-white transition-colors">Close</button>
                {modalType !== "view" && <button type="submit" className="bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold px-5 py-2 rounded-lg text-sm shadow-md hover:opacity-90 transition-opacity">Save Shift Frame</button>}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}