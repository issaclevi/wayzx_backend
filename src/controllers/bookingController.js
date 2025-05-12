const Booking = require('../models/Bookings');
const moment = require('moment-timezone');
const {
    sendSuccess,
    sendCreated,
    sendError,
    sendNotFound,
    sendErrorMessage
} = require('../utils/response');

// Create a new booking
const generateBookingId = () => {
    const randomNumber = Math.floor(10000000 + Math.random() * 90000000);
    return `M${randomNumber}`;
};

const timeToMinutes = (timeStr) => {
    const [timePart, period] = timeStr.split(' ');
    const [hours, minutes] = timePart.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes;

    if (period.toUpperCase() === 'PM' && hours !== 12) totalMinutes += 12 * 60;
    if (period.toUpperCase() === 'AM' && hours === 12) totalMinutes -= 12 * 60;

    return totalMinutes;
};

// Helper to check time overlap
const isTimeOverlapping = (slotStart, slotEnd, bookingStart, bookingEnd) => {
    return (
        (slotStart >= bookingStart && slotStart < bookingEnd) ||
        (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
        (slotStart <= bookingStart && slotEnd >= bookingEnd)
    );
};

exports.createBooking = async (req, res) => {
    try {
        const { start_date, end_date, timeRange, ...rest } = req.body;

        if (!start_date || !end_date || !timeRange?.start || !timeRange?.end) {
            return sendErrorMessage(res, {
                message: 'start_date, end_date, and timeRange (start, end) are required.'
            }, req);
        }

        const start = moment(start_date, 'YYYY-MM-DD');
        const end = moment(end_date, 'YYYY-MM-DD');

        if (!start.isValid() || !end.isValid()) {
            return sendErrorMessage(res, {
                message: 'Invalid start_date or end_date format. Use YYYY-MM-DD.'
            }, req);
        }

        if (end.isSameOrBefore(start)) {
            return sendErrorMessage(res, {
                message: 'end_date must be after start_date.'
            }, req);
        }

        const startMin = timeToMinutes(timeRange.start);
        const endMin = timeToMinutes(timeRange.end);

        // Loop through each day and check for conflicts
        for (let day = moment(start); day.isSameOrBefore(end); day.add(1, 'day')) {
            const bookings = await Booking.find({
                roomId: rest.roomId,
                start_date: { $lte: day.toDate() },
                end_date: { $gte: day.toDate() },
                status: { $in: ['Booked', 'Confirmed'] }
            }).lean();

            for (const booking of bookings) {
                const bStartMin = timeToMinutes(booking.timeRange?.start);
                const bEndMin = timeToMinutes(booking.timeRange?.end);

                if (isTimeOverlapping(startMin, endMin, bStartMin, bEndMin)) {
                    return sendErrorMessage(
                        res,
                        `The room is already booked on ${day.format('YYYY-MM-DD')} from ${booking.timeRange.start} to ${booking.timeRange.end}`,
                        req
                    );
                }
            }
        }

        // No conflicts — proceed to create the booking
        const booking = await Booking.create({
            ...rest,
            start_date: start.toDate(),
            end_date: end.toDate(),
            timeRange,
            bookingId: generateBookingId()
        });

        const timezone = req.headers['x-timezone'] || 'Asia/Kolkata';

        const formattedBooking = {
            ...booking.toObject(),
            start_date: moment(booking.start_date).tz(timezone).format('ddd MMM DD YYYY'),
            end_date: moment(booking.end_date).tz(timezone).format('ddd MMM DD YYYY')
        };

        return sendSuccess(res, 'Booking created successfully', formattedBooking);
    } catch (error) {
        console.error(error);
        return sendError(res, error, req);
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