const express = require("express");
const router = express.Router();
const driverController = require("../controllers/driverController");

// Mount REST operations against functional pipeline layers
router.post("/", driverController.createDriver);       // Create
router.get("/", driverController.getAllDrivers);       // Read All
router.get("/:id", driverController.getDriverById);    // Read Single
router.put("/:id", driverController.updateDriver);     // Update
router.delete("/:id", driverController.deleteDriver);  // Delete

module.exports = router;