const express = require('express');
const router = express.Router();
const { createCoupon, getCoupons, updateCoupon, deleteCoupon } = require('../controllers/couponController');

router.post('/create-coupon', createCoupon);
router.get('/getallcoupons', getCoupons);
router.put('/update-coupon/:id/', updateCoupon);
router.delete('/delete-coupon/:id', deleteCoupon);

module.exports = router;