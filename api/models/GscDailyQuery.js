import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Top N de queries de búsqueda por sitio/día (misma aproximación que GaDailyPage).
 */
const GscDailyQuery = sequelize.define('gsc_daily_queries', {
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
    query: {
        type: DataTypes.STRING(255),
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
    tableName: 'gsc_daily_queries',
    timestamps: true,
    paranoid: false,
    indexes: [
        { unique: true, fields: ['site_id', 'date', 'query'] },
    ],
});

export default GscDailyQuery;
