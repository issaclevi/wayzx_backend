const UserReward = require('../models/User');
const Reward = require('../models/Reward');
const {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendErrorMessage
} = require('../utils/response');
const RewardService = require('../services/rewardService');

exports.modifyUserPoints = async (req, res) => {

  const { userId, points, note, action } = req.body;

  if (!['Admin Added', 'Admin Removed'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Invalid action' });
  }

  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const reward = await UserReward.findOneAndUpdate(
    { userId },
    {
      $inc: { totalPoints: action === 'Admin Added' ? points : -points },
      $push: {
        history: {
          action,
          points,
          note,
          createdBy: req.user._id,
          ipAddress: ip
        }
      }
    },
    { new: true, upsert: true }
  );

  return res.status(200).json({ success: true, message: 'Points updated', data: reward });
};

exports.getAllUsersRewards = async (req, res) => {
  try {

    // if (!req.user.isAdmin) return sendErrorMessage(res, 'Unauthorized', req, 403);
    console.log('Fetching all users rewards with query:', req.query);

    const result = await RewardService.getAllUsersRewards(req.query);

    return sendSuccess(res, 'Users reward points retrieved', {
      users: result.data,
      pagination: result.meta
    });
  } catch (error) {
    console.error('Failed to get all users rewards:', error);
    return sendError(res, error, req);
  }
};

exports.getUserRewards = async (req, res) => {
  try {
    const userId = req.user._id;

    const userReward = await RewardService.getUserPoints(userId);
    const settings = await RewardService.getSettings();

    return sendSuccess(res, 'Reward points retrieved', {
      totalPoints: userReward.totalPoints,
      lifetimePoints: userReward.lifetimePoints,
      pointValue: 1 / settings.pointToCurrencyRate,
      minBookingForPoints: settings.minBookingAmountForPoints,
      pointsPerBooking: settings.pointsPerBooking,
      maxRedeemPercentage: settings.maxPointsRedeemPercentage
    });
  } catch (error) {
    console.error('Failed to get user rewards:', error);
    return sendError(res, error, req);
  }
};