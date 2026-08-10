import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/** Conversiones (eventos clave) por nombre y día, de GA4. Qué evento clave, no solo cuántos. */
const GaDailyEvent = sequelize.define('ga_daily_events', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    site_id: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    event_name: { type: DataTypes.STRING(120), allowNull: false },
    key_events: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    event_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
}, {
    tableName: 'ga_daily_events',
    timestamps: true,
    paranoid: true,
    indexes: [{ unique: true, fields: ['site_id', 'date', 'event_name'] }],
});

export default GaDailyEvent;
