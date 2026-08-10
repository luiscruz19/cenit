import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Dashboard armado por el usuario. Los widgets se guardan como JSON y se renderizan
 * pidiendo datos al endpoint del Explorer (/metrics/explore): no hay una segunda vía
 * de cálculo, así que un widget y una consulta del Explorer nunca pueden discrepar.
 *
 * Forma de cada widget:
 *   {
 *     id: string,            // uuid del cliente
 *     title: string,
 *     type: 'kpi' | 'line' | 'table',
 *     dataset: string,       // clave del catálogo del Explorer
 *     metrics: string[],     // 1 para kpi; 1–2 para line; 1–4 para table
 *     dimension: string|null,// 'date' para line; la dimensión de texto para table
 *     siteId: number|null,   // null = todos los sitios
 *     period: '7d'|'28d'|'90d'|null,  // null = hereda el del dashboard
 *     width: 1 | 2           // mitad o ancho completo
 *   }
 */
const Dashboard = sequelize.define('dashboards', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING(120),
        allowNull: false,
    },
    period: {
        type: DataTypes.ENUM('7d', '28d', '90d'),
        allowNull: false,
        defaultValue: '28d',
    },
    widgets: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
    },
}, {
    tableName: 'dashboards',
    timestamps: true,
    paranoid: true,
});

export default Dashboard;
