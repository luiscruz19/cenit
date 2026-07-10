import jwt from 'jsonwebtoken';
import CONFIG from '../../config/config.js';
import messages from '../../config/messages.js';
import GoogleAccount from '../../models/GoogleAccount.js';
import {
    getAuthUrl, validateState, exchangeCode, upsertAccount,
} from '../../services/google/oauth.service.js';
import { successMessage, errorMessage } from '../../utils/messages.js';

const { SECRET_KEY, ALLOWED_EMAILS, GOOGLE } = CONFIG;

/** GET /auth/google/url — URL de consentimiento de Google (público). */
export const getGoogleUrl = (req, res) => {
    if (!GOOGLE.CLIENT_ID || !GOOGLE.CLIENT_SECRET) {
        return res.status(500).json(errorMessage({
            message: 'Faltan GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET en api/.env (ver README).',
        }));
    }
    return res.json(successMessage({ extra: { url: getAuthUrl() } }));
};

/**
 * POST /auth/google/callback { code, state } — canjea el code, valida allowlist,
 * guarda el refresh token cifrado y emite el JWT de sesión del dashboard (8h).
 */
export const googleCallback = async (req, res) => {
    try {
        const { code, state } = req.body;

        if (!validateState(state)) {
            return res.status(400).json(errorMessage({ message: messages.auth.state_invalid }));
        }

        const { tokens, profile } = await exchangeCode(code);

        if (!ALLOWED_EMAILS.includes(profile.email)) {
            console.warn(`[auth] login rechazado: "${profile.email}" no está en ALLOWED_EMAILS (${ALLOWED_EMAILS.join(', ')})`);
            return res.status(403).json(errorMessage({
                message: messages.auth.email_not_allowed,
                code: 'forbidden',
            }));
        }

        if (tokens.refresh_token) {
            await upsertAccount({
                email: profile.email,
                refreshToken: tokens.refresh_token,
                scopes: (tokens.scope || '').split(' '),
            });
        } else {
            // Con prompt=consent siempre debería venir; si no vino y tampoco hay una
            // cuenta guardada, no se puede correr el ETL: se pide re-consentimiento.
            const existing = await GoogleAccount.findOne({ where: { email: profile.email } });
            if (!existing) {
                return res.status(409).json(errorMessage({
                    message: messages.auth.no_refresh_token,
                    code: 'needs_consent',
                }));
            }
        }

        const token = jwt.sign(
            { email: profile.email, name: profile.name, picture: profile.picture },
            SECRET_KEY,
            { expiresIn: '8h' }
        );

        return res.json(successMessage({ extra: { token, user: profile } }));
    } catch (error) {
        console.error('[auth] callback falló:', error.message);
        return res.status(500).json(errorMessage({ message: 'No se pudo completar el login con Google.' }));
    }
};

/** GET /auth/me — sesión actual + estado de la cuenta de Google vinculada. */
export const me = async (req, res) => {
    const account = await GoogleAccount.findOne({ order: [['id', 'ASC']] });
    return res.json(successMessage({
        extra: {
            user: { email: req.user.email, name: req.user.name, picture: req.user.picture },
            googleConnected: Boolean(account),
            googleStatus: account?.status || null,
            googleError: account?.status === 'revoked' ? account.last_error : null,
        },
    }));
};
