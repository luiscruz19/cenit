import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Totales GA4 por sitio/día. El ETL upsertea sobre el unique (site_id, date):
 * re-correr un rango es idempotente.
 */
const GaDailyMetric = sequelize.define('ga_daily_metrics', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    site_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    sessions: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
    },
    total_users: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
    },
    new_users: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
    },
    page_views: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
    },
    engaged_sessions: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
    },
    // Proporción 0-1 (GA4 engagementRate). Por período se recalcula engaged/sessions.
    engagement_rate: {
        type: DataTypes.DECIMAL(6, 4),
        allowNull: false,
        defaultValue: 0,
    },
    // Segundos (GA4 averageSessionDuration). Por período se pondera por sesiones.
    avg_session_duration: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0,
    },
    key_events: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: 'ga_daily_metrics',
    timestamps: true,
    paranoid: false,
    indexes: [
        { unique: true, fields: ['site_id', 'date'] },
        { fields: ['date'] },
    ],
});

export default GaDailyMetric;
