import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Definición de un reporte y, opcionalmente, su programación de envío.
 *
 * site_id NULL = reporte del portfolio completo. La programación vive acá mismo
 * (y no en una tabla aparte) porque en la práctica cada reporte se manda con una
 * sola cadencia; si algún día hacen falta varias, se extrae a report_deliveries.
 */
const Report = sequelize.define('reports', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING(120),
        allowNull: false,
    },
    // NULL = portfolio completo.
    site_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    period: {
        type: DataTypes.ENUM('7d', '28d', '90d'),
        allowNull: false,
        defaultValue: '28d',
    },
    // Qué bloques incluye el PDF.
    sections: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {
            kpis: true,
            health: true,
            opportunities: true,
            rankings: true,
            topPages: true,
        },
    },
    schedule_frequency: {
        type: DataTypes.ENUM('none', 'weekly', 'monthly'),
        allowNull: false,
        defaultValue: 'none',
    },
    // weekly: 0=domingo … 6=sábado. monthly: día del mes (1–28).
    schedule_day: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
    },
    schedule_hour: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 8,
    },
    recipients: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    last_sent_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'reports',
    timestamps: true,
    paranoid: true,
});

export default Report;
