import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import validateSiteToken from '../../middlewares/validate-site-token.js';
import { validate } from '../../utils/validate.js';
import { periodValidation } from '../../validations/metrics.validation.js';
import { siteSummary } from '../../controllers/site-summary/site-summary.controllers.js';

/**
 * GET /site-summary?period=28d — el resumen de un sitio para su escritorio de wp-admin, de
 * servidor a servidor. El sitio guarda la respuesta una hora: 60 pedidos por hora y token sobran.
 */
const siteSummaryRoutes = Router();

siteSummaryRoutes.use(validateSiteToken);
siteSummaryRoutes.use(rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `token-${req.siteToken.id}`,
    message: { status: 0, message: 'Demasiados pedidos: probá de nuevo en una hora.' },
}));
siteSummaryRoutes.get('/', validate(periodValidation), siteSummary);

export default siteSummaryRoutes;
