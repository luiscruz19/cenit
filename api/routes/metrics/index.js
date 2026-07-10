import { Router } from 'express';
import validateToken from '../../middlewares/validate-token.js';
import { validate } from '../../utils/validate.js';
import { periodValidation, siteDetailValidation } from '../../validations/metrics.validation.js';
import { overview, siteDetail } from '../../controllers/metrics/metrics.controllers.js';

const metrics = Router();

metrics.use(validateToken);

metrics.get('/overview', validate(periodValidation), overview);
metrics.get('/sites/:id', validate(siteDetailValidation), siteDetail);

export default metrics;
