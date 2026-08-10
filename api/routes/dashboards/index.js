import { Router } from 'express';
import { body, param } from 'express-validator';
import validateToken from '../../middlewares/validate-token.js';
import { validate } from '../../utils/validate.js';
import messages from '../../config/messages.js';
import {
    listDashboards, createDashboard, updateDashboard, deleteDashboard,
} from '../../controllers/dashboards/dashboards.controllers.js';

const dashboards = Router();

dashboards.use(validateToken);

const PERIODS = ['7d', '28d', '90d'];

// La forma de cada widget la valida el frontend y, al pedir los datos, el propio
// Explorer descarta dimensiones y métricas que no existan en su catálogo.
const createValidation = [
    body('name').notEmpty().withMessage(messages.dashboards.name_required),
    body('period').optional().isIn(PERIODS).withMessage(messages.generic.invalid_enum_value),
    body('widgets').optional().isArray(),
];

const updateValidation = [
    param('id').isInt().withMessage(messages.generic.id_required),
    body('name').optional().notEmpty().withMessage(messages.dashboards.name_required),
    body('period').optional().isIn(PERIODS).withMessage(messages.generic.invalid_enum_value),
    body('widgets').optional().isArray(),
];

const idValidation = [param('id').isInt().withMessage(messages.generic.id_required)];

dashboards.get('/', listDashboards);
dashboards.post('/', validate(createValidation), createDashboard);
dashboards.put('/:id', validate(updateValidation), updateDashboard);
dashboards.delete('/:id', validate(idValidation), deleteDashboard);

export default dashboards;
