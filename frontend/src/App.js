import { BrowserRouter, Routes, Route } from "react-router-dom";
import ForgotPassword from "./pages/ForgotPassword";
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
import Login from "./pages/Login";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
         <Route path="/routes" element={<RouteManagement />} />
          <Route path="/buses" element={<BusManagement />} />
        <Route path="/user" element={<UserManagement />} />
        <Route path="/roles"element={<RoleManagement />} />
        <Route path="/depots"element={<DepotManagement />} />
        <Route path="/depot-dashboard/:depotId" element={<DepotDashboard />} />
         <Route path="/driver-management" element={<DriverManagement />} />
         
         <Route path="/driver-assignment" element={<DriverAssignment />} />
          <Route path="/schedule-management" element={<ScheduleManagement />} />
        <Route path="/manage-route-stops" element={<ManageRouteStops />} />
        <Route path="/create-recurring" element={<CreateRecurring />} />
        <Route path="/trip-management" element={<TripManagement />} />
        
        

      </Routes>
    </BrowserRouter>
  );
}

export default App;