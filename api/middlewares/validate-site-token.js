import { SiteToken, Site } from '../models/index.js';
import { errorMessage } from '../utils/messages.js';
import { hashToken } from '../services/site-summary/site-summary.shape.js';

const INVALID = 'El token no es válido o fue revocado.';
// Solo lo que usa el resumen: no depende de las columnas que se sumen a sites más adelante.
export const SITE_FIELDS = ['id', 'name', 'domain', 'ga4_property_id', 'gsc_site_url', 'is_active'];

/**
 * Acceso de un sitio a su propio resumen: `Authorization: Bearer <token>`. El token identifica
 * el sitio (req.site); no hay forma de pedir los datos de otro.
 */
export default async (req, res, next) => {
    const header = req.headers.authorization;
    const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) {
        return res.status(401).json(errorMessage({ message: 'Falta el token del sitio.' }));
    }
    const access = await SiteToken.findOne({ where: { token_hash: hashToken(token), revoked_at: null } });
    const site = access && await Site.findOne({ attributes: SITE_FIELDS, where: { id: access.site_id, is_active: true } });
    if (!site) {
        return res.status(401).json(errorMessage({ message: INVALID }));
    }
    req.site = site;
    req.siteToken = access;
    // Cuándo se usó por última vez, para saber qué tokens siguen vivos: una escritura por hora.
    if (!access.last_used_at || Date.now() - new Date(access.last_used_at).getTime() > 60 * 60 * 1000) {
        access.update({ last_used_at: new Date() }).catch(() => {});
    }
    next();
};
