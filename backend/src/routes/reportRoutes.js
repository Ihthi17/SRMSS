const express          = require("express");
const router           = express.Router();
const reportController = require("../controllers/reportController");
const { verifyToken }  = require("../middleware/authMiddleware");
const { canViewReports } = require("../middleware/reportPermission");

// All report routes require a valid JWT + report-viewing role
router.use(verifyToken, canViewReports);

// 1. Fuel Consumption Report
router.get("/fuel-consumption",   reportController.getFuelConsumptionReport);

// 2. Route Management Report
router.get("/route-management",   reportController.getRouteManagementReport);

// 3. Depot Management Report
router.get("/depot-management",   reportController.getDepotManagementReport);

// 4. Schedules Management Report
router.get("/schedules",          reportController.getSchedulesManagementReport);

// 5. Driver Shift Management Report
router.get("/driver-shifts",      reportController.getDriverShiftReport);

// 6. Maintenance Management Report
router.get("/maintenance",        reportController.getMaintenanceManagementReport);

// 7. Fuel Summary Report (Task 6.1) - with aggregation and vehicle filtering
router.get("/fuel-summary",       reportController.getFuelSummaryReport);

// 8. Maintenance Summary Report (Task 6.1) - with type/status breakdown
router.get("/maintenance-summary", reportController.getMaintenanceSummaryReport);

// Export: GET /api/reports/export?reportType=fuel&format=csv&...
router.get("/export",             reportController.exportReport);

module.exports = router;
