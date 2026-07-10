import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Top N (TOP_N, default 20) de páginas GA4 por sitio/día.
 * El top por período se agrega con SUM(...) GROUP BY page_path: es una aproximación
 * (una página fuera del top diario todos los días puede quedar afuera), aceptable
 * para un dashboard privado y evita corridas extra por período.
 */
const GaDailyPage = sequelize.define('ga_daily_pages', {
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
    // El ETL trunca a 500 chars para respetar el límite del índice único (utf8mb4).
    page_path: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    page_views: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
    },
    sessions: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: 'ga_daily_pages',
    timestamps: true,
    paranoid: false,
    indexes: [
        { unique: true, fields: ['site_id', 'date', 'page_path'] },
    ],
});

export default GaDailyPage;
