import { param, query } from 'express-validator';
import messages from '../config/messages.js';

export const seoValidation = [
    query('siteId').optional().isInt().withMessage(messages.generic.id_required),
];

export const monthlyValidation = [
    param('id').isInt().withMessage(messages.generic.id_required),
];

const periodQuery = query('period').optional()
    .isIn(['7d', '28d', '90d']).withMessage(messages.generic.invalid_enum_value);

export const rankingsValidation = [
    query('siteId').optional().isInt().withMessage(messages.generic.id_required),
    query('bucket').optional().isIn(['top3', 'top10', 'page2', 'rest'])
        .withMessage(messages.generic.invalid_enum_value),
    query('limit').optional().isInt({ min: 1, max: 500 }),
    periodQuery,
];

export const rankingHistoryValidation = [
    query('siteId').isInt().withMessage(messages.generic.id_required),
    query('query').notEmpty().withMessage('La consulta es obligatoria'),
    periodQuery,
];

export const strategiesValidation = [
    query('siteId').isInt().withMessage(messages.generic.id_required),
    periodQuery,
];
