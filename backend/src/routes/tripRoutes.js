const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');

// Trip management endpoints
router.get('/', tripController.getAllTrips);
router.get('/depot/:depotId', tripController.getDepotTrips);
router.get('/statistics/:depotId', tripController.getTripStatistics);
router.post('/', tripController.createTrip);
router.put('/:id', tripController.updateTrip);
router.put('/:id/status', tripController.updateTripStatus);
router.delete('/:id', tripController.deleteTrip);

module.exports = router;