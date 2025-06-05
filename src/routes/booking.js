const express = require('express');
const router = express.Router();
const { createBooking, getAllBookings, getBookingById, updateBookingStatus, deleteBooking, getRoomAvailability, cancelBooking } = require('../controllers/bookingController');
const { bookingValidationRules, validateBooking } = require('../validators/bookingValidator');


router.post('/booking-create', bookingValidationRules, validateBooking, createBooking);
router.get('/getAllBookings', getAllBookings);
router.get('/getBookingById/:id', getBookingById);
router.get('/cancel/:bookingId', cancelBooking );
router.put('/:id/status', updateBookingStatus);
router.delete('/deleteBooking/:id', deleteBooking);

router.get('/:id/availability', getRoomAvailability);

module.exports = router;