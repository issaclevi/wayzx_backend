const { Router } = require('express');
const authRoutes = require('./auth');
const userRoutes = require('./user');
const bookingRoutes = require('./booking');
const roomRoutes = require('./room');
const fileRoutes = require('./fileUpload');
const spaceTypeRoutes = require('./spaceType');

const router = Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/booking', bookingRoutes);
router.use('/room', roomRoutes);
router.use('/file', fileRoutes);
router.use('/spacetype', spaceTypeRoutes);

module.exports = router;