const { Router } = require('express');
const authRoutes = require('./auth');
const userRoutes = require('./user');
const bookingRoutes = require('./booking');
const roomRoutes = require('./room');

const router = Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/booking', bookingRoutes);
router.use('/room', roomRoutes);

module.exports = router;