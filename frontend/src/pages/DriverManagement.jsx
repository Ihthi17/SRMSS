import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import axios from "axios";

export default function DriverManagement() {
  const [drivers, setDrivers] = useState([]);
  const [depots, setDepots] = useState([]); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter States for Dates
  const [licenseExpiryFilter, setLicenseExpiryFilter] = useState("");
  const [dobFilter, setDobFilter] = useState("");

  // Clean UI Alert Banner State
  const [alertMessage, setAlertMessage] = useState(null);

  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false); // 🌟 Added View Modal Toggle
  const [editingDriverId, setEditingDriverId] = useState(null);
  const [viewingDriver, setViewingDriver] = useState(null); // 🌟 Active inspection container
  
  const [formData, setFormData] = useState({
    depot_id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    license_number: "",
    license_expiry_date: "",
    date_of_birth: "",
    address: "",
    is_available: 1, 
  });

  useEffect(() => {
    fetchDrivers();
    fetchDepots();
  }, []);

  const showAlert = (msg, type = "success") => {
    setAlertMessage({ text: msg, type });
    setTimeout(() => setAlertMessage(null), 4000);
  };

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/api/drivers");
      if (Array.isArray(res.data)) setDrivers(res.data);
    } catch (err) {
      console.error("Error fetching drivers:", err);
      showAlert("Error pulling driver data index file", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepots = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/depots");
      if (Array.isArray(res.data)) setDepots(res.data);
    } catch (err) {
      console.error("Error fetching depots:", err);
    }
  };

  const handleToggleStatus = async (driver) => {
    const updatedStatus = driver.is_available === 1 ? 0 : 1;
    try {
      setDrivers(prev => prev.map(d => d.driver_id === driver.driver_id ? { ...d, is_available: updatedStatus } : d));
      await axios.put(`http://localhost:5000/api/drivers/${driver.driver_id}`, {
        is_available: updatedStatus
      });
      showAlert(`Driver status marked ${updatedStatus ? "Active" : "Inactive"} successfully.`);
    } catch (err) {
      setDrivers(prev => prev.map(d => d.driver_id === driver.driver_id ? { ...d, is_available: driver.is_available } : d));
      showAlert("Failed to switch driver availability status", "error");
    }
  };

  const handleAddClick = () => {
    setEditingDriverId(null);
    setFormData({
      depot_id: "",
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
      license_number: "",
      license_expiry_date: "",
      date_of_birth: "",
      address: "",
      is_available: 1,
    });
    setIsModalOpen(true);
  };

  // 🌟 View Action Trigger Handler
  const handleViewClick = (driver) => {
    const matchingDepot = depots.find(dep => String(dep.depot_id) === String(driver.depot_id));
    setViewingDriver({
      ...driver,
      depot_name: matchingDepot ? matchingDepot.depot_name : `Depot #${driver.depot_id}`
    });
    setIsViewModalOpen(true);
  };

  const handleEditClick = (driver) => {
    setEditingDriverId(driver.driver_id);
    setFormData({
      depot_id: driver.depot_id || "",
      first_name: driver.first_name || "",
      last_name: driver.last_name || "",
      email: driver.email || "",
      phone_number: driver.phone_number || "",
      license_number: driver.license_number || "",
      license_expiry_date: driver.license_expiry_date ? driver.license_expiry_date.split("T")[0] : "",
      date_of_birth: driver.date_of_birth ? driver.date_of_birth.split("T")[0] : "",
      address: driver.address || "",
      is_available: driver.is_available,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDriverId) {
        await axios.put(`http://localhost:5000/api/drivers/${editingDriverId}`, formData);
        showAlert("Driver profile modified successfully");
      } else {
        await axios.post("http://localhost:5000/api/drivers", formData);
        showAlert("New driver profile created successfully");
      }
      setIsModalOpen(false);
      fetchDrivers();
    } catch (err) {
      showAlert(err.response?.data?.message || "Operation failed", "error");
    }
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this driver?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/drivers/${id}`);
      showAlert("Driver cleared from database ecosystem");
      fetchDrivers();
    } catch (err) {
      showAlert("Failed to delete driver file", "error");
    }
  };

  const filteredDrivers = drivers.filter((d) => {
    const matchesSearch = `${d.first_name} ${d.last_name} ${d.license_number}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    const driverExpiryStr = d.license_expiry_date ? d.license_expiry_date.split("T")[0] : "";
    const driverDobStr = d.date_of_birth ? d.date_of_birth.split("T")[0] : "";

    const matchesExpiry = licenseExpiryFilter ? driverExpiryStr.includes(licenseExpiryFilter) : true;
    const matchesDob = dobFilter ? driverDobStr.includes(dobFilter) : true;

    return matchesSearch && matchesExpiry && matchesDob;
  });

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white overflow-x-hidden font-sans">
      <Sidebar isOpen={isSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          onLogout={() => { localStorage.removeItem("token"); window.location.href = "/login"; }}
        />

        {alertMessage && (
          <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold tracking-wide shadow-2xl transition-all duration-300 ${
            alertMessage.type === "error" 
              ? "bg-rose-500/10 border-rose-500/30 text-rose-400" 
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          }`}>
            <span className={`w-2 h-2 rounded-full ${alertMessage.type === "error" ? "bg-rose-500" : "bg-emerald-500"}`}></span>
            {alertMessage.text}
          </div>
        )}

        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-wide text-white">Driver Management</h1>
              <p className="text-sm text-neutral-400">Manage compliance license records and route availability rosters</p>
            </div>
            <button
              onClick={handleAddClick}
              className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-semibold px-4 py-2.5 rounded-lg text-sm transition-all shadow-md tracking-wide active:scale-[0.98]"
            >
              + Register Driver
            </button>
          </div>

          {/* Filter Workspace Row Container */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-neutral-900 p-4 border border-neutral-800 rounded-xl">
            <div>
              <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Search Parameters</label>
              <input
                type="text"
                placeholder="Search driver name or license..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 font-mono"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-amber-500 uppercase tracking-wider">License Expiry Filter</label>
                {licenseExpiryFilter && (
                  <button onClick={() => setLicenseExpiryFilter("")} className="text-[11px] text-neutral-500 hover:text-amber-400 font-mono">Clear</button>
                )}
              </div>
              <input
                type="date"
                value={licenseExpiryFilter}
                onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                onChange={(e) => setLicenseExpiryFilter(e.target.value)}
                className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 font-mono custom-date-input"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-amber-500 uppercase tracking-wider">Date of Birth Filter</label>
                {dobFilter && (
                  <button onClick={() => setDobFilter("")} className="text-[11px] text-neutral-500 hover:text-amber-400 font-mono">Clear</button>
                )}
              </div>
              <input
                type="date"
                value={dobFilter}
                onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                onChange={(e) => setDobFilter(e.target.value)}
                className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 font-mono custom-date-input"
              />
            </div>
          </div>

          {/* 🌟 Core Rendered Datatable Element Workspace */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-950/60 border-b border-neutral-800 text-xs font-semibold text-amber-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">License Details</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Status / Availability</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50 text-sm text-neutral-300">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="text-center py-12 font-mono text-neutral-500 animate-pulse">Loading driver database...</td>
                    </tr>
                  ) : filteredDrivers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-12 font-mono text-neutral-500">No matching drivers found.</td>
                    </tr>
                  ) : (
                    filteredDrivers.map((driver) => (
                      <tr key={driver.driver_id} className="hover:bg-neutral-850/40 transition-colors">
                        <td className="px-6 py-4 font-semibold text-white">
                          {driver.first_name} {driver.last_name}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">
                          <div className="text-white font-bold">{driver.license_number}</div>
                          <div className="text-neutral-400 mt-0.5">Expires: {driver.license_expiry_date ? driver.license_expiry_date.split("T")[0] : "N/A"}</div>
                          <div className="text-neutral-500 text-[11px]">DOB: {driver.date_of_birth ? driver.date_of_birth.split("T")[0] : "N/A"}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-neutral-300 font-mono">{driver.phone_number || "—"}</div>
                          <div className="text-xs text-neutral-500 mt-0.5 max-w-[180px] truncate">{driver.email || "—"}</div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(driver)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                driver.is_available ? "bg-emerald-500" : "bg-neutral-700"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  driver.is_available ? "translate-x-5" : "translate-x-0"
                                }`}
                              />
                            </button>
                            <span className={`text-xs font-bold font-mono ${driver.is_available ? "text-emerald-400" : "text-neutral-500"}`}>
                              {driver.is_available ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </div>
                        </td>

                        {/* 🌟 Actions Interface Layout Segment */}
                        <td className="px-6 py-4 text-center space-x-3 whitespace-nowrap">
                          <button
                            onClick={() => handleViewClick(driver)}
                            className="text-sky-400 hover:text-sky-300 font-semibold text-xs tracking-wider uppercase transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleEditClick(driver)}
                            className="text-amber-500 hover:text-amber-400 font-semibold text-xs tracking-wider uppercase transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(driver.driver_id)}
                            className="text-neutral-500 hover:text-rose-400 font-semibold text-xs tracking-wider uppercase transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 Read-Only Inspection Modal Window */}
      {isViewModalOpen && viewingDriver && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white tracking-wide">
                  🔎 Driver File Record
                </h3>
                <p className="text-xs font-mono text-amber-500 mt-0.5">ID: {viewingDriver.driver_id}</p>
              </div>
              <span className={`px-2.5 py-1 rounded text-xs font-bold font-mono tracking-wide ${
                viewingDriver.is_available ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-neutral-800 text-neutral-400"
              }`}>
                {viewingDriver.is_available ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-850">
                <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wide mb-1">Full Name</div>
                <div className="text-white font-medium">{viewingDriver.first_name} {viewingDriver.last_name}</div>
              </div>
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-850">
                <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wide mb-1">Assigned Depot</div>
                <div className="text-white font-medium font-mono">{viewingDriver.depot_name || "Unassigned"}</div>
              </div>
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-850">
                <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wide mb-1">License Number</div>
                <div className="text-amber-400 font-mono font-bold">{viewingDriver.license_number}</div>
              </div>
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-850">
                <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wide mb-1">License Expiry</div>
                <div className="text-white font-mono">{viewingDriver.license_expiry_date ? viewingDriver.license_expiry_date.split("T")[0] : "—"}</div>
              </div>
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-850">
                <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wide mb-1">Phone Field</div>
                <div className="text-white font-mono">{viewingDriver.phone_number || "—"}</div>
              </div>
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-850">
                <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wide mb-1">Date of Birth</div>
                <div className="text-white font-mono">{viewingDriver.date_of_birth ? viewingDriver.date_of_birth.split("T")[0] : "—"}</div>
              </div>
            </div>

            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-850 text-sm">
              <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wide mb-1">Email Address</div>
              <div className="text-white font-mono truncate">{viewingDriver.email || "—"}</div>
            </div>

            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-850 text-sm">
              <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wide mb-1">Registered Home Address</div>
              <div className="text-neutral-300 leading-relaxed whitespace-pre-wrap">{viewingDriver.address || "No custom text data address logged."}</div>
            </div>

            <div className="flex justify-end pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-bold tracking-wide uppercase transition-colors"
              >
                Dismiss View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Write Action Modification Popup Interface Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-bold text-white mb-4 tracking-wide border-b border-neutral-800 pb-3">
              {editingDriverId ? "✏️ Edit Driver Profile" : "📋 Register New Driver File"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">License Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.license_number}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">License Expiry *</label>
                  <input
                    type="date"
                    required
                    value={formData.license_expiry_date}
                    onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                    onChange={(e) => setFormData({ ...formData, license_expiry_date: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 font-mono selector-reset"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 font-mono selector-reset"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">Assigned Depot</label>
                  <select
                    value={formData.depot_id}
                    onChange={(e) => setFormData({ ...formData, depot_id: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 font-mono"
                  >
                    <option value="">Select a Depot</option>
                    {depots.map((depot) => (
                      <option key={depot.depot_id} value={depot.depot_id}>
                        {depot.depot_name || `Depot #${depot.depot_id}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-500 uppercase mb-1 tracking-wider">Home Address</label>
                <textarea
                  rows="2"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50 font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold rounded-lg text-sm transition-all shadow-md"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}