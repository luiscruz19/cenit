import { Router } from 'express';
import validateToken from '../../middlewares/validate-token.js';
import { validate } from '../../utils/validate.js';
import { seoValidation, monthlyValidation } from '../../validations/insights.validation.js';
import { health, seoOpportunities, monthly } from '../../controllers/insights/insights.controllers.js';

const insights = Router();

insights.use(validateToken);

insights.get('/health', health);
insights.get('/seo-opportunities', validate(seoValidation), seoOpportunities);
insights.get('/monthly/:id', validate(monthlyValidation), monthly);

export default insights;
