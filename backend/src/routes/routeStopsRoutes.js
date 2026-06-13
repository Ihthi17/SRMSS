const express = require('express');
const router = express.Router();

// Step up out of /routes and look into /controllers folder
const controller = require('../controllers/routeStopsController');

// Main collection endpoints
router.post('/', controller.createStop);                      // Resolves to: POST /api/route-stops
router.get('/route/:routeId', controller.getStopsByRoute);    // Resolves to: GET /api/route-stops/route/:routeId

// Individual stop mutation endpoints
router.put('/:id', controller.updateStop);                   // Resolves to: PUT /api/route-stops/:id
router.delete('/:id', controller.deleteStop);                // Resolves to: DELETE /api/route-stops/:id

module.exports = router;