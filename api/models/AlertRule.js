import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Regla de alerta configurable. Complementa a la salud automática (insights.service),
 * que detecta problemas fijos: acá el usuario define sus propios umbrales por sitio.
 *
 * site_id NULL = la regla aplica a TODOS los sitios activos (una regla, todo el portfolio).
 */
const AlertRule = sequelize.define('alert_rules', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING(120),
        allowNull: false,
    },
    // NULL = todos los sitios activos.
    site_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    // Clave del catálogo de métricas (services/alerts/metrics.catalog.js).
    metric: {
        type: DataTypes.STRING(40),
        allowNull: false,
    },
    // gt/lt comparan el valor de la ventana; drop_pct/rise_pct comparan contra la ventana previa.
    operator: {
        type: DataTypes.ENUM('gt', 'lt', 'drop_pct', 'rise_pct'),
        allowNull: false,
    },
    // Umbral. Para drop_pct/rise_pct es el porcentaje (30 = 30%).
    threshold: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: false,
    },
    // Ventana de evaluación en días (y de comparación, para los operadores porcentuales).
    window_days: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 7,
    },
    severity: {
        type: DataTypes.ENUM('info', 'warning', 'critical'),
        allowNull: false,
        defaultValue: 'warning',
    },
    // Horas de silencio tras un disparo, para no repetir la misma alerta todos los días.
    cooldown_hours: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 24,
    },
    // Destinatarios de email, separados por coma. Vacío = solo queda en el historial.
    notify_emails: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    tableName: 'alert_rules',
    timestamps: true,
    paranoid: true,
});

export default AlertRule;
