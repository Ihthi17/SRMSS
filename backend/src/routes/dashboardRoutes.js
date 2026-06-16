const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");

router.get("/stats",              dashboardController.getStats);
router.get("/trip-metrics",       dashboardController.getTripMetrics);
router.get("/trip-chart",         dashboardController.getTripChartData);
router.get("/route-performance",  dashboardController.getRoutePerformance);
router.get("/live-trips",         dashboardController.getLiveTripsStatus);
router.get("/vehicle-status",     dashboardController.getVehicleStatus);
router.get("/fuel-weekly",        dashboardController.getFuelWeekly);
router.get("/depot-summary",      dashboardController.getDepotSummary);

module.exports = router;