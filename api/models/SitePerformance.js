import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Rendimiento del sitio (Core Web Vitals + score de PageSpeed), por día y estrategia
 * (mobile/desktop). Es la métrica que Google usa para rankear y que ningún reporte
 * profesional serio omite.
 *
 * `source` = 'field' cuando los Web Vitals vienen de usuarios reales (CrUX, ventana de 28
 * días) o 'lab' cuando el sitio no tiene tráfico suficiente y se usa la medición de
 * laboratorio de Lighthouse. Como CrUX es una ventana móvil de 28 días, se guarda una foto
 * diaria: no hay backfill, el histórico se arma hacia adelante.
 */
const SitePerformance = sequelize.define('site_performance', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    site_id: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    strategy: { type: DataTypes.ENUM('mobile', 'desktop'), allowNull: false },
    // Score de performance de Lighthouse (0–100).
    perf_score: { type: DataTypes.INTEGER, allowNull: true },
    // Core Web Vitals.
    lcp_ms: { type: DataTypes.INTEGER, allowNull: true },        // Largest Contentful Paint
    inp_ms: { type: DataTypes.INTEGER, allowNull: true },        // Interaction to Next Paint
    cls: { type: DataTypes.DECIMAL(6, 3), allowNull: true },     // Cumulative Layout Shift
    fcp_ms: { type: DataTypes.INTEGER, allowNull: true },        // First Contentful Paint
    ttfb_ms: { type: DataTypes.INTEGER, allowNull: true },       // Time to First Byte
    source: { type: DataTypes.ENUM('field', 'lab'), allowNull: true },
    overall: { type: DataTypes.ENUM('FAST', 'AVERAGE', 'SLOW'), allowNull: true },
}, {
    tableName: 'site_performance',
    timestamps: true,
    paranoid: true,
    indexes: [{ unique: true, fields: ['site_id', 'date', 'strategy'] }],
});

export default SitePerformance;
