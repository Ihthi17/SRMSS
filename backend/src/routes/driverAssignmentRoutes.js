const express = require("express");
const router = express.Router();
// Double-check this filename matches your sidebar file exactly!
const assignmentController = require("../controllers/driverAssignmentController"); 

// 1. Dropdown Selection Endpoints
// Final URL: http://localhost:5000/api/assignments/drivers/selection
router.get("/drivers/selection", assignmentController.getDriversForSelection);

// Final URL: http://localhost:5000/api/assignments/schedules/selection
router.get("/schedules/selection", assignmentController.getSchedulesForSelection);


// 2. Core CRUD Endpoints
// Final URL: http://localhost:5000/api/assignments
router.get("/", assignmentController.getAllAssignments);

// Final URL: http://localhost:5000/api/assignments
router.post("/", assignmentController.createAssignment);

// Final URL: http://localhost:5000/api/assignments/:id
router.put("/:id", assignmentController.updateAssignment);

// Final URL: http://localhost:5000/api/assignments/:id
router.delete("/:id", assignmentController.deleteAssignment);

module.exports = router;