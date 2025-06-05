const mongoose = require('mongoose');

const rewardSettingLogSchema = new mongoose.Schema({
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  changedAt: { type: Date, default: Date.now },
  ipAddress: String,
  changes: Object,
  reason: String
});

const rewardSettingSchema = new mongoose.Schema({
  pointToCurrencyRate: {
    type: Number,
    required: true,
    min: 1,
    default: 10
  },
  pointsPerBooking: {
    type: Number,
    required: true,
    min: 1,
    default: 5
  },
  minBookingAmountForPoints: {
    type: Number,
    min: 0,
    default: 1000
  },
  maxPointsRedeemPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 20
  },
  pointsExpiryDays: {
    type: Number,
    min: 0,
    default: 365
  },
  changeLog: [rewardSettingLogSchema]
}, { timestamps: true });

// Validation middleware
rewardSettingSchema.pre('save', function(next) {
  if (this.isModified('pointsPerBooking') && this.pointsPerBooking < 1) {
    throw new Error('pointsPerBooking must be at least 1');
  }
  next();
});

module.exports = mongoose.model('Reward', rewardSettingSchema);