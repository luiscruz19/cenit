import { body, param, query } from 'express-validator';
import messages from '../config/messages.js';

const PERIODS = ['7d', '28d', '90d'];
const FREQUENCIES = ['none', 'weekly', 'monthly'];

export const createReportValidation = [
    body('name').notEmpty().withMessage(messages.reports.name_required),
    body('siteId').optional({ nullable: true }).isInt().withMessage(messages.generic.id_required),
    body('period').optional().isIn(PERIODS).withMessage(messages.generic.invalid_enum_value),
    body('scheduleFrequency').optional().isIn(FREQUENCIES).withMessage(messages.generic.invalid_enum_value),
    // weekly: 0-6 (domingo a sábado). monthly: 1-28, para que exista en todos los meses.
    body('scheduleDay').optional().isInt({ min: 0, max: 28 }),
    body('scheduleHour').optional().isInt({ min: 0, max: 23 }),
    body('sections').optional().isObject(),
];

export const updateReportValidation = [
    param('id').isInt().withMessage(messages.generic.id_required),
    body('name').optional().notEmpty().withMessage(messages.reports.name_required),
    body('siteId').optional({ nullable: true }).isInt().withMessage(messages.generic.id_required),
    body('period').optional().isIn(PERIODS).withMessage(messages.generic.invalid_enum_value),
    body('scheduleFrequency').optional().isIn(FREQUENCIES).withMessage(messages.generic.invalid_enum_value),
    body('scheduleDay').optional().isInt({ min: 0, max: 28 }),
    body('scheduleHour').optional().isInt({ min: 0, max: 23 }),
    body('sections').optional().isObject(),
];

export const idParamValidation = [
    param('id').isInt().withMessage(messages.generic.id_required),
];

export const sendsValidation = [
    query('reportId').optional().isInt().withMessage(messages.generic.id_required),
    query('limit').optional().isInt({ min: 1, max: 100 }),
];
