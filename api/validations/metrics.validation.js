import { param, query } from 'express-validator';
import messages from '../config/messages.js';

export const periodValidation = [
    query('period').optional().isIn(['7d', '28d', '90d']).withMessage(messages.generic.invalid_enum_value),
];

export const siteDetailValidation = [
    param('id').isInt().withMessage(messages.generic.id_required),
    ...periodValidation,
];
