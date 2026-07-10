import messages from '../../config/messages.js';
import EtlRun from '../../models/EtlRun.js';
import Site from '../../models/Site.js';
import { runEtl, runBackfill, hasActiveRun } from '../../services/etl/runner.service.js';
import { successMessage, errorMessage } from '../../utils/messages.js';

/** POST /etl/run { source?, siteId?, from?, to? } → 202 { runId } */
export const triggerRun = async (req, res) => {
    if (await hasActiveRun()) {
        return res.status(409).json(errorMessage({ message: messages.etl.already_running }));
    }
    const { source = 'all', siteId = null, from = null, to = null } = req.body;
    const run = await runEtl({ triggerType: 'manual', source, siteId, from, to });
    return res.status(202).json(successMessage({ extra: { runId: run.id } }));
};

/** POST /etl/backfill { months? } → 202 { runId } */
export const triggerBackfill = async (req, res) => {
    if (await hasActiveRun()) {
        return res.status(409).json(errorMessage({ message: messages.etl.already_running }));
    }
    const run = await runBackfill({ months: req.body.months || undefined });
    return res.status(202).json(successMessage({ extra: { runId: run.id } }));
};

/** GET /etl/runs?limit=20 */
export const listRuns = async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const runs = await EtlRun.findAll({
        order: [['started_at', 'DESC']],
        limit,
        include: [{ model: Site, as: 'site', attributes: ['id', 'name', 'domain'] }],
    });
    return res.json(successMessage({ extra: { runs } }));
};

/** GET /etl/runs/:id */
export const getRun = async (req, res) => {
    const run = await EtlRun.findByPk(req.params.id, {
        include: [{ model: Site, as: 'site', attributes: ['id', 'name', 'domain'] }],
    });
    if (!run) return res.status(404).json(errorMessage({ message: messages.etl.run_not_found }));
    return res.json(successMessage({ extra: { run } }));
};
