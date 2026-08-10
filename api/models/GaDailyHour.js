import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/** Sesiones por hora del día (GA4). Para el mapa de "cuándo entra la gente". */
const GaDailyHour = sequelize.define('ga_daily_hours', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    site_id: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    hour: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },  // 0–23
    sessions: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
}, { tableName: 'ga_daily_hours', timestamps: true, paranoid: true,
    indexes: [{ unique: true, fields: ['site_id', 'date', 'hour'] }] });

export default GaDailyHour;
