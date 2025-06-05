const { Router } = require('express');
const authRoutes = require('./auth');
const userRoutes = require('./user');
const bookingRoutes = require('./booking');
const roomRoutes = require('./room');
const fileRoutes = require('./fileUpload');
const spaceTypeRoutes = require('./spaceType');
const couponRoutes = require('./coupon');
const rewardRoutes = require('./reward');

const router = Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/booking', bookingRoutes);
router.use('/room', roomRoutes);
router.use('/file', fileRoutes);
router.use('/spacetype', spaceTypeRoutes);
router.use('/coupon', couponRoutes);
router.use('/reward', rewardRoutes);

module.exports = router;