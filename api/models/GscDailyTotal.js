import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Totales de Search Console por sitio/día.
 * El CTR no se almacena: se calcula SUM(clicks)/SUM(impressions) al agregar
 * (guardarlo llevaría a promediar promedios). La posición por período se
 * pondera por impresiones: SUM(position*impressions)/SUM(impressions).
 */
const GscDailyTotal = sequelize.define('gsc_daily_totals', {
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
    tableName: 'gsc_daily_totals',
    timestamps: true,
    paranoid: false,
    indexes: [
        { unique: true, fields: ['site_id', 'date'] },
        { fields: ['date'] },
    ],
});

export default GscDailyTotal;
