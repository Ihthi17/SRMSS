const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
// If you have a token authentication validation middleware, include it here:
// const verifyToken = require("../middleware/authMiddleware");

router.get("/stats", dashboardController.getStats);

module.exports = router;