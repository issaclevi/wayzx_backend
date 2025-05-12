import { check, body, validationResult } from 'express-validator';
import moment from 'moment';
import { sendErrorMessage } from '../utils/response.js';

export const bookingValidationRules = [
  check('userId', 'User ID is required').notEmpty(),
  check('location', 'Location is required').notEmpty(),
  check('title', 'Title is required').notEmpty(),
  check('spaceType', 'Space type is required').notEmpty(),
  check('guests', 'Guests must be a number greater than 0').isInt({ min: 1 }),

  check('start_date')
    .notEmpty().withMessage('start_date is required')
    .custom(value => {
      const isValid = moment(value, 'YYYY-MM-DD', true).isValid();
      if (!isValid) {
        throw new Error('start_date must be in YYYY-MM-DD format');
      }
      return true;
    }),

  check('end_date')
    .notEmpty().withMessage('end_date is required')
    .custom(value => {
      const isValid = moment(value, 'YYYY-MM-DD', true).isValid();
      if (!isValid) {
        throw new Error('end_date must be in YYYY-MM-DD format');
      }
      return true;
    }),

  check('timeRanges')
    .isArray({ min: 1 }).withMessage('timeRanges must be an array of at least one range'),

  check('timeRanges.*.start')
    .matches(/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i)
    .withMessage('Each timeRange.start must be in hh:mm AM/PM format'),

  check('timeRanges.*.end')
    .matches(/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i)
    .withMessage('Each timeRange.end must be in hh:mm AM/PM format'),

  check('name', 'Name is required').notEmpty(),
  check('email', 'Valid email is required').isEmail(),
  check('pricePerHour', 'Price per hour must be a number').isFloat({ min: 0 }),
  check('serviceFeeAndTax', 'Service fee and tax must be a number').isFloat({ min: 0 }),
  check('totalAmount', 'Total amount must be a number').isFloat({ min: 0 }),

  check('status')
    .optional()
    .isIn(['Booked', 'Cancelled', 'Pending'])
    .withMessage('Status must be Booked, Cancelled, or Pending'),

  body().custom(body => {
    const [startTime, startPeriod] = body?.timeRange?.start?.split(' ') || [];
    const [endTime, endPeriod] = body?.timeRange?.end?.split(' ') || [];

    const toMinutes = (time, period) => {
      if (!time || !period) return -1;
      let [h, m] = time.split(':').map(Number);
      if (period.toUpperCase() === 'PM' && h !== 12) h += 12;
      if (period.toUpperCase() === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };

    const start = toMinutes(startTime, startPeriod);
    const end = toMinutes(endTime, endPeriod);

    if (start >= 0 && end >= 0 && end <= start) {
      throw new Error('timeRange.end must be after timeRange.start');
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