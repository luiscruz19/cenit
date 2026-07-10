import { Router } from 'express';
import auth from './auth/index.js';
import sites from './sites/index.js';
import metrics from './metrics/index.js';
import etl from './etl/index.js';
import insights from './insights/index.js';

const api = Router();

api.get('/', (req, res) => res.json({ status: 1, service: 'cenit-api' }));

api.use('/auth', auth);
api.use('/sites', sites);
api.use('/metrics', metrics);
api.use('/etl', etl);
api.use('/insights', insights);

export default api;
