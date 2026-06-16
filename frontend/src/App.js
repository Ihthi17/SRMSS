import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import ForgotPassword from "./pages/ForgotPassword";
import NoAccess from "./pages/NoAccess";
import Dashboard from "./pages/Dashboard";
import UserManagement from "./pages/UserManagement";
import RoleManagement from "./pages/RoleManagement";
import DepotManagement from "./pages/DepotManagement";
import DepotDashboard from "./pages/DepotDashboard";
import DriverManagement from "./pages/DriverManagement";
import DriverAssignment from "./pages/DriverAssignment";
import RouteManagement from "./pages/RouteManagement";
import ScheduleManagement from "./pages/ScheduleManagement";
import BusManagement from "./pages/BusManagement";
import ManageRouteStops from "./pages/ManageStops";
import CreateRecurring from "./pages/CreateRecurring";
import TripManagement from "./pages/TripManagement";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import FuelManagement from "./pages/FuelManagement";
import MaintenanceManagement from "./pages/MaintenanceManagement";
import ReportsAnalytics from "./pages/ReportsAnalytics";
import VehicleAssignment from "./pages/VehicleAssignment";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes — no auth required */}
        <Route path="/" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/no-access" element={<NoAccess />} />

        {/* Protected routes — require login + role permission */}
        <Route path="/dashboard" element={
          <ProtectedRoute pageKey="dashboard"><Dashboard /></ProtectedRoute>
        } />
        <Route path="/routes" element={
          <ProtectedRoute pageKey="route-management"><RouteManagement /></ProtectedRoute>
        } />
        <Route path="/buses" element={
          <ProtectedRoute pageKey="bus-management"><BusManagement /></ProtectedRoute>
        } />
        <Route path="/user" element={
          <ProtectedRoute pageKey="user-management"><UserManagement /></ProtectedRoute>
        } />
        <Route path="/roles" element={
          <ProtectedRoute pageKey="role-management"><RoleManagement /></ProtectedRoute>
        } />
        <Route path="/depots" element={
          <ProtectedRoute pageKey="depot-management"><DepotManagement /></ProtectedRoute>
        } />
        <Route path="/depot-dashboard/:depotId" element={
          <ProtectedRoute pageKey="depot-management"><DepotDashboard /></ProtectedRoute>
        } />
        <Route path="/driver-management" element={
          <ProtectedRoute pageKey="driver-management"><DriverManagement /></ProtectedRoute>
        } />
        <Route path="/driver-assignment" element={
          <ProtectedRoute pageKey="driver-assignment"><DriverAssignment /></ProtectedRoute>
        } />
        <Route path="/vehicle-assignment" element={
          <ProtectedRoute pageKey="vehicle-assignment"><VehicleAssignment /></ProtectedRoute>
        } />
        <Route path="/schedule-management" element={
          <ProtectedRoute pageKey="schedule-management"><ScheduleManagement /></ProtectedRoute>
        } />
        <Route path="/manage-route-stops" element={
          <ProtectedRoute pageKey="route-stop-management"><ManageRouteStops /></ProtectedRoute>
        } />
        <Route path="/create-recurring" element={
          <ProtectedRoute pageKey="create-recurring"><CreateRecurring /></ProtectedRoute>
        } />
        <Route path="/trip-management" element={
          <ProtectedRoute pageKey="trip-management"><TripManagement /></ProtectedRoute>
        } />
        <Route path="/fuel-management" element={
          <ProtectedRoute pageKey="fuel-management"><FuelManagement /></ProtectedRoute>
        } />
        <Route path="/maintenance-management" element={
          <ProtectedRoute pageKey="maintenance-management"><MaintenanceManagement /></ProtectedRoute>
        } />
        <Route path="/reports-analytics" element={
          <ProtectedRoute pageKey="reports-analytics"><ReportsAnalytics /></ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute pageKey="settings"><Settings /></ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
