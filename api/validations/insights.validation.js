import { param, query } from 'express-validator';
import messages from '../config/messages.js';

export const seoValidation = [
    query('siteId').optional().isInt().withMessage(messages.generic.id_required),
];

export const monthlyValidation = [
    param('id').isInt().withMessage(messages.generic.id_required),
];
