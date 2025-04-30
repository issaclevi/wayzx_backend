const { Router } = require('express');
const { loginUser, registerUser } = require('../controllers/authController');
const { registerValidationRules, validate } = require('../validators/authValidator');

const router = Router();

router.post('/register', 
  registerValidationRules,
  validate,
  registerUser
);

router.post('/login', loginUser);

module.exports = router;