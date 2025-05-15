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
    if (!timeStr || typeof timeStr !== 'string') return -1;
    const [timePart, period] = timeStr.trim().split(' ');
    if (!timePart || !period) return -1;
    const [hours, minutes] = timePart.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return -1;

    let totalMinutes = hours * 60 + minutes;
    if (period.toUpperCase() === 'PM' && hours !== 12) totalMinutes += 12 * 60;
    if (period.toUpperCase() === 'AM' && hours === 12) totalMinutes -= 12 * 60;
    return totalMinutes;
};

const isTimeOverlapping = (slotStart, slotEnd, bookingStart, bookingEnd) => {
    return (
        (slotStart >= bookingStart && slotStart < bookingEnd) ||
        (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
        (slotStart <= bookingStart && slotEnd >= bookingEnd)
    );
};

exports.createBooking = async (req, res) => {
    try {
        const { start_date, end_date, timeRanges, ...rest } = req.body;

        if (!start_date || !Array.isArray(timeRanges) || timeRanges.length === 0) {
            return sendErrorMessage(res, {
                message: 'start_date, end_date, and at least one time range in timeRanges[] are required.'
            }, req);
        }

        const start = moment(start_date, 'YYYY-MM-DD');
        const end = moment(end_date, 'YYYY-MM-DD');

        if (!start.isValid() || !end.isValid()) {
            return sendErrorMessage(res, {
                message: 'Invalid start_date or end_date format. Use YYYY-MM-DD.'
            }, req);
        }

        if (end.isBefore(start)) {
            return sendErrorMessage(res, {
                message: 'end_date cannot be before start_date.'
            }, req);
        }

        for (let day = moment(start); day.isSameOrBefore(end); day.add(1, 'day')) {
            const bookings = await Booking.find({
                roomId: rest.roomId,
                start_date: { $lte: day.toDate() },
                end_date: { $gte: day.toDate() },
                status: { $in: ['Booked', 'Confirmed'] }
            }).lean();

            for (const requested of timeRanges) {
                if (!requested.start || !requested.end) {
                    return sendErrorMessage(res, "Each timeRange must include 'start' and 'end'.", req);
                }

                const reqStart = timeToMinutes(requested.start);
                const reqEnd = timeToMinutes(requested.end);

                for (const booking of bookings) {
                    for (const existing of booking.timeRanges || []) {
                        const exStart = timeToMinutes(existing.start);
                        const exEnd = timeToMinutes(existing.end);

                        if (isTimeOverlapping(reqStart, reqEnd, exStart, exEnd)) {
                            return sendErrorMessage(res,
                                `Conflict on ${day.format('YYYY-MM-DD')} between ${requested.start} - ${requested.end}`,
                                req
                            );
                        }
                    }
                }
            }
        }

        const booking = await Booking.create({
            ...rest,
            start_date: start.toDate(),
            end_date: end.toDate(),
            timeRanges,
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