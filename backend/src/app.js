const express = require("express");
const cors = require("cors");
const seedSuperAdmin = require("./seeders/superAdminSeeder");
require("dotenv").config();

// Existing Auth Route
const authRoutes = require("./routes/authRoutes");

// NEW: Import your newly added CRUD routes
const dashboard =require("./controllers/dashboardController")
const userRoutes = require("./routes/userRoutes");
const roleRoutes = require("./routes/roleRoutes");
const depotRoutes = require("./routes/depotRoutes");
const driverRoutes = require("./routes/driverRoutes");
const routeRoutes = require("./routes/routeRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const routeStopsRoutes = require("./routes/routeStopsRoutes");

const app = express();

// Initialize database seeders
seedSuperAdmin();

// Global Middlewares
app.use(cors());
app.use(express.json());

// Application API Endpoints
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);  // Hooks up User Management
app.use("/api/roles", roleRoutes);  // Hooks up Role Management
app.use("/api/depots", depotRoutes); // Hooks up Depot Management
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/drivers", driverRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/assignments", require("./routes/driverAssignmentRoutes"));
app.use("/api/schedules", scheduleRoutes);
app.use("/api/buses", require("./routes/busRoutes"));
app.use("/api/route-stops", routeStopsRoutes);
// Server Network Listener
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running securely on port ${PORT}`);
});