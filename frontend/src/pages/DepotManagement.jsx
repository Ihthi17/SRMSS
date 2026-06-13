import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

export default function DepotManagement() {
  const [depots, setDepots] = useState([]); 
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(5);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Responsive Alert State Engine
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    message: "",
    type: "success", // 'success' | 'error' | 'warning'
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("create");
  const [formData, setFormData] = useState({
    depot_id: "", depot_name: "", location: "", contact_person: "", contact_phone: "", email: "", address: ""
  });

  // Helper to trigger custom responsive alert
  const showAlert = (message, type = "success") => {
    setAlertConfig({ isOpen: true, message, type });
    // Automatically dismiss alert banner after 4.5 seconds
    setTimeout(() => {
      setAlertConfig((prev) => ({ ...prev, isOpen: false }));
    }, 4500);
  };

  const fetchDepots = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/depots");
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setDepots(data);
      } else {
        console.error("Backend did not return an array:", data);
        setDepots([]); 
        showAlert(data.error || "Received invalid format from backend.", "error");
      }
    } catch (error) {
      console.error("Error connecting to backend:", error);
      setDepots([]); 
      showAlert("Could not sync with backend infrastructure server systems.", "error");
    }
  };

  useEffect(() => {
    fetchDepots();
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const isCreate = modalType === "create";
      const url = isCreate 
        ? "http://localhost:5000/api/depots" 
        : `http://localhost:5000/api/depots/${formData.depot_id}`;
      
      const response = await fetch(url, {
        method: isCreate ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        showAlert(result.message || "Depot operations saved successfully!", "success");
        setIsModalOpen(false);
        fetchDepots(); 
      } else {
        showAlert("Error: " + (result.error || "Failed to update database record"), "error");
      }
    } catch (error) {
      showAlert("Submission Error: " + error.message, "error");
    }
  };

  const handleDelete = async (id) => {
    // Custom responsive implementation can replace confirm if needed later, keeping standard check safe
    if (!window.confirm("Are you sure you want to delete this depot infrastructure log?")) return;
    try {
      const response = await fetch(`http://localhost:5000/api/depots/${id}`, {
        method: "DELETE"
      });
      const result = await response.json();

      if (response.ok) {
        showAlert(result.message || "Depot configuration profile deleted successfully.", "success");
        fetchDepots();
      } else {
        showAlert("Failed to delete: " + (result.error || "Database constrained link deletion rejected"), "error");
      }
    } catch (error) {
      showAlert("Delete Error: " + error.message, "error");
    }
  };

  const filteredDepots = Array.isArray(depots) 
    ? depots.filter((depot) => {
        return (depot.depot_name && depot.depot_name.toLowerCase().includes(search.toLowerCase())) || 
               (depot.location && depot.location.toLowerCase().includes(search.toLowerCase())) ||
               (depot.contact_person && depot.contact_person.toLowerCase().includes(search.toLowerCase()));
      })
    : [];

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredDepots.slice(indexOfFirstRecord, indexOfLastRecord);

  const openModal = (type, depot = null) => {
    setModalType(type);
    if (depot) {
      setFormData(depot);
    } else {
      setFormData({ depot_id: "", depot_name: "", location: "", contact_person: "", contact_phone: "", email: "", address: "" });
    }
    setIsModalOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white overflow-x-hidden relative">
      
      {/* 🔔 Premium Responsive Alert Notification Toast Layer */}
      {alertConfig.isOpen && (
        <div className="fixed top-5 right-5 z-[100] max-w-sm w-[90%] sm:w-full bg-neutral-900 border rounded-xl shadow-2xl p-4 animate-fade-in-down transition-all duration-300 flex items-start gap-3 border-neutral-800">
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
            <h3 className="text-sm font-bold capitalize text-white tracking-wide">
              {alertConfig.type === "success" ? "System Notification" : "Operational Alert"}
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">{alertConfig.message}</p>
          </div>
          <button onClick={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} className="text-neutral-500 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      <Sidebar isOpen={isSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} onLogout={() => window.location.href = "/"} />
        
        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-wide">Depot Infrastructure Logs</h1>
              <p className="text-sm text-neutral-400">Configure corporate logistics hubs, stations, and local management contacts</p>
            </div>
            <button onClick={() => openModal("create")} className="bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold px-5 py-2.5 rounded-lg text-sm shadow-md tracking-wide hover:opacity-90 transition-opacity">
              + Register New Depot
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-900 p-4 rounded-xl border border-neutral-800">
            <input type="text" placeholder="Search by name, transit city location, or supervisor..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none text-sm placeholder-neutral-500" />
            <div className="text-xs text-neutral-400 flex items-center justify-end font-mono">
              Total Found: {filteredDepots.length} records
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-950 text-amber-500 text-xs font-semibold uppercase border-b border-neutral-800 tracking-wider">
                    <th className="p-4">Depot ID</th>
                    <th className="p-4">Station / Hub Name</th>
                    <th className="p-4">City Location</th>
                    <th className="p-4">Supervisor Contact</th>
                    <th className="p-4">Telephone Line</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50 text-sm">
                  {currentRecords.map((depot) => (
                    <tr key={depot.depot_id} className="hover:bg-neutral-850/30 transition-colors">
                      <td className="p-4 text-neutral-500 font-mono">#{depot.depot_id}</td>
                      <td className="p-4 font-medium text-white">{depot.depot_name}</td>
                      <td className="p-4 text-neutral-300">{depot.location || "—"}</td>
                      <td className="p-4 text-neutral-300">{depot.contact_person || "—"}</td>
                      <td className="p-4 text-neutral-400 font-mono">{depot.contact_phone || "—"}</td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        <button onClick={() => openModal("view", depot)} className="text-xs text-neutral-400 hover:text-white px-2 py-1 rounded bg-neutral-950 border border-neutral-800 transition-colors">View</button>
                        <button onClick={() => openModal("edit", depot)} className="text-xs text-amber-500 hover:text-amber-400 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 transition-colors">Edit</button>
                        <button onClick={() => handleDelete(depot.depot_id)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-500/10 border border-red-500/20 transition-colors">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {currentRecords.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-neutral-500 tracking-wide">
                        No depot locations matching configuration records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-5 capitalize tracking-wide border-b border-neutral-800 pb-3">{modalType} Depot Profile</h2>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              
              <div>
                <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Depot Hub Name</label>
                <input type="text" disabled={modalType === "view"} required value={formData.depot_name || ""} onChange={(e) => setFormData({...formData, depot_name: e.target.value})} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white disabled:opacity-50 focus:ring-1 focus:ring-amber-500 focus:outline-none" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">City Location</label>
                  <input type="text" disabled={modalType === "view"} required value={formData.location || ""} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white disabled:opacity-50 focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Contact Email</label>
                  <input type="email" disabled={modalType === "view"} value={formData.email || ""} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white disabled:opacity-50 focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Contact Person Name</label>
                  <input type="text" disabled={modalType === "view"} value={formData.contact_person || ""} onChange={(e) => setFormData({...formData, contact_person: e.target.value})} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white disabled:opacity-50 focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Contact Telephone</label>
                  <input type="text" disabled={modalType === "view"} value={formData.contact_phone || ""} onChange={(e) => setFormData({...formData, contact_phone: e.target.value})} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white disabled:opacity-50 focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Physical Street Address</label>
                <textarea rows="3" disabled={modalType === "view"} value={formData.address || ""} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white disabled:opacity-50 focus:ring-1 focus:ring-amber-500 focus:outline-none resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-lg hover:text-white transition-colors">Close</button>
                {modalType !== "view" && <button type="submit" className="bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold px-5 py-2 rounded-lg text-sm shadow-md hover:opacity-90 transition-opacity">Save Depot</button>}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}