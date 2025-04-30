const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendCreated, sendErrorMessage, sendError, sendSuccess } = require('../utils/response');
require('dotenv').config();

exports.registerUser = async (req, res, next) => {
  try {
    const { name, phoneNumber, email, password, role, loginType, loginTypeId, profilePic, deviceToken } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phoneNumber }],
    });

    if (existingUser) {
      return sendErrorMessage(res, 'Email or phone number already exists');
    }

    const userData = {
      name,
      phoneNumber,
      email,
      role: role || 'user',
      loginType,
      loginTypeId: loginTypeId || null,
      profilePic: profilePic || null,
      deviceToken: deviceToken || null,
    };

    if (loginType === 'manual') {
      if (!password || password.length < 6) {
        return sendErrorMessage(res, 'Password is required');
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      userData.password = hashedPassword;
    }

    const newUser = new User(userData);
    const savedUser = await newUser.save();

    sendCreated(res, 'User registered successfully', savedUser);

  } catch (error) {
    sendError(res, error);
  }
};

exports.loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendErrorMessage(res, 'Missing required fields: email and password');
    }

    const user = await User.findOne({
      $or: [{ phoneNumber: email }, { email: email }],
    });

    if (!user) {
      return sendErrorMessage(res, 'Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendErrorMessage(res, 'Invalid credentials');
    }

    const accessToken = jwt.sign(
      { _id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const refreshToken = jwt.sign(
      { _id: user._id, email: user.email, role: user.role, refresh: true },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'Lax'
    });

    sendSuccess(res, 'Login successful', {
      _id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isActive: user.isActive,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    sendError(res, error);
  }
};

exports.validateToken = (req, res) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token' });
  }

  sendSuccess({ message: 'Token is valid', accessToken: token });
};

exports.refreshToken = (req, res) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ message: 'No refresh token' });
  }

  const newAccessToken = 'newsampleaccesstoken456';

  res.cookie('accessToken', newAccessToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'Lax'
  });

  sendSuccess({ message: 'Token refreshed', accessToken: newAccessToken });
};