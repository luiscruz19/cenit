import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Sesiones GA4 por categoría de dispositivo (desktop/mobile/tablet) por sitio/día.
 */
const GaDailyDevice = sequelize.define('ga_daily_devices', {
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
    device_category: {
        type: DataTypes.STRING(20),
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
}, {
    tableName: 'ga_daily_devices',
    timestamps: true,
    paranoid: false,
    indexes: [
        { unique: true, fields: ['site_id', 'date', 'device_category'] },
    ],
});

export default GaDailyDevice;
