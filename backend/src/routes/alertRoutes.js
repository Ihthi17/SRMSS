const express = require("express");
const router = express.Router();
const alertController = require("../controllers/alertController");

router.get("/",                    alertController.getAllAlerts);
router.get("/vehicle/:vehicle_id", alertController.getAlertsByVehicle);
router.post("/",                   alertController.createAlert);
router.put("/:alert_id",           alertController.updateAlertStatus);

module.exports = router;
