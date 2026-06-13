const express = require("express");
const router = express.Router();
const routeController = require("../controllers/routeController");

// Selection lookup endpoints
router.get("/selection", routeController.getRoutesForSelection);
router.get("/allocation-pool", routeController.getAllocationPool);

// System core CRUD entries
router.get("/", routeController.getAllRoutes);
router.post("/", routeController.createRoute);
router.put("/:id", routeController.updateRoute);
router.delete("/:id", routeController.deleteRoute);

module.exports = router;