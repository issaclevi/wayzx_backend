const Booking = require('../models/Bookings');
const moment = require('moment-timezone');
const SpaceType = require('../models/SpaceType');
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

exports.createBooking = async (req, res) => {
    try {
        const roomId = req.body.roomId;
        const start_date = req.body.start_date;
        const spaceTypeId = req.body.spaceTypeId;
        const timeRanges = req.body.timeRanges || [];
        const extraAmenity = Array.isArray(req.body.extraAmenity) ? req.body.extraAmenity : [];

        console.log('ame', extraAmenity);

        if (!roomId || !start_date || !spaceTypeId || !Array.isArray(timeRanges) || timeRanges.length === 0) {
            return sendErrorMessage(res, 'Missing required fields (roomId, start_date, spaceTypeId, timeRanges)', req);
        }

        if (!Array.isArray(extraAmenity) || !extraAmenity.every(item => typeof item === 'string')) {
            return sendErrorMessage(res, 'Invalid extraAmenity - must be an array of strings', req);
        }

        const spaceTypeDoc = await SpaceType.findById(spaceTypeId).lean();
        if (!spaceTypeDoc || !spaceTypeDoc.allowedSlots || spaceTypeDoc.allowedSlots.length === 0) {
            return sendErrorMessage(res, 'Invalid or unconfigured spaceTypeId', req);
        }

        const allowedSlots = spaceTypeDoc.allowedSlots;

        for (const slot of timeRanges) {
            if (!allowedSlots.includes(slot)) {
                return sendErrorMessage(res, `Invalid slot '${slot}' for selected spaceTypeId`, req);
            }
        }

        const start = moment(start_date, 'YYYY-MM-DD');
        const end = moment(req.body.end_date || start_date, 'YYYY-MM-DD');

        if (!start.isValid() || !end.isValid()) {
            return sendErrorMessage(res, 'Invalid start_date or end_date format (YYYY-MM-DD expected)', req);
        }

        if (end.isBefore(start)) {
            return sendErrorMessage(res, 'end_date cannot be before start_date', req);
        }

        for (let day = moment(start); day.isSameOrBefore(end); day.add(1, 'day')) {
            const date = day.clone().toDate();

            const existingBookings = await Booking.find({
                roomId,
                start_date: { $lte: date },
                end_date: { $gte: date },
                status: { $in: ['Booked', 'Confirmed'] }
            }).lean();

            for (const slot of timeRanges) {
                for (const booking of existingBookings) {
                    if ((booking.timeRanges || []).includes(slot)) {
                        return sendErrorMessage(res, `Slot '${slot}' already booked on ${day.format('YYYY-MM-DD')}`, req);
                    }
                }
            }
        }

        const newBooking = await Booking.create({
            userId: req.body.userId,
            roomId,
            location: req.body.location,
            title: req.body.title,
            guests: req.body.guests,
            start_date: start.toDate(),
            end_date: end.toDate(),
            timeRanges, extraAmenity,
            spaceType: spaceTypeId,
            name: req.body.name,
            email: req.body.email,
            pricePerHour: req.body.pricePerHour,
            serviceFeeAndTax: req.body.serviceFeeAndTax,
            totalAmount: req.body.totalAmount,
            status: req.body.status,
            bookingId: generateBookingId()
        });

        await SpaceType.findByIdAndUpdate(spaceTypeId, {
            $set: { lastBookedAt: new Date() },
            $inc: { bookingsCount: 1 }
        });

        const timezone = req.headers['x-timezone'] || 'Asia/Kolkata';
        const formattedBooking = {
            ...newBooking.toObject(),
            start_date: moment(newBooking.start_date).tz(timezone).format('ddd MMM DD YYYY'),
            end_date: moment(newBooking.end_date).tz(timezone).format('ddd MMM DD YYYY')
        };

        console.log('final', formattedBooking);


        return sendSuccess(res, 'Booking created successfully', formattedBooking);
    } catch (error) {
        console.error('Booking creation failed:', error);
        return sendError(res, error, req);
    }
};

// Get all bookings
exports.getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate('spaceType', 'name')
            .populate('roomId')
            .sort({ createdAt: -1 });
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