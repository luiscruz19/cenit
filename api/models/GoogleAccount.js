import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Cuenta de Google vinculada (normalmente una sola). El refresh token se guarda
 * cifrado con AES-256-GCM (services/google/crypto.service.js) — nunca en claro ni en logs.
 */
const GoogleAccount = sequelize.define('google_accounts', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
    },
    // Formato "iv.tag.ciphertext" en base64.
    refresh_token_enc: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    scopes: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('active', 'revoked'),
        allowNull: false,
        defaultValue: 'active',
    },
    last_used_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    last_error: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
}, {
    tableName: 'google_accounts',
    timestamps: true,
    paranoid: true,
});

export default GoogleAccount;
