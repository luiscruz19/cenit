/** Los 5 parámetros UTM estándar. `term` y `content` son opcionales. */
export const UTM_KEYS = ['source', 'medium', 'campaign', 'term', 'content'] as const;
export type UtmKey = (typeof UTM_KEYS)[number];
export type UtmValues = Record<UtmKey, string>;

export const EMPTY_UTM: UtmValues = {
    source: '', medium: '', campaign: '', term: '', content: '',
};

export const REQUIRED: UtmKey[] = ['source', 'medium', 'campaign'];

export const UTM_LABELS: Record<UtmKey, { label: string; hint: string; placeholder: string }> = {
    source: { label: 'Source', hint: 'De dónde viene el tráfico', placeholder: 'google' },
    medium: { label: 'Medium', hint: 'El tipo de canal', placeholder: 'cpc' },
    campaign: { label: 'Campaign', hint: 'El nombre de la campaña', placeholder: 'verano-2026' },
    term: { label: 'Term', hint: 'La keyword pagada (opcional)', placeholder: 'zapatillas' },
    content: { label: 'Content', hint: 'Para diferenciar creatividades (opcional)', placeholder: 'banner-a' },
};

/** Convenciones de nomenclatura: rellenan source/medium y sugieren el patrón de campaign. */
export const PRESETS = [
    {
        id: 'google-ads',
        name: 'Google Ads',
        pattern: 'source_medium_campaña',
        values: { source: 'google', medium: 'cpc' },
    },
    {
        id: 'meta-ads',
        name: 'Meta Ads (pago)',
        pattern: 'plataforma_paid_nombre',
        values: { source: 'facebook', medium: 'paid_social' },
    },
    {
        id: 'email',
        name: 'Email marketing',
        pattern: 'email_newsletter_fecha',
        values: { source: 'newsletter', medium: 'email' },
    },
    {
        id: 'organic-social',
        name: 'Redes orgánicas',
        pattern: 'plataforma_organic_tipo',
        values: { source: 'instagram', medium: 'organic_social' },
    },
] as const;

/**
 * Normaliza un valor de UTM: minúsculas, sin acentos, espacios a guiones.
 * Google trata `Verano` y `verano` como campañas distintas, así que conviene
 * unificar siempre — es la causa número uno de campañas duplicadas en los reportes.
 */
export const slugifyUtm = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9._|-]/g, '');

export const isValidUrl = (value: string) => {
    if (!value.trim()) return false;
    try {
        const u = new URL(value.trim());
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
};

/** Devuelve los UTMs que la URL pegada YA trae encima (para avisar antes de duplicarlos). */
export const detectExisting = (url: string): Partial<UtmValues> => {
    if (!isValidUrl(url)) return {};
    const params = new URL(url.trim()).searchParams;
    const found: Partial<UtmValues> = {};
    for (const key of UTM_KEYS) {
        const value = params.get(`utm_${key}`);
        if (value) found[key] = value;
    }
    return found;
};

/**
 * Arma la URL final. Reemplaza los utm_* que ya estuvieran presentes en vez de
 * agregarlos de nuevo, y preserva el resto del query string y el hash.
 */
export const buildUrl = (baseUrl: string, utm: UtmValues): string => {
    if (!isValidUrl(baseUrl)) return '';
    const url = new URL(baseUrl.trim());
    for (const key of UTM_KEYS) {
        const value = slugifyUtm(utm[key]);
        if (value) url.searchParams.set(`utm_${key}`, value);
        else url.searchParams.delete(`utm_${key}`);
    }
    return url.toString();
};

export const missingRequired = (utm: UtmValues): UtmKey[] =>
    REQUIRED.filter((k) => !utm[k].trim());

/** Escapa un valor para CSV (comillas dobles y separadores). */
const csvCell = (value: string) =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

export const toCsv = (rows: { url: string; utm: UtmValues }[]): string => {
    const header = ['url_final', ...UTM_KEYS.map((k) => `utm_${k}`)];
    const lines = rows.map((r) => [r.url, ...UTM_KEYS.map((k) => slugifyUtm(r.utm[k]))].map(csvCell).join(','));
    return [header.join(','), ...lines].join('\n');
};

export const downloadCsv = (filename: string, csv: string) => {
    // BOM para que Excel abra los acentos bien.
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
};
