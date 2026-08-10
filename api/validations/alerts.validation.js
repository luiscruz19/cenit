import { body, param, query } from 'express-validator';
import messages from '../config/messages.js';
import { ALERT_METRICS, OPERATORS } from '../services/alerts/catalog.js';

const METRICS = Object.keys(ALERT_METRICS);
const OPS = Object.keys(OPERATORS);
const SEVERITIES = ['info', 'warning', 'critical'];

export const createRuleValidation = [
    body('name').notEmpty().withMessage(messages.alerts.name_required),
    body('metric').isIn(METRICS).withMessage(messages.generic.invalid_enum_value),
    body('operator').isIn(OPS).withMessage(messages.generic.invalid_enum_value),
    body('threshold').isFloat().withMessage(messages.alerts.threshold_required),
    body('siteId').optional({ nullable: true }).isInt().withMessage(messages.generic.id_required),
    body('windowDays').optional().isInt({ min: 1, max: 90 }),
    body('severity').optional().isIn(SEVERITIES).withMessage(messages.generic.invalid_enum_value),
    body('cooldownHours').optional().isInt({ min: 0, max: 720 }),
];

export const updateRuleValidation = [
    param('id').isInt().withMessage(messages.generic.id_required),
    body('name').optional().notEmpty().withMessage(messages.alerts.name_required),
    body('metric').optional().isIn(METRICS).withMessage(messages.generic.invalid_enum_value),
    body('operator').optional().isIn(OPS).withMessage(messages.generic.invalid_enum_value),
    body('threshold').optional().isFloat().withMessage(messages.alerts.threshold_required),
    body('siteId').optional({ nullable: true }).isInt().withMessage(messages.generic.id_required),
    body('windowDays').optional().isInt({ min: 1, max: 90 }),
    body('severity').optional().isIn(SEVERITIES).withMessage(messages.generic.invalid_enum_value),
    body('cooldownHours').optional().isInt({ min: 0, max: 720 }),
];

export const idParamValidation = [
    param('id').isInt().withMessage(messages.generic.id_required),
];

export const eventsValidation = [
    query('siteId').optional().isInt().withMessage(messages.generic.id_required),
    query('limit').optional().isInt({ min: 1, max: 200 }),
];
