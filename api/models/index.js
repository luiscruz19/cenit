import sequelize from '../db/sequelize.js';

import Site from './Site.js';
import GoogleAccount from './GoogleAccount.js';
import GaDailyMetric from './GaDailyMetric.js';
import GaDailyChannel from './GaDailyChannel.js';
import GaDailyPage from './GaDailyPage.js';
import GaDailyDevice from './GaDailyDevice.js';
import GscDailyTotal from './GscDailyTotal.js';
import GscDailyQuery from './GscDailyQuery.js';
import GscDailyPage from './GscDailyPage.js';
import EtlRun from './EtlRun.js';
import AlertRule from './AlertRule.js';
import AlertEvent from './AlertEvent.js';
import Report from './Report.js';
import ReportSend from './ReportSend.js';
import Dashboard from './Dashboard.js';
import ClarityDailyMetric from './ClarityDailyMetric.js';

/**
 * Asociaciones.
 * FK lógicas (constraints:false): la relación existe para los includes/queries pero
 * no se crea FK física, igual que en el resto de los proyectos. Evita conflictos de
 * sync y permite borrar/upsertear métricas en bulk sin orden estricto.
 */
const metricModels = [
    [GaDailyMetric, 'gaDailyMetrics'],
    [GaDailyChannel, 'gaDailyChannels'],
    [GaDailyPage, 'gaDailyPages'],
    [GaDailyDevice, 'gaDailyDevices'],
    [GscDailyTotal, 'gscDailyTotals'],
    [GscDailyQuery, 'gscDailyQueries'],
    [GscDailyPage, 'gscDailyPages'],
];

for (const [Model, as] of metricModels) {
    Site.hasMany(Model, { foreignKey: 'site_id', as, constraints: false });
    Model.belongsTo(Site, { foreignKey: 'site_id', as: 'site', constraints: false });
}

Site.hasMany(ClarityDailyMetric, { foreignKey: 'site_id', as: 'clarityDailyMetrics', constraints: false });
ClarityDailyMetric.belongsTo(Site, { foreignKey: 'site_id', as: 'site', constraints: false });

Site.hasMany(EtlRun, { foreignKey: 'site_id', as: 'etlRuns', constraints: false });
EtlRun.belongsTo(Site, { foreignKey: 'site_id', as: 'site', constraints: false });

// Alertas. site_id de la regla puede ser NULL (= todos los sitios), por eso solo el
// evento tiene una relación fuerte con el sitio.
Site.hasMany(AlertEvent, { foreignKey: 'site_id', as: 'alertEvents', constraints: false });
AlertEvent.belongsTo(Site, { foreignKey: 'site_id', as: 'site', constraints: false });
AlertRule.hasMany(AlertEvent, { foreignKey: 'rule_id', as: 'events', constraints: false });
AlertEvent.belongsTo(AlertRule, { foreignKey: 'rule_id', as: 'rule', constraints: false });

// Reportes. site_id puede ser NULL (= reporte del portfolio completo).
Report.hasMany(ReportSend, { foreignKey: 'report_id', as: 'sends', constraints: false });
ReportSend.belongsTo(Report, { foreignKey: 'report_id', as: 'report', constraints: false });

export {
    sequelize,
    Site,
    GoogleAccount,
    GaDailyMetric,
    GaDailyChannel,
    GaDailyPage,
    GaDailyDevice,
    GscDailyTotal,
    GscDailyQuery,
    GscDailyPage,
    EtlRun,
    AlertRule,
    AlertEvent,
    Report,
    ReportSend,
    Dashboard,
    ClarityDailyMetric,
};

export default {
    sequelize,
    Site,
    GoogleAccount,
    GaDailyMetric,
    GaDailyChannel,
    GaDailyPage,
    GaDailyDevice,
    GscDailyTotal,
    GscDailyQuery,
    GscDailyPage,
    EtlRun,
    AlertRule,
    AlertEvent,
    Report,
    ReportSend,
    Dashboard,
    ClarityDailyMetric,
};
