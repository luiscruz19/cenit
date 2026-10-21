import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Acceso de un sitio a su propio resumen (GET /site-summary), de servidor a servidor: lo usa el
 * escritorio de wp-admin de cada sitio. Se guarda solo el sha256 del token; el token en claro se
 * muestra una vez, al crearlo con scripts/site-token.js, y no se puede recuperar. Un token
 * revocado (revoked_at) deja de servir al instante.
 *
 * Tabla nueva a propósito (y no una columna en sites): en producción sync() solo crea tablas.
 */
const SiteToken = sequelize.define('site_tokens', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    site_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    // Para qué se usa, para reconocerlo al revocarlo: «Escritorio de ejemplo.com».
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    token_hash: {
        type: DataTypes.CHAR(64),
        allowNull: false,
        unique: true,
    },
    last_used_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    revoked_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'site_tokens',
    timestamps: true,
    paranoid: false,
    indexes: [{ fields: ['site_id'] }],
});

export default SiteToken;
