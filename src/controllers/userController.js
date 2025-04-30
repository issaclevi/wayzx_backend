const User = require('../models/User');
const {  sendError, sendSuccess } = require('../utils/response');


exports.getAllUsers = async (req, res) => {
    try {
      const users = await User.find()
        .sort({ createdAt: -1 })
        .select('-password');
  
      sendSuccess(res, 'Users fetched successfully', users);
    } catch (error) {
      sendError(res, error);
    }
  };
  