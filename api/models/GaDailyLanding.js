import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/** Sesiones por página de aterrizaje y día (GA4). Por qué página entra la gente. */
const GaDailyLanding = sequelize.define('ga_daily_landings', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    site_id: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    landing_page: { type: DataTypes.STRING(500), allowNull: false },
    sessions: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    key_events: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
}, {
    tableName: 'ga_daily_landings',
    timestamps: true,
    paranoid: true,
    indexes: [{ unique: true, fields: ['site_id', 'date', 'landing_page'] }],
});

export default GaDailyLanding;
