import { check, validationResult } from 'express-validator';
import { sendErrorMessage } from '../utils/response.js';

export const bookingValidationRules = [
  check('userId', 'User ID is required').notEmpty(),
  check('location', 'Location is required').notEmpty(),
  check('title', 'Title is required').notEmpty(),
  check('spaceType', 'Space type is required').notEmpty(),
  check('guests', 'Guests must be a number greater than 0').isInt({ min: 1 }),
  check('bookingDate', 'Booking date is required and must be a valid date').isISO8601(),
  check('startTime', 'Start time is required and must be a valid time (hh:mm AM/PM)')
    .matches(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i),
  check('endTime', 'End time is required and must be a valid time (hh:mm AM/PM)')
    .matches(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i),
  check('name', 'Name is required').notEmpty(),
  check('email', 'Valid email is required').isEmail(),
  check('pricePerHour', 'Price per hour must be a number').isFloat({ min: 0 }),
  check('serviceFeeAndTax', 'Service fee and tax must be a number').isFloat({ min: 0 }),
  check('totalAmount', 'Total amount must be a number').isFloat({ min: 0 }),
  check('status')
    .optional()
    .isIn(['Booked', 'Cancelled', 'Pending'])
    .withMessage('Status must be Booked, Cancelled, or Pending'),
];

export const validateBooking = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendErrorMessage(res, errors.array().map((err) => err.msg).join(', '));
  }
  next();
};