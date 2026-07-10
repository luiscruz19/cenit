import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Top N de páginas de búsqueda (Search Console) por sitio/día.
 */
const GscDailyPage = sequelize.define('gsc_daily_pages', {
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
    // URL completa según GSC; el ETL trunca a 500 para el índice único.
    page: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    clicks: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
    },
    impressions: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
    },
    position: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: 'gsc_daily_pages',
    timestamps: true,
    paranoid: false,
    indexes: [
        { unique: true, fields: ['site_id', 'date', 'page'] },
    ],
});

export default GscDailyPage;
