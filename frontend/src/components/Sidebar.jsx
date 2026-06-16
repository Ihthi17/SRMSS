import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";

// Master list of all sidebar navigation items and their permission keys
const ALL_NAV_ITEMS = [
  { to: "/dashboard",            label: "Dashboard",                  pageKey: "dashboard" },
  { to: "/routes",               label: "Route Management",           pageKey: "route-management" },
  { to: "/manage-route-stops",   label: "Route Stop Management",      pageKey: "route-stop-management" },
  { to: "/buses",                label: "Bus Assets Log",             pageKey: "bus-management" },
  { to: "/user",                 label: "User Accounts",              pageKey: "user-management" },
  { to: "/roles",                label: "Role Boundaries",            pageKey: "role-management" },
  { to: "/depots",               label: "Depot Terminals",            pageKey: "depot-management" },
  { to: "/driver-management",    label: "Driver Roster Profiles",     pageKey: "driver-management" },
  { to: "/driver-assignment",    label: "Shift Assignments",          pageKey: "driver-assignment" },
  { to: "/vehicle-assignment",   label: " Vehicle Assignments",      pageKey: "vehicle-assignment" },
  { to: "/schedule-management",  label: "Schedule Management",        pageKey: "schedule-management" },
  { to: "/create-recurring",     label: "Create Recurring Schedules", pageKey: "create-recurring" },
  { to: "/trip-management",      label: "Trip Management",            pageKey: "trip-management" },
  { to: "/fuel-management",      label: " Fuel Log",               pageKey: "fuel-management" },
  { to: "/maintenance-management", label: " Maintenance Log",      pageKey: "maintenance-management" },
  { to: "/reports-analytics",    label: " Reports & Analytics",    pageKey: "reports-analytics" },
  { to: "/settings",             label: " Settings",               pageKey: "settings" },
];

export default function Sidebar({ isOpen = true, role = "Super Admin" }) {
  const location = useLocation();

  // Load permissions saved at login
  const permissions = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("permissions") || "[]");
    } catch (_) {
      return [];
    }
  }, []);

  // If no permissions configured for this role, show all items (Super Admin / unconfigured)
  const navItems = useMemo(() => {
    if (permissions.length === 0) return ALL_NAV_ITEMS;
    return ALL_NAV_ITEMS.filter(item => permissions.includes(item.pageKey));
  }, [permissions]);

  const isActive = (path) => location.pathname === path;

  return (
    <div
      className={`bg-neutral-950 border-r border-neutral-800/60 text-white min-h-screen h-full transition-all duration-300 ease-in-out overflow-hidden z-40
        ${isOpen ? "w-64 p-4" : "w-0 p-0 border-r-0"}`}
    >
      <div className="w-56">
        <div className="mb-6 px-4 pt-2">
          <h2 className="text-xl font-bold tracking-wide bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent uppercase text-xs">
            {role}
          </h2>
          <p className="text-[10px] text-neutral-500 tracking-widest uppercase mt-0.5">Control Center</p>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`block py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                isActive(item.to)
                  ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500 font-semibold"
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
