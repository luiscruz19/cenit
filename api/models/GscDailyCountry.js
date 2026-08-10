import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/** Búsqueda por país y día (Search Console). País como código ISO-3 (arg, usa…). */
const GscDailyCountry = sequelize.define('gsc_daily_countries', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    site_id: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    country: { type: DataTypes.STRING(10), allowNull: false },
    clicks: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    impressions: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    position: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
}, { tableName: 'gsc_daily_countries', timestamps: true, paranoid: true,
    indexes: [{ unique: true, fields: ['site_id', 'date', 'country'] }] });

export default GscDailyCountry;
