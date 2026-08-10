import { Router } from 'express';
import validateToken from '../../middlewares/validate-token.js';
import { validate } from '../../utils/validate.js';
import {
    periodValidation, siteDetailValidation, exploreValidation,
} from '../../validations/metrics.validation.js';
import {
    overview, siteDetail, explore, exploreSchema,
} from '../../controllers/metrics/metrics.controllers.js';

const metrics = Router();

metrics.use(validateToken);

metrics.get('/overview', validate(periodValidation), overview);
// /explore/schema antes que /explore para que no lo tome como parámetro.
metrics.get('/explore/schema', exploreSchema);
metrics.get('/explore', validate(exploreValidation), explore);
metrics.get('/sites/:id', validate(siteDetailValidation), siteDetail);

export default metrics;
