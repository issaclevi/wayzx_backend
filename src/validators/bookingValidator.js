import { check, body, validationResult } from 'express-validator';
import moment from 'moment';
import { sendErrorMessage } from '../utils/response.js';

const ALLOWED_MEETING_SLOTS = ['Morning', 'Afternoon'];
const ALLOWED_DURATIONS = ['4H', '6H', '8H', '10H', '16H'];

export const bookingValidationRules = [
  check('userId', 'User ID is required').notEmpty(),
  check('spaceType').optional().isString(),
  check('spaceTypeId').optional().isMongoId(),
  check('guests', 'Guests must be a number greater than 0').isInt({ min: 1 }),

  check('start_date')
    .notEmpty().withMessage('start_date is required')
    .custom(value => {
      if (!moment(value, 'YYYY-MM-DD', true).isValid()) {
        throw new Error('start_date must be in YYYY-MM-DD format');
      }
      return true;
    }),

  check('end_date')
    .notEmpty().withMessage('end_date is required')
    .custom(value => {
      if (!moment(value, 'YYYY-MM-DD', true).isValid()) {
        throw new Error('end_date must be in YYYY-MM-DD format');
      }
      return true;
    }),

  check('timeRanges')
    .isArray({ min: 1 }).withMessage('timeRanges must be an array of at least one slot (e.g., Morning, 4H)'),
  check('serviceFeeAndTax', 'Service fee and tax must be a number').isFloat({ min: 0 }),
  check('totalAmount', 'Total amount must be a number').isFloat({ min: 0 }),

  check('status')
    .optional()
    .isIn(['Booked', 'Cancelled', 'Pending'])
    .withMessage('Status must be Booked, Cancelled, or Pending'),

  // Slot validation based on spaceType
  body().custom(body => {
    const { timeRanges = [], spaceType } = body;
    if (!Array.isArray(timeRanges) || timeRanges.length === 0) return true;

    const normalizedType = (spaceType || '').toLowerCase();

    if (normalizedType === 'meeting room') {
      const invalid = timeRanges.filter(t => !ALLOWED_MEETING_SLOTS.includes(t));
      if (invalid.length > 0) throw new Error(`Invalid slot(s) for Meeting Room: ${invalid.join(', ')}`);
    }

    if (normalizedType === 'co-space room') {
      const invalid = timeRanges.filter(t => !ALLOWED_DURATIONS.includes(t.toUpperCase()));
      if (invalid.length > 0) throw new Error(`Invalid slot(s) for Co-Space Room: ${invalid.join(', ')}`);
    }

    return true;
  })
];

export const validateBooking = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array().map(err => err.msg).join(', ');
    return sendErrorMessage(res, message);
  }
  next();
};