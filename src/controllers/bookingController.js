const Booking = require('../models/Bookings');
const {
    sendSuccess,
    sendCreated,
    sendError,
    sendNotFound
} = require('../utils/response');

// Create a new booking

const generateBookingId = () => {
    const randomNumber = Math.floor(10000000 + Math.random() * 90000000);
    return `M${randomNumber}`;
};

exports.createBooking = async (req, res) => {
    try {
        const bookingData = {
            ...req.body,
            bookingId: generateBookingId(),
        };

        const booking = await Booking.create(bookingData);
        sendSuccess(res, 'Booking created successfully', booking);
    } catch (error) {
        await sendError(res, error, req);
    }
};

// Get all bookings
exports.getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        sendSuccess(res, 'All bookings retrieved successfully', bookings);
    } catch (error) {
        await sendError(res, error, req);
    }
};

// Get booking by ID
exports.getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return sendNotFound(res, 'Booking not found');
        sendSuccess(res, 'Booking fetched successfully', booking);
    } catch (error) {
        await sendError(res, error, req);
    }
};

// Update booking status
exports.updateBookingStatus = async (req, res) => {
    try {
        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        );
        if (!booking) return sendNotFound(res, 'Booking not found');
        sendSuccess(res, 'Booking status updated', booking);
    } catch (error) {
        await sendError(res, error, req);
    }
};

// Delete booking
exports.deleteBooking = async (req, res) => {
    try {
        const booking = await Booking.findByIdAndDelete(req.params.id);
        if (!booking) return sendNotFound(res, 'Booking not found');
        sendSuccess(res, 'Booking deleted successfully');
    } catch (error) {
        await sendError(res, error, req);
    }
};