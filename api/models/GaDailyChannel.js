import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Sesiones GA4 por canal (sessionDefaultChannelGroup) por sitio/día.
 */
const GaDailyChannel = sequelize.define('ga_daily_channels', {
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
    channel: {
        type: DataTypes.STRING(50),
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
    // Conversiones (eventos clave) atribuidas a este canal.
    key_events: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
    },
}, {
    tableName: 'ga_daily_channels',
    timestamps: true,
    paranoid: false,
    indexes: [
        { unique: true, fields: ['site_id', 'date', 'channel'] },
    ],
});

export default GaDailyChannel;
