import messages from '../../config/messages.js';
import Dashboard from '../../models/Dashboard.js';
import { successMessage, errorMessage } from '../../utils/messages.js';

const serialize = (d) => ({
    id: d.id,
    name: d.name,
    period: d.period,
    widgets: Array.isArray(d.widgets) ? d.widgets : [],
});

/** GET /dashboards */
export const listDashboards = async (req, res) => {
    const dashboards = await Dashboard.findAll({ order: [['id', 'ASC']] });
    return res.json(successMessage({ extra: { dashboards: dashboards.map(serialize) } }));
};

/** POST /dashboards */
export const createDashboard = async (req, res) => {
    const dashboard = await Dashboard.create({
        name: req.body.name,
        period: req.body.period || '28d',
        widgets: req.body.widgets || [],
    });
    return res.status(201).json(successMessage({ extra: { dashboard: serialize(dashboard) } }));
};

/** PUT /dashboards/:id */
export const updateDashboard = async (req, res) => {
    const dashboard = await Dashboard.findByPk(req.params.id);
    if (!dashboard) return res.status(404).json(errorMessage({ message: messages.dashboards.not_found }));

    const fields = {};
    if (req.body.name !== undefined) fields.name = req.body.name;
    if (req.body.period !== undefined) fields.period = req.body.period;
    if (req.body.widgets !== undefined) fields.widgets = req.body.widgets;

    await dashboard.update(fields);
    return res.json(successMessage({ extra: { dashboard: serialize(dashboard) } }));
};

/** DELETE /dashboards/:id */
export const deleteDashboard = async (req, res) => {
    const dashboard = await Dashboard.findByPk(req.params.id);
    if (!dashboard) return res.status(404).json(errorMessage({ message: messages.dashboards.not_found }));
    await dashboard.destroy();
    return res.json(successMessage({ extra: { deleted: true } }));
};
