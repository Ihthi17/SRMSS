import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar({ isOpen = true, role = "Super Admin" }) {
  const location = useLocation();

  // Helper function to add a gold styling accent to the active route item
  const isActive = (path) => location.pathname === path;

  return (
    <div
      className={`bg-neutral-950 border-r border-neutral-800/60 text-white min-h-screen h-full transition-all duration-300 ease-in-out overflow-hidden z-40
        ${isOpen ? "w-64 p-4" : "w-0 p-0 border-r-0"}`}
    >
      {/* Container prevents text from squishing during slide transitions */}
      <div className="w-56">
        <div className="mb-6 px-4 pt-2">
          <h2 className="text-xl font-bold tracking-wide bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent uppercase text-xs">
            {role}
          </h2>
          <p className="text-[10px] text-neutral-500 tracking-widest uppercase mt-0.5">Control Center</p>
        </div>

        <nav className="space-y-1">
          {/* Dashboard Hub Module */}
          <Link
            to="/dashboard"
            className={`block py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              isActive("/dashboard")
                ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500 font-semibold"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            Dashboard
          </Link>

          {/* Transit Corridor Management Node */}
          <Link
            to="/routes"
            className={`block py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              isActive("/routes")
                ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500 font-semibold"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            Route Management
          </Link>

          {/* Route Stop Management Node */}
          <Link
            to="/manage-route-stops"
            className={`block py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              isActive("/manage-route-stops")
                ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500 font-semibold"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }` } 
          >
            Route Stop Management

          </Link>

          {/* Fleet Asset Matrix Node */}
          <Link
            to="/buses"
            className={`block py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              isActive("/buses")
                ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500 font-semibold"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            Bus Assets Log
          </Link>

          {/* System Access Accounts */}
          <Link
            to="/user"
            className={`block py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              isActive("/user")
                ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500 font-semibold"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            User Accounts
          </Link>

          {/* Permission Profiles Registry */}
          <Link
            to="/roles"
            className={`block py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              isActive("/roles")
                ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500 font-semibold"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            Role Boundaries
          </Link>

          {/* Logistics Terminals Hub */}
          <Link
            to="/depots"
            className={`block py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive("/depots")
                ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500 font-semibold"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            Depot Terminals
          </Link>

          {/* Driver Management Directory */}
          <Link
            to="/driver-management"
            className={`block py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive("/driver-management")
                ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500 font-semibold"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            Driver Roster Profiles
          </Link>

          {/* Operations Core Roster Assignation Node */}
          <Link
            to="/driver-assignment"
            className={`block py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive("/driver-assignment")
                ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500 font-semibold"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            Shift Assignments
          </Link>

          <Link
            to="/schedule-management"
            className={`block py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive("/schedule-management")
                ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500 font-semibold"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            Schedule Management
          </Link>

          <Link
            to="/create-recurring"
            className={`block py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive("/create-recurring")
                ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500 font-semibold"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            Create Recurring Schedules
          </Link>

          <Link
            to="/trip-management"
            className={`block py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive("/trip-management")
                ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500 font-semibold"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            Trip Management
          </Link>

          <Link
            to="/settings"
            className={`block py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive("/settings")
                ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500 font-semibold"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            ⚙️ Settings
          </Link>

        </nav>
      </div>
    </div>
  );
}