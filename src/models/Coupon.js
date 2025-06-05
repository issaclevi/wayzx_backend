const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  discountType: {
    type: String,
    enum: ['Amount', 'Percentage'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 1
  },
  maxDiscount: {
    type: Number,
    default: null
  },
  minPurchaseAmount: {
    type: Number,
    default: 0
  },
  expiryDate: {
    type: Date,
    required: true
  },
  usageLimit: {
    type: Number,
    default: 1
  },
  usedCount: {
    type: Number,
    default: 0
  },
  applicableSpaceTypes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SpaceType'
  }],
  applicableRooms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  }],
  applicableUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Coupon', couponSchema);
