// src/validators/authValidator.js
import { check, validationResult } from 'express-validator';
import { sendErrorMessage } from '../utils/response.js';

export const registerValidationRules = [
  check('name', 'First name is required').notEmpty(),
  check('phoneNumber', 'Phone Number is required').notEmpty(),
  check('email', 'Please provide a valid email').isEmail(),
  check('password', 'Password is required'),
];

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendErrorMessage(res, errors.array().map((err) => err.msg).join(', '));
  }
  next();
};
