import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/** Historial de envíos de un reporte: qué se mandó, a quién y si salió bien. */
const ReportSend = sequelize.define('report_sends', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    report_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('sent', 'failed'),
        allowNull: false,
    },
    // manual = alguien tocó "Enviar ahora"; scheduled = lo disparó el cron.
    trigger_type: {
        type: DataTypes.ENUM('manual', 'scheduled'),
        allowNull: false,
        defaultValue: 'scheduled',
    },
    recipients: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    error: {
        type: DataTypes.STRING(300),
        allowNull: true,
    },
}, {
    tableName: 'report_sends',
    timestamps: true,
    paranoid: true,
    indexes: [{ fields: ['report_id', 'createdAt'] }],
});

export default ReportSend;
