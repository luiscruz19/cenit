import { body, param } from 'express-validator';
import messages from '../config/messages.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const runValidation = [
    body('source').optional().isIn(['all', 'ga4', 'gsc']).withMessage(messages.generic.invalid_enum_value),
    body('siteId').optional({ values: 'null' }).isInt().withMessage(messages.generic.id_required),
    body('from').optional({ values: 'null' }).matches(DATE_RE).withMessage(messages.generic.invalid_date_format),
    body('to').optional({ values: 'null' }).matches(DATE_RE).withMessage(messages.generic.invalid_date_format),
];

export const backfillValidation = [
    body('months').optional().isInt({ min: 1, max: 16 }).withMessage('months debe estar entre 1 y 16'),
];

export const runIdValidation = [
    param('id').isInt().withMessage(messages.generic.id_required),
];
