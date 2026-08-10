import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/** Sesiones y usuarios por país y día (GA4). De dónde entra la gente al sitio. */
const GaDailyCountry = sequelize.define('ga_daily_countries', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    site_id: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    country: { type: DataTypes.STRING(80), allowNull: false },
    sessions: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    total_users: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
}, {
    tableName: 'ga_daily_countries',
    timestamps: true,
    paranoid: true,
    indexes: [
        { unique: true, fields: ['site_id', 'date', 'country'] },
    ],
});

export default GaDailyCountry;
