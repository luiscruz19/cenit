import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Auditoría de corridas de ETL (cron, manual o backfill).
 * `source` es STRING y no ENUM para poder sumar 'clarity' en fase 2 sin migrar.
 * `trigger_type` (no "trigger": palabra reservada de MySQL).
 */
const EtlRun = sequelize.define('etl_runs', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    trigger_type: {
        type: DataTypes.ENUM('cron', 'manual', 'backfill'),
        allowNull: false,
        defaultValue: 'manual',
    },
    source: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'all', // 'ga4' | 'gsc' | 'all'
    },
    // NULL = todos los sitios mapeados.
    site_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    date_from: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    date_to: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('running', 'success', 'partial', 'error'),
        allowNull: false,
        defaultValue: 'running',
    },
    // { sitesOk, sitesFailed: [{site, error}], rowsUpserted, apiCalls, chunksDone?, chunksTotal? }
    stats: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    error: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    started_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    finished_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'etl_runs',
    timestamps: true,
    paranoid: false,
    indexes: [
        { fields: ['status'] },
        { fields: ['started_at'] },
    ],
});

export default EtlRun;
