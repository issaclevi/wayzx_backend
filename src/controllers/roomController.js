const Room = require('../models/Rooms');
const moment = require('moment');
const Booking = require('../models/Bookings');
const mongoose = require('mongoose');
const {
  sendSuccess,
  sendCreated,
  sendError,
  sendErrorMessage,
  sendNotFound
} = require('../utils/response');

// Create a new room
exports.createRoom = async (req, res) => {
  try {
    const room = new Room(req.body);
    await room.save();
    return sendSuccess(res, 'Room created successfully', room);
  } catch (error) {
    console.error(error);
    return sendErrorMessage(res, error.message);
  }
};

// Get all rooms
exports.getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.find().sort({ createdAt: -1 })
    .populate('spaceTypeId', 'name');
    return sendSuccess(res, 'Rooms fetched successfully', rooms);
  } catch (error) {
    console.error(error);
    return sendError(res, error);
  }
};

exports.getRoomsBySpaceTypeId = async (req, res) => {
  try {
    const { spaceTypeId } = req.params;

    if (!spaceTypeId) {
      return sendError(res, 'Missing spaceTypeId');
    }

    if (!mongoose.Types.ObjectId.isValid(spaceTypeId)) {
      return sendError(res, 'Invalid spaceTypeId');
    }

    const rooms = await Room.find({ spaceTypeId })
      .populate('spaceTypeId', 'name');

    return sendSuccess(res, 'Rooms fetched successfully', rooms);
  } catch (error) {
    return sendError(res, error.message || 'Internal Server Error');
  }
};

// Get a single room by ID
exports.getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return sendNotFound(res, 'Room not found');
    }
    return sendSuccess(res, 'Room fetched successfully', room);
  } catch (error) {
    console.error(error);
    return sendError(res, error);
  }
};

// Update room by ID
exports.updateRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!room) {
      return sendNotFound(res, 'Room not found');
    }
    return sendSuccess(res, 'Room updated successfully', room);
  } catch (error) {
    console.error(error);
    return sendErrorMessage(res, error.message);
  }
};

// Delete room by ID
exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) {
      return sendNotFound(res, 'Room not found');
    }
    return sendSuccess(res, 'Room deleted successfully');
  } catch (error) {
    console.error(error);
    return sendError(res, error);
  }
};

// Get room availability for a date
exports.getRoomAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const room = await Room.findById(id);
    if (!room) return sendNotFound(res, 'Room not found');

    const start = startDate ? moment(startDate, 'YYYY-MM-DD') : moment();
    const end = endDate ? moment(endDate, 'YYYY-MM-DD') : moment(start);

    if (!start.isValid() || !end.isValid()) {
      return sendErrorMessage(res, 'Invalid date format. Use YYYY-MM-DD');
    }

    const days = [];
    const startHour = 8;
    const endHour = 20;
    const slotDuration = 30;

    for (let m = start.clone(); m.isSameOrBefore(end); m.add(1, 'days')) {
      const dateStr = m.format('YYYY-MM-DD');

      const bookings = await Booking.find({
        roomId: id,
        start_date: { $lte: new Date(dateStr + 'T23:59:59Z') },
        end_date: { $gte: new Date(dateStr + 'T00:00:00Z') },
        status: { $in: ['Booked', 'Confirmed'] }
      }).lean();

      const slots = [];

      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += slotDuration) {
          const slotStartMin = hour * 60 + minute;
          const slotEndMin = slotStartMin + slotDuration;

          let isBooked = false;

          for (const booking of bookings) {
            for (const range of booking.timeRanges || []) {
              let bookingStartMin, bookingEndMin;

              if (typeof range === 'string' && range.endsWith('H')) {
                const hours = parseInt(range);
                bookingStartMin = 8 * 60; //
                bookingEndMin = bookingStartMin + hours * 60;
              } else if (typeof range === 'object' && range.start && range.end) {
                bookingStartMin = timeToMinutes(range.start);
                bookingEndMin = timeToMinutes(range.end);
              } else {
                continue;
              }

              if (
                bookingStartMin !== -1 &&
                bookingEndMin !== -1 &&
                isTimeOverlapping(slotStartMin, slotEndMin, bookingStartMin, bookingEndMin)
              ) {
                isBooked = true;
                break;
              }
            }
            if (isBooked) break;
          }

          slots.push({
            start: formatTimeDisplay(slotStartMin),
            end: formatTimeDisplay(slotEndMin),
            status: isBooked ? 'Booked' : 'Available',
            isBooked
          });
        }
      }

      days.push({ date: dateStr, slots });
    }

    return sendSuccess(res, 'Room availability fetched', {
      room: room.title || room.name,
      spaceType: room.spaceType,
      location: room.location,
      range: {
        startDate: start.format('YYYY-MM-DD'),
        endDate: end.format('YYYY-MM-DD')
      },
      availability: days
    });
  } catch (error) {
    console.error(error);
    return sendError(res, error);
  }
};
