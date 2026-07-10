import { body, param } from 'express-validator';
import messages from '../config/messages.js';

export const createSiteValidation = [
    body('name').notEmpty().withMessage(messages.site.fields_empty.name),
    body('domain').notEmpty().withMessage(messages.site.fields_empty.domain),
];

export const updateSiteValidation = [
    param('id').isInt().withMessage(messages.generic.id_required),
    body('name').optional().notEmpty().withMessage(messages.site.fields_empty.name),
    body('domain').optional().notEmpty().withMessage(messages.site.fields_empty.domain),
];

export const idParamValidation = [
    param('id').isInt().withMessage(messages.generic.id_required),
];

export const mappingValidation = [
    body('mappings').isArray({ min: 1 }).withMessage('mappings debe ser un array no vacío'),
    body('mappings.*.siteId').isInt().withMessage(messages.generic.id_required),
];
