import { param, query } from 'express-validator';
import messages from '../config/messages.js';

export const periodValidation = [
    query('period').optional().isIn(['7d', '28d', '90d']).withMessage(messages.generic.invalid_enum_value),
];

export const siteDetailValidation = [
    param('id').isInt().withMessage(messages.generic.id_required),
    ...periodValidation,
];

/**
 * El detalle de dimensiones/métricas lo valida el propio servicio contra su catálogo
 * (descarta las claves que no existan), así que acá solo se chequea la forma.
 */
export const exploreValidation = [
    query('dataset').optional().isString(),
    query('siteId').optional().isInt().withMessage(messages.generic.id_required),
    query('limit').optional().isInt({ min: 1, max: 1000 }),
    ...periodValidation,
];
