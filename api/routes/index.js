import { Router } from 'express';
import auth from './auth/index.js';
import sites from './sites/index.js';
import metrics from './metrics/index.js';
import etl from './etl/index.js';
import insights from './insights/index.js';
import alerts from './alerts/index.js';
import reports from './reports/index.js';
import dashboards from './dashboards/index.js';
import siteSummary from './site-summary/index.js';

const api = Router();

api.get('/', (req, res) => res.json({ status: 1, service: 'cenit-api' }));

api.use('/auth', auth);
api.use('/sites', sites);
api.use('/metrics', metrics);
api.use('/etl', etl);
api.use('/insights', insights);
api.use('/alerts', alerts);
api.use('/reports', reports);
api.use('/dashboards', dashboards);
// De servidor a servidor, con el token del sitio (no con la sesión de Google).
api.use('/site-summary', siteSummary);

export default api;
