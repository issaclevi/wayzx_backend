const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    spaceType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SpaceType',
      required: true,
    },
    extraAmenity: {
      type: [String],
      default: []
    },
    guests: {
      type: Number,
      required: true,
      min: 1,
    },
    start_date: {
      type: Date,
      required: true,
    },
    end_date: {
      type: Date,
      required: true,
    },
    start_time: {
      type: String,
      required: true,
    },
    timeRanges: [{ type: String }],
    serviceFeeAndTax: {
      type: Number,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['Booked', 'Cancelled', 'Pending'],
      default: 'Pending',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Booking', bookingSchema);