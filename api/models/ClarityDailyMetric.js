import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Métricas diarias de Microsoft Clarity por sitio: la capa de comportamiento y fricción
 * que ni GA4 ni Search Console tienen.
 *
 * Ojo con el grano: la Data Export API de Clarity solo devuelve una ventana de las
 * últimas 24–72 h agregada, sin cortar por día, y como máximo 3 días de historia. Por eso
 * NO hay backfill: el ETL corre una vez al día con numOfDays=1 y guarda esa foto de ~24 h
 * estampada con la fecha del día anterior. El histórico se construye hacia adelante, desde
 * que se conecta el token; hacia atrás no se puede.
 */
const ClarityDailyMetric = sequelize.define('clarity_daily_metrics', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    site_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    // Tráfico según Clarity (no coincide exacto con GA4: otra definición de sesión y bots).
    sessions: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    bot_sessions: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    distinct_users: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    pages_per_session: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
    // Fricción, en % de sesiones que la tuvieron (lo que muestra el panel de Clarity y lo
    // único comparable entre sitios de distinto tamaño). Es lo que Clarity aporta y nadie más.
    dead_click_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    rage_click_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    quickback_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    excessive_scroll_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    script_error_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    error_click_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    // Comportamiento.
    avg_scroll_depth: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
    avg_active_time: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
}, {
    tableName: 'clarity_daily_metrics',
    timestamps: true,
    paranoid: true,
    indexes: [
        { unique: true, fields: ['site_id', 'date'] },
    ],
});

export default ClarityDailyMetric;
