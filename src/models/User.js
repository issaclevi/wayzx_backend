const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v);
        },
        message: 'Invalid email format',
      },
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: ['admin', 'user', 'moderator','hotel'],
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
    },
    password: {
      type: String,
      required: function () {
        return this.loginType === 'manual';
      },
    },
    loginType: {
      type: String,
      enum: ['manual', 'google', 'apple'],
      required: [true, 'Login type is required'],
    },
    loginTypeId: {
      type: String,
      default: null,
    },
    profilePic: {
      type: String,
      default: null,
    },
    deviceToken: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);