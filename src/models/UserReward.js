const mongoose = require('mongoose');

const userRewardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  lifetimePoints: {
    earned: { type: Number, default: 0 },
    used: { type: Number, default: 0 }
  },
  history: [{
    action: { 
      type: String, 
      enum: ['Earned', 'Used', 'Admin Added', 'Admin Removed', 'Expired'], 
      required: true 
    },
    points: Number,
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    note: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ipAddress: String,
    expiresAt: { type: Date }
  }]
}, { timestamps: true });

// Index for faster querying
userRewardSchema.index({ userId: 1 });
userRewardSchema.index({ 'history.expiresAt': 1 });

module.exports = mongoose.model('UserReward', userRewardSchema);