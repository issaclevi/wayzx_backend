import { check, validationResult } from 'express-validator';
import { sendErrorMessage } from '../utils/response.js';

export const spaceTypeValidationRules = [
  check('name', 'Name is required').notEmpty(),
  check('name').isString().withMessage('Name must be a string'),
  
  check('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
  
  check('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be true or false'),
];

export const validateSpaceType = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendErrorMessage(res, errors.array().map((err) => err.msg).join(', '));
  }
  next();
};