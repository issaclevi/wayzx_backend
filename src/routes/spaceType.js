const express = require('express');
const router = express.Router();
const { createSpaceType, getAllSpaceTypes } = require('../controllers/spaceTypeController');
const { spaceTypeValidationRules, validateSpaceType } = require('../validators/spaceTypevalidator');

router.post('/create-spacetype', spaceTypeValidationRules, validateSpaceType, createSpaceType);
router.get('/getallspacetypes', getAllSpaceTypes);
// router.get('/getRoomById/:id', getRoomById);
// router.get('/:id/availability', getRoomAvailability);
// router.put('/updateRoom/:id/', updateRoom);
// router.delete('/deleteRoom/:id', deleteRoom);

module.exports = router;