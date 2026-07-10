/**
 * Fechas en formato 'YYYY-MM-DD', siempre en zona Argentina (la zona de negocio del dashboard).
 * Las APIs de Google reciben y devuelven fechas como string, así que se opera sobre strings
 * y solo se pasa por Date (en UTC) para la aritmética.
 */

const ART_TZ = 'America/Argentina/Buenos_Aires';

/** Hoy en Argentina como 'YYYY-MM-DD'. */
export const todayArt = () =>
    new Date().toLocaleDateString('en-CA', { timeZone: ART_TZ });

/** Suma (o resta) días a una fecha 'YYYY-MM-DD'. */
export const addDays = (dateStr, days) => {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
};

/** Convierte el formato de GA4 ('YYYYMMDD') a 'YYYY-MM-DD'. */
export const fromGa4Date = (yyyymmdd) =>
    `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;

/** Cantidad de días (inclusive) entre dos fechas 'YYYY-MM-DD'. */
export const daysBetween = (from, to) =>
    Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000) + 1;

/** Lista de fechas 'YYYY-MM-DD' del rango inclusive. */
export const dateRange = (from, to) => {
    const out = [];
    for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
    return out;
};
