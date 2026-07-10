import { DataTypes } from 'sequelize';
import messages from '../config/messages.js';
import sequelize from '../db/sequelize.js';

/**
 * Proyecto/sitio del portfolio. El mapeo a GA4/GSC se completa desde la pantalla de
 * settings (discovery + sugerencias). Fase 2 (Clarity) agrega clarity_project_id acá.
 */
const Site = sequelize.define('sites', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notNull: { msg: messages.site.fields_empty.name },
        },
    },
    // Dominio canónico sin protocolo ni www (ej: "ejemplo.com.ar").
    domain: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
            notNull: { msg: messages.site.fields_empty.domain },
        },
    },
    // Solo el número de la propiedad GA4 (sin el prefijo "properties/").
    ga4_property_id: {
        type: DataTypes.STRING(20),
        allowNull: true,
    },
    // Formato de Search Console: "sc-domain:ejemplo.com" o "https://ejemplo.com/".
    gsc_site_url: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    tableName: 'sites',
    timestamps: true,
    paranoid: true,
});

export default Site;
