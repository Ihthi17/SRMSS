const express = require("express");
const router = express.Router();
const assignmentController = require("../controllers/driverAssignmentController");

// ── Dropdown Selection Endpoints ──────────────────────────────────
router.get("/drivers/selection",  assignmentController.getDriversForSelection);
router.get("/schedules/selection", assignmentController.getSchedulesForSelection);
router.get("/vehicles/selection",  assignmentController.getVehiclesForSelection);

// ── Driver Assignments CRUD ───────────────────────────────────────
router.get("/",      assignmentController.getAllAssignments);
router.post("/",     assignmentController.createAssignment);
router.put("/:id",   assignmentController.updateAssignment);
router.delete("/:id", assignmentController.deleteAssignment);

// ── Vehicle Assignments CRUD ──────────────────────────────────────
router.get("/vehicles",        assignmentController.getAllVehicleAssignments);
router.post("/vehicles",       assignmentController.createVehicleAssignment);
router.put("/vehicles/:id",    assignmentController.updateVehicleAssignment);
router.delete("/vehicles/:id", assignmentController.deleteVehicleAssignment);

module.exports = router;
