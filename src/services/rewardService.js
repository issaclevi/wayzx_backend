const mongoose = require('mongoose');
const RewardSetting = require('../models/Reward');
const UserReward = require('../models/UserReward');

class RewardService {
  // Get current settings with validation
  static async getSettings() {
    let settings = await RewardSetting.findOne();
    if (!settings) {
      settings = await RewardSetting.create({});
    }
    return settings;
  }

  // Update settings with admin logging
  static async updateSettings(updateData, adminUser, ipAddress, reason = '') {
    const updates = { ...updateData };

    // Apply business rule minimums
    if (updates.pointsPerBooking !== undefined) {
      updates.pointsPerBooking = Math.max(updates.pointsPerBooking, 1);
    }

    const changeEntry = {
      changedBy: adminUser._id,
      ipAddress,
      changes: updates,
      reason
    };

    return await RewardSetting.findOneAndUpdate(
      {},
      {
        ...updates,
        $push: { changeLog: changeEntry }
      },
      { new: true, upsert: true }
    );
  }

  // Add points to user with expiry
  static async addPoints(userId, points, options = {}) {
    const settings = await this.getSettings();
    const expiresAt = settings.pointsExpiryDays > 0 ?
      new Date(Date.now() + settings.pointsExpiryDays * 24 * 60 * 60 * 1000) :
      null;

    return await UserReward.findOneAndUpdate(
      { userId },
      {
        $inc: {
          totalPoints: points,
          'lifetimePoints.earned': points
        },
        $push: {
          history: {
            action: options.action || 'Earned',
            points,
            bookingId: options.bookingId,
            note: options.note || `Points earned`,
            createdBy: options.createdBy || userId,
            ipAddress: options.ipAddress,
            expiresAt
          }
        }
      },
      { new: true, upsert: true }
    );
  }

  // Deduct points from user
  static async deductPoints(userId, points, options = {}) {
    const userReward = await UserReward.findOne({ userId });
    if (!userReward || userReward.totalPoints < points) {
      throw new Error('Insufficient reward points');
    }

    return await UserReward.findOneAndUpdate(
      { userId },
      {
        $inc: {
          totalPoints: -points,
          'lifetimePoints.used': points
        },
        $push: {
          history: {
            action: options.action || 'Used',
            points: -points,
            bookingId: options.bookingId,
            note: options.note || `Points used`,
            createdBy: options.createdBy || userId,
            ipAddress: options.ipAddress
          }
        }
      },
      { new: true }
    );
  }

  // At the end of RewardService class
  static async getAllUsersRewards(query) {
    const { userId } = query;
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (userId) {
      filter.userId = new mongoose.Types.ObjectId(userId);
    }

    // await UserReward.deleteMany({ });
    
    const total = await UserReward.countDocuments(filter);
    const data = await UserReward.find(filter)
      .populate('userId', 'name email profilePic')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return {
      data,
      // meta: {
      //   total,
      //   page,
      //   limit,
      //   totalPages: Math.ceil(total / limit)
      // }
    };
  }

  // Get user's reward points with expiry check
  static async getUserPoints(userId) {
    const result = await UserReward.findOne({ userId });
    if (!result) return await UserReward.create({ userId });

    // Check for expired points
    const expiredPoints = result.history
      .filter(h => h.expiresAt && h.expiresAt <= new Date() && h.action === 'Earned')
      .reduce((sum, h) => sum + h.points, 0);

    if (expiredPoints > 0) {
      return await this.deductPoints(userId, expiredPoints, {
        action: 'Expired',
        note: 'Points expired',
        createdBy: 'system'
      });
    }

    return result;
  }

  // Calculate maximum points that can be used for a booking
  static async calculateDiscountFromPoints(userId, bookingAmount) {
    const settings = await this.getSettings();
    const userReward = await this.getUserPoints(userId);

    const maxDiscountAmount = bookingAmount * (settings.maxPointsRedeemPercentage / 100);
    const maxPointsAllowed = maxDiscountAmount * settings.pointToCurrencyRate;

    const pointsToUse = Math.min(userReward.totalPoints, maxPointsAllowed);
    const discountAmount = pointsToUse / settings.pointToCurrencyRate;

    return {
      pointsToUse,
      discountAmount,
      remainingPoints: userReward.totalPoints - pointsToUse
    };
  }
}

module.exports = RewardService;