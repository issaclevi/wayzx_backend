const express = require('express');
const router = express.Router();
const { createRoom, getAllRooms, getRoomById, updateRoom, deleteRoom, getRoomAvailability } = require('../controllers/roomController');
const { roomValidationRules, validateRoom } = require('../validators/roomValidator');

router.post('/room-create', roomValidationRules, validateRoom, createRoom);
router.get('/getAllRooms', getAllRooms);
router.get('/getRoomById/:id', getRoomById);
router.get('/:id/availability', getRoomAvailability);
router.put('/updateRoom/:id/', updateRoom);
router.delete('/deleteRoom/:id', deleteRoom);

module.exports = router;