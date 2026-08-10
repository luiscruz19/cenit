import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/** Búsqueda por dispositivo y día (Search Console): DESKTOP / MOBILE / TABLET. */
const GscDailyDevice = sequelize.define('gsc_daily_devices', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    site_id: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    device: { type: DataTypes.STRING(20), allowNull: false },
    clicks: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    impressions: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    position: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
}, { tableName: 'gsc_daily_devices', timestamps: true, paranoid: true,
    indexes: [{ unique: true, fields: ['site_id', 'date', 'device'] }] });

export default GscDailyDevice;
