const express = require("express");
const router = express.Router();
const busController = require("../controllers/busController");

// System core Bus CRUD allocation matrices
router.get("/", busController.getAllBuses);
router.post("/", busController.createBus);
router.put("/:id", busController.updateBus);
router.delete("/:id", busController.deleteBus);

module.exports = router;