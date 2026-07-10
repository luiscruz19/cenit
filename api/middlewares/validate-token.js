import jwt from 'jsonwebtoken';
import CONFIG from '../config/config.js';
import messages from '../config/messages.js';
import { errorMessage } from '../utils/messages.js';

const { SECRET_KEY } = CONFIG;
const { generic } = messages;

/**
 * Valida el JWT de sesión localmente (HS256 con SECRET_KEY). El token lo emite esta
 * misma API en el callback de Google OAuth. Deja en req.user el payload ({ email, name }).
 */
export default (req, res, next) => {
    const headerToken = req.headers.token;
    const authHeader = req.headers.authorization;
    const bearerToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : null;
    const token = headerToken || bearerToken;

    if (!token) {
        return res.status(401).json(errorMessage({ message: generic.token_not_found }));
    }

    try {
        req.user = jwt.verify(token, SECRET_KEY);
        next();
    } catch (e) {
        const message = e.name === 'TokenExpiredError'
            ? generic.token_expirated
            : generic.token_invalid;
        return res.status(401).json(errorMessage({ message }));
    }
};
