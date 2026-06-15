const express = require("express");
const router = express.Router();
const fuelController = require("../controllers/fuelController");

router.post("/",           fuelController.createFuelRecord);
router.get("/",            fuelController.getAllFuelRecords);
router.get("/:fuel_id",    fuelController.getFuelRecordById);
router.put("/:fuel_id",    fuelController.updateFuelRecord);
router.delete("/:fuel_id", fuelController.deleteFuelRecord);

module.exports = router;
