import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

// All available pages with their permission keys and display labels
const ALL_PAGES = [
  { key: "dashboard",             label: "Dashboard" },
  { key: "route-management",      label: "Route Management" },
  { key: "route-stop-management", label: "Route Stop Management" },
  { key: "bus-management",        label: "Bus Assets Log" },
  { key: "user-management",       label: "User Accounts" },
  { key: "role-management",       label: "Role Boundaries" },
  { key: "depot-management",      label: "Depot Terminals" },
  { key: "driver-management",     label: "Driver Roster Profiles" },
  { key: "driver-assignment",     label: "Shift Assignments" },
  { key: "vehicle-assignment",    label: "🚌 Vehicle Assignments" },
  { key: "schedule-management",   label: "Schedule Management" },
  { key: "create-recurring",      label: "Create Recurring Schedules" },
  { key: "trip-management",       label: "Trip Management" },
  { key: "fuel-management",       label: "⛽ Fuel Log" },
  { key: "maintenance-management","label": "🔧 Maintenance Log" },
  { key: "reports-analytics",     label: "📊 Reports & Analytics" },
  { key: "settings",              label: "⚙️ Settings" },
];

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [alertConfig, setAlertConfig] = useState({ isOpen: false, message: "", type: "success" });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("create"); // 'create' | 'edit' | 'view'
  const [formData, setFormData] = useState({ role_id: "", role_name: "", description: "" });

  // Permissions panel state
  const [permissionsPanel, setPermissionsPanel] = useState(null); // { role_id, role_name, permissions: [] }
  const [savingPermissions, setSavingPermissions] = useState(false);

  const showAlert = (message, type = "success") => {
    setAlertConfig({ isOpen: true, message, type });
    setTimeout(() => setAlertConfig((prev) => ({ ...prev, isOpen: false })), 4500);
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/roles");
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setRoles(data);
      } else {
        setRoles([]);
        showAlert(data.error || "Received invalid format from roles registry API.", "error");
      }
    } catch (error) {
      setRoles([]);
      showAlert("Could not connect to backend roles service layer.", "error");
    }
  };

  useEffect(() => { fetchRoles(); }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const isCreate = modalType === "create";
      const url = isCreate
        ? "http://localhost:5000/api/roles"
        : `http://localhost:5000/api/roles/${formData.role_id}`;

      const response = await fetch(url, {
        method: isCreate ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (response.ok) {
        showAlert(result.message || "System roles database updated successfully!", "success");
        setIsModalOpen(false);
        fetchRoles();
      } else {
        showAlert("Error: " + (result.error || "Unable to save role properties."), "error");
      }
    } catch (error) {
      showAlert("Submission Error: " + error.message, "error");
    }
  };

  // Open the permissions panel for a role
  const openPermissions = async (role) => {
    try {
      const res = await fetch(`http://localhost:5000/api/roles/${role.role_id}/permissions`);
      const data = await res.json();
      setPermissionsPanel({
        role_id: role.role_id,
        role_name: role.role_name,
        permissions: data.permissions || [],
      });
    } catch {
      showAlert("Failed to load permissions for this role.", "error");
    }
  };

  // Toggle a page key in the permissions panel
  const togglePermission = (key) => {
    setPermissionsPanel((prev) => {
      const exists = prev.permissions.includes(key);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== key)
          : [...prev.permissions, key],
      };
    });
  };

  // Select all or clear all
  const setAllPermissions = (all) => {
    setPermissionsPanel((prev) => ({
      ...prev,
      permissions: all ? ALL_PAGES.map((p) => p.key) : [],
    }));
  };

  // Save permissions to backend
  const savePermissions = async () => {
    setSavingPermissions(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/roles/${permissionsPanel.role_id}/permissions`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissions: permissionsPanel.permissions }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        showAlert(`Permissions saved for role "${permissionsPanel.role_name}" successfully!`, "success");
        setPermissionsPanel(null);
      } else {
        showAlert("Error saving permissions: " + (data.error || "Unknown error"), "error");
      }
    } catch {
      showAlert("Network error saving permissions.", "error");
    } finally {
      setSavingPermissions(false);
    }
  };

  const filteredRoles = Array.isArray(roles)
    ? roles.filter(
        (role) =>
          (role.role_name && role.role_name.toLowerCase().includes(search.toLowerCase())) ||
          (role.description && role.description.toLowerCase().includes(search.toLowerCase()))
      )
    : [];

  const openModal = (type, role = null) => {
    setModalType(type);
    setFormData(role ? role : { role_id: "", role_name: "", description: "" });
    setIsModalOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white overflow-x-hidden relative">

      {/* Notification Layer */}
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
              {alertConfig.type === "success" ? "Security Success" : "Authorization Alert"}
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">{alertConfig.message}</p>
          </div>
          <button onClick={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))} className="text-neutral-500 hover:text-white transition-colors">
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
              <h1 className="text-2xl font-bold tracking-wide">Access Control Roles</h1>
              <p className="text-sm text-neutral-400">Define roles and assign page-level permissions to each role</p>
            </div>
            <button onClick={() => openModal("create")} className="bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold px-5 py-2.5 rounded-lg text-sm shadow-md tracking-wide hover:opacity-90 transition-opacity">
              + Configure New Role
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-900 p-4 rounded-xl border border-neutral-800">
            <input type="text" placeholder="Search by role name or description..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none text-sm placeholder-neutral-500" />
            <div className="text-xs text-neutral-400 flex items-center justify-end font-mono">
              Active Roles: {filteredRoles.length}
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-950 text-amber-500 text-xs font-semibold uppercase border-b border-neutral-800 tracking-wider">
                    <th className="p-4">Role ID</th>
                    <th className="p-4">Role Name</th>
                    <th className="p-4">Description</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50 text-sm">
                  {filteredRoles.map((role) => (
                    <tr key={role.role_id} className="hover:bg-neutral-800/20 transition-colors">
                      <td className="p-4 text-neutral-500 font-mono">#{role.role_id}</td>
                      <td className="p-4 font-mono font-medium text-amber-400 tracking-wide">
                        <span className="px-2 py-1 rounded bg-amber-500/5 border border-amber-500/10 text-xs">
                          {role.role_name}
                        </span>
                      </td>
                      <td className="p-4 text-neutral-300 max-w-xs truncate">{role.description || "—"}</td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        <button onClick={() => openModal("view", role)} className="text-xs text-neutral-400 hover:text-white px-2 py-1 rounded bg-neutral-950 border border-neutral-800 transition-colors">View</button>
                        <button onClick={() => openModal("edit", role)} className="text-xs text-amber-500 hover:text-amber-400 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 transition-colors">Edit</button>
                        <button onClick={() => openPermissions(role)} className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 transition-colors">
                          🔑 Permissions
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredRoles.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-neutral-500 tracking-wide">
                        No roles found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Role Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-5 capitalize tracking-wide border-b border-neutral-800 pb-3">
              {modalType} Role
            </h2>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Role Name</label>
                <input type="text" disabled={modalType === "view"} required placeholder="e.g., LOGISTICS_MANAGER" value={formData.role_name || ""} onChange={(e) => setFormData({ ...formData, role_name: e.target.value })} className="w-full px-4 py-2 text-sm font-mono uppercase bg-neutral-950 border border-neutral-800 rounded-lg text-white disabled:opacity-50 focus:ring-1 focus:ring-amber-500 focus:outline-none placeholder-neutral-700" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Description</label>
                <textarea rows="4" disabled={modalType === "view"} placeholder="Describe this role's responsibilities..." value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white disabled:opacity-50 focus:ring-1 focus:ring-amber-500 focus:outline-none resize-none placeholder-neutral-700" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-lg hover:text-white transition-colors">Cancel</button>
                {modalType !== "view" && (
                  <button type="submit" className="bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold px-5 py-2 rounded-lg text-sm shadow-md hover:opacity-90 transition-opacity">
                    Save Role
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permissions Panel Modal */}
      {permissionsPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white tracking-wide">Page Permissions</h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Role: <span className="text-amber-400 font-mono">{permissionsPanel.role_name}</span>
                  &nbsp;·&nbsp;
                  <span className="text-neutral-300">{permissionsPanel.permissions.length} of {ALL_PAGES.length} pages allowed</span>
                </p>
              </div>
              <button onClick={() => setPermissionsPanel(null)} className="text-neutral-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Quick-select buttons */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => setAllPermissions(true)} className="text-xs px-3 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                ✓ Select All
              </button>
              <button onClick={() => setAllPermissions(false)} className="text-xs px-3 py-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors">
                ✕ Clear All
              </button>
              <span className="ml-auto text-xs text-neutral-500 flex items-center">
                Unchecked pages will show "Access Denied"
              </span>
            </div>

            {/* Scrollable page list */}
            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {ALL_PAGES.map((page) => {
                const checked = permissionsPanel.permissions.includes(page.key);
                return (
                  <label
                    key={page.key}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer border transition-all ${
                      checked
                        ? "bg-amber-500/5 border-amber-500/20 text-white"
                        : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePermission(page.key)}
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                    <span className="text-sm font-medium">{page.label}</span>
                    <span className="ml-auto text-xs font-mono text-neutral-600">{page.key}</span>
                  </label>
                );
              })}
            </div>

            {/* Save button */}
            <div className="mt-4 pt-4 border-t border-neutral-800 flex justify-end gap-3">
              <button onClick={() => setPermissionsPanel(null)} className="px-4 py-2 text-sm text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-lg hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={savePermissions}
                disabled={savingPermissions}
                className="bg-gradient-to-r from-amber-500 to-amber-600 disabled:from-neutral-700 disabled:to-neutral-800 text-neutral-950 font-bold px-5 py-2 rounded-lg text-sm shadow-md hover:opacity-90 transition-opacity"
              >
                {savingPermissions ? "Saving..." : "Save Permissions"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
