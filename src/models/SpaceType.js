const mongoose = require('mongoose');

const SpaceTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    allowedSlots: [{ type: String }],
    slotBehavior: {
      type: String,
      enum: ['consecutive', 'full-block'],
      default: 'consecutive',
    },
    slotDuration: {
      type: Number,
      default: 1,
    },
    lastBookedAt: { type: Date },
    bookingsCount: { type: Number, default: 0 }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SpaceType', SpaceTypeSchema);
