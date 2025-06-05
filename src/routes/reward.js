const express = require('express');
const router = express.Router();
const { getAllUsersRewards, } = require('../controllers/rewardController');

// router.post('/create-spacetype', getAllUsersRewards);
router.get('/getallrewards', getAllUsersRewards);

module.exports = router;