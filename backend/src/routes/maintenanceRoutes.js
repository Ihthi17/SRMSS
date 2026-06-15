const express = require("express");
const router = express.Router();
const maintenanceController = require("../controllers/maintenanceController");

router.post("/",                          maintenanceController.createMaintenanceRecord);
router.get("/",                           maintenanceController.getAllMaintenanceRecords);
router.get("/report",                     maintenanceController.getMaintenanceSummaryReport);
router.get("/:maintenance_id",            maintenanceController.getMaintenanceRecordById);
router.put("/:maintenance_id",            maintenanceController.updateMaintenanceRecord);
router.delete("/:maintenance_id",         maintenanceController.deleteMaintenanceRecord);

module.exports = router;
