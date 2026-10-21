import { successMessage } from '../../utils/messages.js';
import { getSiteSummary } from '../../services/site-summary/site-summary.service.js';

export const siteSummary = async (req, res) => {
    const summary = await getSiteSummary(req.site, req.query.period || '28d');
    res.set('Cache-Control', 'private, no-store');
    res.json(successMessage({ extra: summary }));
};
