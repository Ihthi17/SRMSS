const express = require("express");
const router = express.Router();
const scheduleController = require("../controllers/scheduleController");

// Route handling the batch recurring engine form submission
router.post("/recurring", scheduleController.createRecurringSchedules);

module.exports = router;