const mongoose = require('mongoose');

const roomAvailabilitySchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    availableSize: {
      type: Number,
      required: true,
      min: 0,
    },
    bookedSlots: {
      type: Map,
      of: {
        type: Number,
        min: 0,
        default: 0
      },
      default: {}
    }
  },
  {
    timestamps: true,
  }
);

roomAvailabilitySchema.index({ roomId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('RoomAvailability', roomAvailabilitySchema);