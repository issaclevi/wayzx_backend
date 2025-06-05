const Booking = require('../models/Bookings');
const moment = require('moment-timezone');
const SpaceType = require('../models/SpaceType');
const Room = require('../models/Rooms');
const RoomAvailability = require('../models/RoomAvailability');
const RewardSetting = require('../models/Reward');
const RewardService = require('../services/rewardService');
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
// await Booking.deleteMany({})
// await RoomAvailability.deleteMany({})

exports.createBooking = async (req, res) => {
    try {
        const {
            roomId,
            start_date,
            start_time,
            spaceTypeId,
            timeRanges = [],
            extraAmenity = [],
            userId,
            guests,
            end_date,
            serviceFeeAndTax,
            totalAmount,
            status,
            useRewardPoints = false,
            pointsToUse = 0
        } = req.body;

        const timezone = req.headers['x-timezone'] || 'Asia/Kolkata';

        const rewardSettings = await RewardService.getSettings();
        if (rewardSettings.pointsPerBooking <= 0) {
            console.warn('Invalid pointsPerBooking value, resetting to default 5');
            rewardSettings.pointsPerBooking = 5;
            await rewardSettings.save();
        }

        if (!roomId || !start_date || !spaceTypeId) {
            return sendErrorMessage(res, 'Missing required fields (roomId, start_date, spaceTypeId)', req);
        }

        const room = await Room.findById(roomId);
        if (!room) return sendErrorMessage(res, 'Room not found', req);

        const spaceTypeDoc = await SpaceType.findById(spaceTypeId).lean();
        if (!spaceTypeDoc || !spaceTypeDoc.allowedSlots?.length) {
            return sendErrorMessage(res, 'Invalid spaceTypeId or missing allowedSlots', req);
        }

        // Determine final time slots
        let finalSlots = [];
        const slotPresets = {
            '3H': 3,
            '6H': 6,
            'FullTime': Number.MAX_SAFE_INTEGER,
            'Morning': ['09:00AM', '10:00AM', '11:00AM', '12:00PM'],
            'Evening': ['01:00PM', '02:00PM', '03:00PM', '04:00PM', '05:00PM', '06:00PM']
        };

        const isMeetingRoom = spaceTypeDoc.name.toLowerCase().includes('meeting');

        if (isMeetingRoom) {
            const type = (timeRanges[0] || '').trim();
            if (!slotPresets[type]) {
                return sendErrorMessage(res, `Invalid timeRanges value for meeting room: '${type}'. Use 'Morning' or 'Evening'`, req);
            }

            finalSlots = slotPresets[type];
        } else {
            if (!start_time) {
                return sendErrorMessage(res, 'start_time is required for non-meeting space types', req);
            }

            const slotKey = timeRanges[0] || '3H';
            const duration = slotPresets[slotKey] || 3;

            const startIndex = spaceTypeDoc.allowedSlots.indexOf(start_time);
            if (startIndex === -1) {
                return sendErrorMessage(res, 'Invalid start_time', req);
            }

            finalSlots = spaceTypeDoc.allowedSlots.slice(startIndex, startIndex + duration);
            if (finalSlots.length < duration) {
                return sendErrorMessage(res, `Only ${finalSlots.length} slots available from ${start_time}, but ${duration} requested`, req);
            }
        }

        // Validate all finalSlots
        for (const slot of finalSlots) {
            if (!spaceTypeDoc.allowedSlots.includes(slot)) {
                return sendErrorMessage(res, `Slot '${slot}' is not allowed`, req);
            }
        }

        // Normalize dates to timezone
        const start = moment.tz(start_date, 'YYYY-MM-DD', timezone).startOf('day');
        const end = moment.tz(end_date || start_date, 'YYYY-MM-DD', timezone).startOf('day');

        if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
            return sendErrorMessage(res, 'Invalid start/end date', req);
        }

        // Check slot availability
        for (let day = moment(start); day.isSameOrBefore(end); day.add(1, 'day')) {
            const dateOnly = day.clone().startOf('day').toDate();

            let availability = await RoomAvailability.findOne({ roomId, date: dateOnly });
            if (!availability) {
                availability = await RoomAvailability.create({
                    roomId,
                    date: dateOnly,
                    availableSize: 1,
                    bookedSlots: {}
                });
            }

            for (const slot of finalSlots) {
                const count = availability.bookedSlots.get(slot) || 0;
                if (count > 0) {
                    return sendErrorMessage(
                        res,
                        `Slot '${slot}' is already booked on ${day.format('YYYY-MM-DD')}`,
                        req
                    );
                }
            }
        }

        // Reward Points Calculation
        let discountFromPoints = 0;
        let finalAmount = totalAmount;
        let actualPointsToUse = pointsToUse;
        let pointsEarned = 0;

        if (useRewardPoints && userId) {
            try {
                const rewardCalc = await RewardService.calculateDiscountFromPoints(userId, totalAmount);
                if (pointsToUse > 0) {
                    if (pointsToUse > rewardCalc.pointsToUse) {
                        return sendErrorMessage(res, `Cannot use more than ${rewardCalc.pointsToUse} points for this booking`, req);
                    }
                    discountFromPoints = pointsToUse / rewardSettings.pointToCurrencyRate;
                    actualPointsToUse = pointsToUse;
                } else {
                    discountFromPoints = rewardCalc.discountAmount;
                    actualPointsToUse = rewardCalc.pointsToUse;
                }

                finalAmount = totalAmount - discountFromPoints;
            } catch (error) {
                console.error('Reward points calculation failed:', error);
                return sendErrorMessage(res, error.message, req);
            }
        }

        // Create booking
        const newBooking = await Booking.create({
            bookingId: generateBookingId(),
            roomId,
            userId,
            spaceType: spaceTypeId,
            extraAmenity,
            guests,
            start_time: isMeetingRoom ? finalSlots[0] : start_time,
            start_date: start.toDate(),
            end_date: end.toDate(),
            timeRanges: finalSlots,
            serviceFeeAndTax,
            totalAmount,
            amountPaid: finalAmount,
            rewardPointsUsed: useRewardPoints ? actualPointsToUse : 0,
            rewardDiscount: discountFromPoints,
            status: status || 'Pending',
        });

        // Mark slots as booked
        for (let day = moment(start); day.isSameOrBefore(end); day.add(1, 'day')) {
            const dateOnly = day.clone().startOf('day').toDate();

            const updateObj = { $inc: {} };
            finalSlots.forEach(slot => {
                updateObj.$inc[`bookedSlots.${slot}`] = 1;
            });

            await RoomAvailability.updateOne({ roomId, date: dateOnly }, updateObj);
        }

        // Update space usage stats
        await SpaceType.findByIdAndUpdate(spaceTypeId, {
            $set: { lastBookedAt: new Date() },
            $inc: { bookingsCount: 1 }
        });

        // Process Reward Points
        if (userId) {
            try {
                // Deduct points if used
                if (useRewardPoints && actualPointsToUse > 0) {
                    await RewardService.deductPoints(userId, actualPointsToUse, {
                        bookingId: newBooking._id,
                        note: `Points redeemed for booking ${newBooking.bookingId}`,
                        createdBy: userId,
                        ipAddress: req.ip
                    });
                }

                // Add earned points if eligible

                const isEligibleForPoints = totalAmount >= rewardSettings.minBookingAmountForPoints;

                if (isEligibleForPoints) {
                    pointsEarned = rewardSettings.pointsPerBooking;
                    await RewardService.addPoints(userId, pointsEarned, {
                        bookingId: newBooking._id,
                        note: `Points earned from booking ${newBooking.bookingId}`,
                        createdBy: userId,
                        ipAddress: req.ip
                    });
                }
            } catch (error) {
                console.error('Reward points processing failed:', error);
                // Continue with booking even if reward processing fails
            }
        }

        // Prepare response
        const formattedBooking = {
            ...newBooking.toObject(),
            start_date: moment(newBooking.start_date).tz(timezone).format('YYYY-MM-DD'),
            end_date: moment(newBooking.end_date).tz(timezone).format('YYYY-MM-DD'),
            rewardPointsEarned: pointsEarned,
            rewardPointsUsed: useRewardPoints ? actualPointsToUse : 0,
            minAmountForPoints: rewardSettings.minBookingAmountForPoints,
            pointToCurrencyRate: rewardSettings.pointToCurrencyRate,
            pointsPerBooking: rewardSettings.pointsPerBooking
        };
        return sendSuccess(res, 'Booking created successfully', formattedBooking);

    } catch (error) {
        console.error('Booking creation failed:', error);
        return sendError(res, error, req);
    }
};

// Get all bookings
exports.getAllBookings = async (req, res) => {
    try {
        const timezone = req.headers['x-timezone'] || 'Asia/Kolkata';
        const { date } = req.query;

        let filter = {};

        // Optional: filter by specific date
        if (date) {
            const startOfDay = moment.tz(date, 'YYYY-MM-DD', timezone).startOf('day').toDate();
            const endOfDay = moment.tz(date, 'YYYY-MM-DD', timezone).endOf('day').toDate();

            filter.start_date = {
                $gte: startOfDay,
                $lte: endOfDay,
            };
        }

        const bookings = await Booking.find(filter)
            .populate('spaceType', 'name')
            .populate('roomId')
            .populate('userId', 'name email phoneNumber')
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

        const start = moment(booking.start_date).startOf('day');
        const end = moment(booking.end_date).startOf('day');
        const roomId = booking.roomId;
        const slots = booking.timeRanges;

        for (let day = moment(start); day.isSameOrBefore(end); day.add(1, 'day')) {
            const dateOnly = day.clone().startOf('day').toDate();

            const update = {
                $inc: {}
            };

            slots.forEach(slot => {
                update.$inc[`bookedSlots.${slot}`] = -1;
            });

            await RoomAvailability.updateOne(
                { roomId, date: dateOnly },
                update
            );
        }

        await SpaceType.findByIdAndUpdate(booking.spaceType, {
            $inc: { bookingsCount: -1 }
        });

        return sendSuccess(res, 'Booking deleted and slots released successfully');

    } catch (error) {
        await sendError(res, error, req);
    }
};

exports.getRoomAvailability = async (req, res) => {
    try {

        const roomId = req.query.roomId || req.params.id;
        const { startDate, endDate } = req.query;

        // Validate required parameters
        if (!roomId || !startDate) {
            return sendErrorMessage(res, 'Missing required parameters (roomId, startDate)', req);
        }

        // Validate room exists
        const room = await Room.findById(roomId);
        if (!room) return sendErrorMessage(res, 'Room not found', req);

        // Parse and validate dates
        const start = moment(startDate).startOf('day');
        const end = moment(endDate || startDate).endOf('day');

        if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
            return sendErrorMessage(res, 'Invalid date range', req);
        }

        // Get all availability records for the date range
        const availabilityRecords = await RoomAvailability.find({
            roomId,
            date: {
                $gte: start.toDate(),
                $lte: end.toDate()
            }
        }).lean();

        // Get all confirmed bookings that overlap with the date range
        const bookings = await Booking.find({
            roomId,
            status: { $in: ['Booked', 'Confirmed'] },
            $or: [
                {
                    start_date: { $lte: end.toDate() },
                    end_date: { $gte: start.toDate() }
                },
                {
                    start_date: { $gte: start.toDate(), $lte: end.toDate() }
                }
            ]
        }).lean();

        // Get space type configuration
        const spaceType = await SpaceType.findById(room.spaceTypeId).lean();
        if (!spaceType || !spaceType.allowedSlots) {
            return sendErrorMessage(res, 'Space type configuration not found', req);
        }

        // Prepare response
        const availabilityResponse = [];
        const timezone = req.headers['x-timezone'] || 'Asia/Kolkata';

        // Process each day in the range
        for (let day = moment(start); day.isSameOrBefore(end); day.add(1, 'day')) {
            const dateStr = day.format('YYYY-MM-DD');
            const dateObj = day.toDate();

            // Find availability record for this day
            let availability = availabilityRecords.find(rec =>
                moment(rec.date).isSame(day, 'day')
            );

            if (!availability) {
                availability = {
                    date: dateObj,
                    availableSize: room.roomSize,
                    bookedSlots: {}
                };
            }

            // Convert Map to plain object if needed
            const bookedSlots = availability.bookedSlots instanceof Map ?
                Object.fromEntries(availability.bookedSlots) :
                availability.bookedSlots || {};

            // Get all bookings that include this day
            const dayBookings = bookings.filter(booking =>
                moment(booking.start_date).isSameOrBefore(day, 'day') &&
                moment(booking.end_date).isSameOrAfter(day, 'day')
            );

            // Calculate availability for each time slot
            const timeSlots = {};
            spaceType.allowedSlots.forEach(slot => {
                // Count bookings for this specific slot
                const bookingsForSlot = dayBookings.filter(booking =>
                    booking.timeRanges.includes(slot)
                ).length;

                // Get count from availability record
                const bookedFromRecord = bookedSlots[slot] || 0;

                // Total booked is sum of both
                const totalBooked = bookingsForSlot + bookedFromRecord;

                // Calculate available slots
                const available = Math.max(0, room.roomSize - totalBooked);
                timeSlots[slot] = {
                    available,
                    booked: totalBooked,
                    isAvailable: available > 0
                };
            });

            availabilityResponse.push({
                date: day.tz(timezone).format('YYYY-MM-DD'),
                day: day.tz(timezone).format('dddd'),
                availableSize: availability.availableSize,
                timeSlots,
                isAvailable: availability.availableSize > 0
            });
        }

        return sendSuccess(res, 'Availability fetched successfully', {
            roomId,
            roomName: room.name,
            roomSize: room.roomSize,
            capacity: room.capacity,
            availability: availabilityResponse
        });

    } catch (error) {
        console.error('Error fetching availability:', error);
        return sendError(res, error, req);
    }
};

exports.cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const booking = await Booking.findOne({ bookingId });
        if (!booking) {
            return sendErrorMessage(res, 'Booking not found', req);
        }

        if (booking.status === 'Cancelled') {
            return sendErrorMessage(res, 'Booking is already cancelled', req);
        }

        // Update booking status
        booking.status = 'Cancelled';
        await booking.save();

        // Rollback booked slots
        const start = moment(booking.start_date).startOf('day');
        const end = moment(booking.end_date).startOf('day');

        for (let day = moment(start); day.isSameOrBefore(end); day.add(1, 'day')) {
            const dateOnly = day.clone().startOf('day').toDate();
            const updateObj = { $inc: {} };

            booking.timeRanges.forEach(slot => {
                updateObj.$inc[`bookedSlots.${slot}`] = -1;
            });

            await RoomAvailability.updateOne(
                { roomId: booking.roomId, date: dateOnly },
                updateObj
            );
        }

        return sendSuccess(res, 'Booking cancelled successfully', booking);

    } catch (error) {
        console.error('Cancel booking error:', error);
        return sendError(res, error, req);
    }
};

// exports.getRoomAvailability = async (req, res) => {
//     try {
//         const roomId = req.query.roomId || req.params.id;
//         const { startDate, endDate } = req.query;

//         console.log('Fetching availability for roomId:', roomId, 'from', startDate, 'to', endDate);


//         if (!roomId || !startDate) {
//             return sendErrorMessage(res, 'Missing required parameters (roomId, startDate)', req);
//         }

//         const room = await Room.findById(roomId);
//         if (!room) return sendErrorMessage(res, 'Room not found', req);

//         const start = moment(startDate).startOf('day');
//         const end = moment(endDate || startDate).endOf('day');

//         if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
//             return sendErrorMessage(res, 'Invalid date range', req);
//         }

//         // Get all availability records for the date range
//         const availabilityRecords = await RoomAvailability.find({
//             roomId,
//             date: {
//                 $gte: start.toDate(),
//                 $lte: end.toDate()
//             }
//         }).lean();

//         // Get all bookings that might affect availability
//         const bookings = await Booking.find({
//             roomId,
//             status: { $in: ['Booked', 'Confirmed'] },
//             $or: [
//                 { start_date: { $lte: end.toDate() }, end_date: { $gte: start.toDate() } },
//                 { start_date: { $gte: start.toDate(), $lte: end.toDate() } }
//             ]
//         }).lean();

//         // Get space type to know allowed slots
//         const spaceType = await SpaceType.findById(room.spaceTypeId).lean();
//         if (!spaceType || !spaceType.allowedSlots) {
//             return sendErrorMessage(res, 'Space type configuration not found', req);
//         }

//         // Initialize response structure
//         const availabilityResponse = [];
//         const timezone = req.headers['x-timezone'] || 'Asia/Kolkata';

//         // Process each day in the range
//         for (let day = moment(start); day.isSameOrBefore(end); day.add(1, 'day')) {
//             const dateStr = day.format('YYYY-MM-DD');
//             const dateObj = day.toDate();

//             // Find or create availability record for this day
//             let availability = availabilityRecords.find(rec =>
//                 moment(rec.date).isSame(day, 'day')
//             );

//             if (!availability) {
//                 availability = {
//                     date: dateObj,
//                     availableSize: room.roomSize,
//                     bookedSlots: new Map()
//                 };
//             }

//             // Convert Map to Object if needed
//             const bookedSlots = availability.bookedSlots instanceof Map ?
//                 Object.fromEntries(availability.bookedSlots) :
//                 availability.bookedSlots || {};

//             // Get all bookings for this day
//             const dayBookings = bookings.filter(booking =>
//                 moment(booking.start_date).isSameOrBefore(day, 'day') &&
//                 moment(booking.end_date).isSameOrAfter(day, 'day')
//             );

//             // Calculate availability for each time slot
//             const timeSlots = {};
//             spaceType.allowedSlots.forEach(slot => {
//                 const bookingsForSlot = dayBookings.filter(booking =>
//                     booking.timeRanges.includes(slot)
//                 ).length;

//                 const bookedCount = (bookedSlots[slot] || 0) + bookingsForSlot;
//                 const available = room.roomSize - bookedCount;

//                 timeSlots[slot] = {
//                     available,
//                     booked: bookedCount,
//                     isAvailable: available > 0
//                 };
//             });

//             availabilityResponse.push({
//                 date: day.tz(timezone).format('YYYY-MM-DD'),
//                 day: day.tz(timezone).format('dddd'),
//                 availableSize: availability.availableSize,
//                 timeSlots,
//                 isAvailable: availability.availableSize > 0
//             });
//         }

//         return sendSuccess(res, 'Availability fetched successfully', {
//             roomId,
//             roomName: room.name,
//             roomSize: room.roomSize,
//             availability: availabilityResponse
//         });

//     } catch (error) {
//         console.error('Error fetching availability:', error);
//         return sendError(res, error, req);
//     }
// };