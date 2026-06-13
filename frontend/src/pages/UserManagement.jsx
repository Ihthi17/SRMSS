import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [depots, setDepots] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("create");
  const [formData, setFormData] = useState({
    user_id: "", username: "", email: "", password: "", first_name: "", last_name: "", phone_number: "", role_id: "", depot_id: "", is_active: 1
  });

  const fetchAllData = async () => {
    try {
      const usersRes = await fetch("http://localhost:5000/api/users");
      const usersData = await usersRes.json();
      setUsers(usersData);

      const rolesRes = await fetch("http://localhost:5000/api/roles");
      const rolesData = await rolesRes.json();
      setRoles(rolesData);

      const depotsRes = await fetch("http://localhost:5000/api/depots");
      const depotsData = await depotsRes.json();
      setDepots(depotsData);
    } catch (error) {
      console.error("Error loading data:", error);
      alert("Failed to connect to backend api server.");
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // 🌟 FAST TOGGLE STATUS HANDLER (Changes activation state instantly from table grid)
  const handleToggleActiveStatus = async (user) => {
    const updatedStatus = user.is_active === 1 || user.is_active === true ? 0 : 1;
    
    // Optimistic UI change to make the button toggle look snappy
    setUsers(prevUsers => 
      prevUsers.map(u => u.user_id === user.user_id ? { ...u, is_active: updatedStatus } : u)
    );

    try {
      const response = await fetch(`http://localhost:5000/api/users/${user.user_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...user,
          is_active: updatedStatus
        })
      });

      if (!response.ok) {
        const result = await response.json();
        alert("Status update failed: " + result.error);
        fetchAllData(); // Rollback to actual DB values on failure
      }
    } catch (error) {
      alert("Network Error updating status: " + error.message);
      fetchAllData(); // Rollback
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const config = {
        method: modalType === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      };

      const url = modalType === "create" 
        ? "http://localhost:5000/api/users" 
        : `http://localhost:5000/api/users/${formData.user_id}`;

      const response = await fetch(url, config);
      const result = await response.json();

      if (response.ok) {
        alert(result.message || "User profile saved successfully!");
        setIsModalOpen(false);
        fetchAllData();
      } else {
        alert("Error: " + result.error);
      }
    } catch (error) {
      alert("Failed to submit data: " + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user profile?")) return;
    try {
      const response = await fetch(`http://localhost:5000/api/users/${id}`, {
        method: "DELETE"
      });
      const result = await response.json();

      if (response.ok) {
        alert(result.message || "User profile deleted.");
        fetchAllData();
      } else {
        alert("Error: " + result.error);
      }
    } catch (error) {
      alert("Failed to delete user: " + error.message);
    }
  };

  const filteredUsers = users.filter((user) => {
    const combinedName = `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase();
    const matchesSearch = (user.username && user.username.toLowerCase().includes(search.toLowerCase())) || 
                          combinedName.includes(search.toLowerCase()) ||
                          (user.phone_number && user.phone_number.includes(search));
    const matchesRole = roleFilter === "" || (user.role_id && user.role_id.toString() === roleFilter);
    return matchesSearch && matchesRole;
  });

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredUsers.slice(indexOfFirstRecord, indexOfLastRecord);

  const openModal = (type, user = null) => {
    setModalType(type);
    if (user) {
      setFormData({ ...user, password: "" });
    } else {
      setFormData({ 
        user_id: "", username: "", email: "", password: "", first_name: "", last_name: "", phone_number: "", 
        role_id: roles[0]?.role_id || "", depot_id: depots[0]?.depot_id || "", is_active: 1
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
              <h1 className="text-2xl font-bold tracking-wide">User Account Profiles</h1>
              <p className="text-sm text-neutral-400">Manage dashboard profiles, regional depot assignments, and system authorization roles</p>
            </div>
            <button onClick={() => openModal("create")} className="bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold px-5 py-2.5 rounded-lg text-sm shadow-md tracking-wide hover:opacity-90 transition-opacity">
              + Add New User
            </button>
          </div>

          {/* Search Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-neutral-900 p-4 rounded-xl border border-neutral-800">
            <input type="text" placeholder="Search name, username, phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none text-sm placeholder-neutral-500" />
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none text-sm text-neutral-300">
              <option value="">All Roles</option>
              {roles.map(r => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}
            </select>
            <select value={recordsPerPage} onChange={(e) => setRecordsPerPage(Number(e.target.value))} className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none text-sm text-neutral-300">
              <option value={5}>5 Per Page</option>
              <option value={10}>10 Per Page</option>
            </select>
          </div>

          {/* User Table Grid */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-950 text-amber-500 text-xs font-semibold uppercase border-b border-neutral-800 tracking-wider">
                    <th className="p-4">Full Name</th>
                    <th className="p-4">Username</th>
                    <th className="p-4">Assigned Depot</th>
                    <th className="p-4">Role Status</th>
                    <th className="p-4">Account Status</th> {/* 🌟 Title Adjusted */}
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50 text-sm">
                  {currentRecords.map((user) => {
                    const isActiveAccount = user.is_active === 1 || user.is_active === true;
                    return (
                      <tr key={user.user_id} className="hover:bg-neutral-850/30 transition-colors">
                        <td className="p-4 font-medium text-white">{user.first_name || user.last_name ? `${user.first_name || ""} ${user.last_name || ""}` : "—"}</td>
                        <td className="p-4 text-neutral-400 font-mono">{user.username}</td>
                        <td className="p-4 text-neutral-300">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {user.depot_name || `Depot #${user.depot_id}`}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 tracking-wide">
                            {user.role_name}
                          </span>
                        </td>
                        
                        {/* 🌟 ACCOUNT STATUS TOGGLE FIELD */}
                        <td className="p-4">
                          <button 
                            type="button"
                            onClick={() => handleToggleActiveStatus(user)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isActiveAccount ? "bg-emerald-500" : "bg-neutral-700"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                isActiveAccount ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </td>

                        <td className="p-4 text-right space-x-2 whitespace-nowrap">
                          <button onClick={() => openModal("view", user)} className="text-xs text-neutral-400 hover:text-white px-2 py-1 rounded bg-neutral-950 border border-neutral-800 transition-colors">View</button>
                          <button onClick={() => openModal("edit", user)} className="text-xs text-amber-500 hover:text-amber-400 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 transition-colors">Edit</button>
                          <button onClick={() => handleDelete(user.user_id)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-500/10 border border-red-500/20 transition-colors">Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-5 capitalize tracking-wide border-b border-neutral-800 pb-3">{modalType} User Profile</h2>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">First Name</label>
                  <input type="text" disabled={modalType === "view"} required value={formData.first_name || ""} onChange={(e) => setFormData({...formData, first_name: e.target.value})} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white disabled:opacity-50 focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Last Name</label>
                  <input type="text" disabled={modalType === "view"} required value={formData.last_name || ""} onChange={(e) => setFormData({...formData, last_name: e.target.value})} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white disabled:opacity-50 focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Username</label>
                  <input type="text" disabled={modalType === "view"} required value={formData.username || ""} onChange={(e) => setFormData({...formData, username: e.target.value})} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white disabled:opacity-50 focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Phone Number</label>
                  <input type="text" disabled={modalType === "view"} placeholder="+94771234567" value={formData.phone_number || ""} onChange={(e) => setFormData({...formData, phone_number: e.target.value})} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white disabled:opacity-50 focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Email Address</label>
                  <input type="email" disabled={modalType === "view"} required value={formData.email || ""} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white disabled:opacity-50 focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Assigned Depot</label>
                  <select disabled={modalType === "view"} value={formData.depot_id || ""} onChange={(e) => setFormData({...formData, depot_id: e.target.value})} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white disabled:opacity-50 focus:ring-1 focus:ring-amber-500 focus:outline-none">
                    {depots.map(d => <option key={d.depot_id} value={d.depot_id}>{d.depot_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Account Role</label>
                  <select disabled={modalType === "view"} value={formData.role_id || ""} onChange={(e) => setFormData({...formData, role_id: e.target.value})} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white disabled:opacity-50 focus:ring-1 focus:ring-amber-500 focus:outline-none">
                    {roles.map(r => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}
                  </select>
                </div>
              </div>

              {/* 🌟 INNER MODAL STATUS SELECTION (For view/edit modes) */}
              {modalType !== "create" && (
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Account Status</label>
                  <select 
                    disabled={modalType === "view"} 
                    value={formData.is_active === true || formData.is_active === 1 ? "1" : "0"} 
                    onChange={(e) => setFormData({...formData, is_active: Number(e.target.value)})} 
                    className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white disabled:opacity-50 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="1">Active</option>
                    <option value="0">Deactivated / Suspended</option>
                  </select>
                </div>
              )}

              {modalType === "create" && (
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Password</label>
                  <input type="password" required value={formData.password || ""} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-lg hover:text-white transition-colors">Close</button>
                {modalType !== "view" && <button type="submit" className="bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold px-5 py-2 rounded-lg text-sm shadow-md hover:opacity-90 transition-opacity">Save Profile</button>}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}