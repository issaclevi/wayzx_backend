const { Router } = require('express');
const { getAllUsers } = require('../controllers/userController');

const router = Router();

router.get('/getAllUsers', getAllUsers);

module.exports = router;