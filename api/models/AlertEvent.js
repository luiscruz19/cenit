import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Disparo de una regla de alerta: qué se detectó, cuándo y con qué valores.
 * Es la fuente del historial y, además, lo que hace funcionar el cooldown
 * (se mira el último evento de la misma regla + sitio antes de volver a disparar).
 */
const AlertEvent = sequelize.define('alert_events', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    rule_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    site_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    severity: {
        type: DataTypes.ENUM('info', 'warning', 'critical'),
        allowNull: false,
    },
    // Valor detectado en la ventana actual y valor de la ventana previa (si aplica).
    value: {
        type: DataTypes.DECIMAL(14, 4),
        allowNull: true,
    },
    previous_value: {
        type: DataTypes.DECIMAL(14, 4),
        allowNull: true,
    },
    // Frase ya armada, lista para mostrar y para el email.
    message: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    notified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    notify_error: {
        type: DataTypes.STRING(300),
        allowNull: true,
    },
}, {
    tableName: 'alert_events',
    timestamps: true,
    paranoid: true,
    indexes: [
        { fields: ['rule_id', 'site_id', 'createdAt'] },
    ],
});

export default AlertEvent;
