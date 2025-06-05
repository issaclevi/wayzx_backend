const Coupon = require('../models/Coupon');
const { sendSuccess, sendErrorMessage, sendError } = require('../utils/response');
const moment = require('moment-timezone');

exports.createCoupon = async (req, res) => {
    try {
        const coupon = new Coupon(req.body);
        await coupon.save();
        return sendSuccess(res, 'Coupon created successfully', coupon);
    } catch (error) {
        return sendError(res, error, req);
    }
};

exports.getCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 })
        .populate('applicableSpaceTypes applicableRooms applicableUsers');
        return sendSuccess(res, 'Coupons retrieved successfully', coupons);
    } catch (error) {
        return sendError(res, error, req);
    }
};

exports.getCouponById = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) return sendErrorMessage(res, 'Coupon not found', req);
        return sendSuccess(res, 'Coupon found', coupon);
    } catch (err) {
        return sendError(res, err, req);
    }
};

exports.updateCoupon = async (req, res) => {
    try {
        const updated = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return sendErrorMessage(res, 'Coupon not found', req);
        return sendSuccess(res, 'Coupon updated successfully', updated);
    } catch (err) {
        return sendError(res, err, req);
    }
};

exports.deleteCoupon = async (req, res) => {
    try {
        const deleted = await Coupon.findByIdAndDelete(req.params.id);
        if (!deleted) return sendErrorMessage(res, 'Coupon not found', req);
        return sendSuccess(res, 'Coupon deleted successfully', deleted);
    } catch (err) {
        return sendError(res, err, req);
    }
};

exports.applyCoupon = async (req, res) => {
    try {
        const { couponCode, userId, roomId, spaceTypeId, totalAmount } = req.body;

        const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
        if (!coupon) return sendErrorMessage(res, 'Coupon not found or inactive', req);

        if (new Date() > coupon.expiryDate) {
            return sendErrorMessage(res, 'Coupon has expired', req);
        }

        if (coupon.usedCount >= coupon.usageLimit) {
            return sendErrorMessage(res, 'Coupon usage limit reached', req);
        }

        if (totalAmount < coupon.minPurchaseAmount) {
            return sendErrorMessage(res, `Minimum purchase amount for this coupon is ₹${coupon.minPurchaseAmount}`, req);
        }

        if (
            coupon.applicableUsers.length &&
            !coupon.applicableUsers.map(String).includes(userId)
        ) {
            return sendErrorMessage(res, 'Coupon not valid for this user', req);
        }

        if (
            coupon.applicableRooms.length &&
            !coupon.applicableRooms.map(String).includes(roomId)
        ) {
            return sendErrorMessage(res, 'Coupon not valid for this room', req);
        }

        if (
            coupon.applicableSpaceTypes.length &&
            !coupon.applicableSpaceTypes.map(String).includes(spaceTypeId)
        ) {
            return sendErrorMessage(res, 'Coupon not valid for this space type', req);
        }

        let discount = 0;
        if (coupon.discountType === 'amount') {
            discount = coupon.discountValue;
        } else if (coupon.discountType === 'percentage') {
            discount = (totalAmount * coupon.discountValue) / 100;
            if (coupon.maxDiscount && discount > coupon.maxDiscount) {
                discount = coupon.maxDiscount;
            }
        }

        const discountedAmount = Math.max(totalAmount - discount, 0);

        return sendSuccess(res, 'Coupon applied successfully', {
            discount,
            discountedAmount,
            couponCode: coupon.code
        });

    } catch (error) {
        return sendError(res, error, req);
    }
};