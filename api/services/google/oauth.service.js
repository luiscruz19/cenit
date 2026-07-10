import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import CONFIG from '../../config/config.js';
import GoogleAccount from '../../models/GoogleAccount.js';
import { encrypt, decrypt } from './crypto.service.js';

const { GOOGLE, SECRET_KEY } = CONFIG;

export const buildOAuthClient = () =>
    new google.auth.OAuth2(GOOGLE.CLIENT_ID, GOOGLE.CLIENT_SECRET, GOOGLE.REDIRECT_URI);

/**
 * URL de consentimiento. access_type=offline + prompt=consent fuerzan a Google a
 * devolver SIEMPRE el refresh token (sin prompt=consent solo lo da la primera vez).
 * El state es un JWT corto: anti-CSRF sin estado en servidor.
 */
export const getAuthUrl = () => {
    const state = jwt.sign({ purpose: 'oauth-state' }, SECRET_KEY, { expiresIn: '10m' });
    const client = buildOAuthClient();
    return client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: true,
        scope: GOOGLE.SCOPES,
        state,
    });
};

export const validateState = (state) => {
    try {
        const payload = jwt.verify(state, SECRET_KEY);
        return payload?.purpose === 'oauth-state';
    } catch {
        return false;
    }
};

/** Canjea el code por tokens y verifica el id_token. Devuelve { tokens, profile }. */
export const exchangeCode = async (code) => {
    const client = buildOAuthClient();
    const { tokens } = await client.getToken(code);
    const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: GOOGLE.CLIENT_ID,
    });
    const payload = ticket.getPayload();
    return {
        tokens,
        profile: {
            email: (payload.email || '').toLowerCase(),
            name: payload.name || '',
            picture: payload.picture || '',
        },
    };
};

/** Guarda (o actualiza) la cuenta con el refresh token cifrado y la reactiva. */
export const upsertAccount = async ({ email, refreshToken, scopes }) => {
    const values = {
        refresh_token_enc: encrypt(refreshToken),
        scopes: (scopes || []).join(' ').slice(0, 500),
        status: 'active',
        last_error: null,
    };
    const [account, created] = await GoogleAccount.findOrCreate({
        where: { email },
        defaults: { email, ...values },
    });
    if (!created) await account.update(values);
    return account;
};

/**
 * Cliente OAuth autenticado con el refresh token guardado (para las APIs de datos).
 * google-auth-library renueva los access tokens automáticamente.
 */
export const getAuthedClient = async () => {
    const account = await GoogleAccount.findOne({ where: { status: 'active' } });
    if (!account) {
        const error = new Error('No hay una cuenta de Google activa vinculada');
        error.code = 'NO_GOOGLE_ACCOUNT';
        throw error;
    }
    const client = buildOAuthClient();
    client.setCredentials({ refresh_token: decrypt(account.refresh_token_enc) });
    await account.update({ last_used_at: new Date() });
    return { client, account };
};

/** Marca la cuenta como revocada (invalid_grant: token revocado o vencido). */
export const markRevoked = async (account, errorMessage) => {
    await account.update({
        status: 'revoked',
        last_error: String(errorMessage || 'invalid_grant').slice(0, 500),
    });
};

export const isInvalidGrant = (error) =>
    error?.response?.data?.error === 'invalid_grant' || /invalid_grant/i.test(error?.message || '');
