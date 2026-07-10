const nf = new Intl.NumberFormat('es-AR');
const nfCompact = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 });

export const formatNumber = (n: number | null | undefined) =>
    n === null || n === undefined ? '—' : nf.format(n);

export const formatCompact = (n: number | null | undefined) =>
    n === null || n === undefined ? '—' : nfCompact.format(n);

/** 0.0432 → "4,3%" */
export const formatPct = (ratio: number | null | undefined, digits = 1) =>
    ratio === null || ratio === undefined
        ? '—'
        : `${(ratio * 100).toFixed(digits).replace('.', ',')}%`;

export const formatPosition = (p: number | null | undefined) =>
    p === null || p === undefined || p === 0 ? '—' : p.toFixed(1).replace('.', ',');

/** Segundos → "3m 24s" */
export const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

/** Variación porcentual actual vs anterior. null si no hay base de comparación. */
export const deltaPct = (current: number | null | undefined, previous: number | null | undefined) => {
    if (current === null || current === undefined || !previous) return null;
    return (current - previous) / previous;
};

export const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

export const formatDateShort = (dateStr: string) => {
    const [, m, d] = dateStr.split('-');
    return `${d}/${m}`;
};
