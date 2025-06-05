const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
    sendSuccess,
    sendCreated,
    sendError,
    sendNotFound,
    sendErrorMessage
} = require('../utils/response');

module.exports = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return sendNotFound(res, 'No token provided');

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user || user.role !== 'Admin') return sendErrorMessage(res, 'Access denied');

        req.user = user;
        next();
    } catch (err) {
        return sendError(res, 'Invalid token');
    }
};