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

Site.hasMany(EtlRun, { foreignKey: 'site_id', as: 'etlRuns', constraints: false });
EtlRun.belongsTo(Site, { foreignKey: 'site_id', as: 'site', constraints: false });

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
};
