import { Router } from 'express';
import validateToken from '../../middlewares/validate-token.js';
import { validate } from '../../utils/validate.js';
import {
    seoValidation, monthlyValidation, rankingsValidation, rankingHistoryValidation,
    strategiesValidation,
} from '../../validations/insights.validation.js';
import {
    health, seoOpportunities, monthly, rankings, rankingHistory, strategies, clarity,
} from '../../controllers/insights/insights.controllers.js';

const insights = Router();

insights.use(validateToken);

insights.get('/health', health);
insights.get('/seo-opportunities', validate(seoValidation), seoOpportunities);
// /rankings/history antes que /rankings para que no lo capture como query string suelto.
insights.get('/rankings/history', validate(rankingHistoryValidation), rankingHistory);
insights.get('/rankings', validate(rankingsValidation), rankings);
insights.get('/strategies', validate(strategiesValidation), strategies);
insights.get('/clarity', validate(strategiesValidation), clarity);
insights.get('/monthly/:id', validate(monthlyValidation), monthly);

export default insights;
