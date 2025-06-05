const RoomAvailability = require('../models/RoomAvailability');
const Booking = require('../models/Booking');
const moment = require('moment');

exports.rollbackBookedSlots = async (bookingId) => {
  const booking = await Booking.findOne({ bookingId });
  if (!booking) return;

  const start = moment(booking.start_date).startOf('day');
  const end = moment(booking.end_date).startOf('day');

  for (let day = moment(start); day.isSameOrBefore(end); day.add(1, 'day')) {
    const dateOnly = day.clone().toDate();
    const updateObj = { $inc: {} };

    booking.timeRanges.forEach(slot => {
      updateObj.$inc[`bookedSlots.${slot}`] = -1;
    });

    await RoomAvailability.updateOne(
      { roomId: booking.roomId, date: dateOnly },
      updateObj
    );
  }
};