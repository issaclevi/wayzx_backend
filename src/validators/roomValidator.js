import { check, validationResult } from 'express-validator';
import { sendErrorMessage } from '../utils/response.js';

export const roomValidationRules = [
  check('name', 'Name is required').notEmpty(),
  check('description').optional().isString().withMessage('Description must be a string'),
  check('location', 'Location is required').notEmpty(),
  check('pricePerHour', 'Price per hour must be a number').isFloat({ min: 0 }),
  check('capacity', 'Capacity must be a number').isFloat({ min: 0 }),
  check('currency.code')
    .optional()
    .isString()
    .withMessage('Currency code must be a string'),
  check('currency.symbol')
    .optional()
    .isString()
    .withMessage('Currency symbol must be a string'),
  check('currency.name')
    .optional()
    .isString()
    .withMessage('Currency name must be a string'),
  check('imageUrl')
    .optional()
    .isURL()
    .withMessage('Image URL must be a valid URL'),
  check('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array'),
  check('amenities.*.name')
    .optional()
    .isString()
    .withMessage('Each amenity name must be a string'),
  check('amenities.*.imageUrl')
    .optional()
    .isURL()
    .withMessage('Each amenity image URL must be valid'),
];

export const validateRoom = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendErrorMessage(res, errors.array().map((err) => err.msg).join(', '));
  }
  next();
};