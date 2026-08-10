import { QueryTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import Site from '../../models/Site.js';
import { resolveRange } from '../metrics/metrics.service.js';

/**
 * Motor de estrategias POR SITIO.
 *
 * No elige de una lista fija de consejos: analiza los datos reales de ese sitio y emite
 * hallazgos con evidencia concreta (sus consultas, sus páginas, sus números). Dos sitios
 * distintos tienen que dar recomendaciones distintas; si dan lo mismo, es porque
 * comparten el mismo problema, y el texto lo demuestra con sus propios datos.
 */

const select = (sql, replacements) =>
    sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

const num = (v) => Number(v) || 0;
const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
const int = (v) => Math.round(num(v));

/**
 * CTR esperable según la posición (curva promedio de la industria). Sirve para detectar
 * consultas que rankean bien pero no se clickean: el problema ahí no es posición, es
 * cómo se ve el resultado (título y descripción).
 */
const CTR_CURVE = {
    1: 0.28, 2: 0.15, 3: 0.11, 4: 0.08, 5: 0.06,
    6: 0.05, 7: 0.04, 8: 0.032, 9: 0.028, 10: 0.025,
};
const expectedCtr = (position) => {
    if (position === null || position === undefined) return 0.02;
    const p = Math.max(1, Math.round(position));
    if (p <= 10) return CTR_CURVE[p];
    if (p <= 20) return 0.012;
    return 0.005;
};

const pctStr = (v) => `${(v * 100).toFixed(1).replace('.', ',')}%`;
const nStr = (v) => int(v).toLocaleString('es-AR');

/** Trae todo lo que necesita el análisis de un sitio, en paralelo. */
const loadSiteData = async (siteId, period) => {
    const r = resolveRange(period);
    const base = { siteId, from: r.from, to: r.to };
    const prev = { siteId, from: r.prevFrom, to: r.prevTo };

    const [ga, queries, gscPages, gaPages, channels, devices] = await Promise.all([
        select(
            `SELECT SUM(sessions) sessions, SUM(total_users) users,
                    SUM(engaged_sessions) engaged, SUM(key_events) key_events,
                    SUM(page_views) page_views
             FROM ga_daily_metrics WHERE site_id = :siteId AND date BETWEEN :from AND :to`,
            base
        ),
        select(
            `SELECT q.query,
                    SUM(CASE WHEN q.date BETWEEN :from AND :to THEN q.clicks END) clicks,
                    SUM(CASE WHEN q.date BETWEEN :from AND :to THEN q.impressions END) impressions,
                    SUM(CASE WHEN q.date BETWEEN :from AND :to THEN q.position * q.impressions END)
                        / NULLIF(SUM(CASE WHEN q.date BETWEEN :from AND :to THEN q.impressions END), 0) position,
                    SUM(CASE WHEN q.date BETWEEN :prevFrom AND :prevTo THEN q.position * q.impressions END)
                        / NULLIF(SUM(CASE WHEN q.date BETWEEN :prevFrom AND :prevTo THEN q.impressions END), 0) prev_position
             FROM gsc_daily_queries q
             WHERE q.site_id = :siteId AND q.date BETWEEN :prevFrom AND :to
             GROUP BY q.query
             HAVING impressions > 0`,
            { siteId, from: r.from, to: r.to, prevFrom: r.prevFrom, prevTo: r.prevTo }
        ),
        select(
            `SELECT page, SUM(clicks) clicks, SUM(impressions) impressions,
                    SUM(position * impressions) / NULLIF(SUM(impressions), 0) position
             FROM gsc_daily_pages WHERE site_id = :siteId AND date BETWEEN :from AND :to
             GROUP BY page HAVING impressions > 0 ORDER BY impressions DESC`,
            base
        ),
        select(
            `SELECT page_path, SUM(page_views) page_views, SUM(sessions) sessions
             FROM ga_daily_pages WHERE site_id = :siteId AND date BETWEEN :from AND :to
             GROUP BY page_path ORDER BY page_views DESC`,
            base
        ),
        select(
            `SELECT channel, SUM(sessions) sessions
             FROM ga_daily_channels WHERE site_id = :siteId AND date BETWEEN :from AND :to
             GROUP BY channel ORDER BY sessions DESC`,
            base
        ),
        select(
            `SELECT device_category, SUM(sessions) sessions
             FROM ga_daily_devices WHERE site_id = :siteId AND date BETWEEN :from AND :to
             GROUP BY device_category ORDER BY sessions DESC`,
            base
        ),
    ]);

    return {
        range: r,
        ga: ga[0] || {},
        queries: queries.map((q) => ({
            query: q.query,
            clicks: int(q.clicks),
            impressions: int(q.impressions),
            position: q.position === null ? null : round(num(q.position)),
            prevPosition: q.prev_position === null ? null : round(num(q.prev_position)),
            ctr: int(q.impressions) ? int(q.clicks) / int(q.impressions) : 0,
        })),
        gscPages: gscPages.map((p) => ({
            page: p.page,
            clicks: int(p.clicks),
            impressions: int(p.impressions),
            position: round(num(p.position)),
            ctr: int(p.impressions) ? int(p.clicks) / int(p.impressions) : 0,
        })),
        gaPages: gaPages.map((p) => ({
            path: p.page_path, pageViews: int(p.page_views), sessions: int(p.sessions),
        })),
        channels: channels.map((c) => ({ channel: c.channel, sessions: int(c.sessions) })),
        devices: devices.map((d) => ({ device: d.device_category, sessions: int(d.sessions) })),
    };
};

// ── Reglas ──────────────────────────────────────────────────────────────────
// Cada una devuelve una recomendación con evidencia, o null si no aplica al sitio.

/** Consultas en página 2: ya rankean, les falta un empujón. */
const rulePage2 = (d) => {
    const candidates = d.queries
        .filter((q) => q.position !== null && q.position >= 8 && q.position <= 20 && q.impressions >= 30)
        .map((q) => ({ ...q, gain: Math.max(0, Math.round(q.impressions * 0.08) - q.clicks) }))
        .filter((q) => q.gain > 0)
        .sort((a, b) => b.gain - a.gain);

    if (candidates.length === 0) return null;
    const top = candidates.slice(0, 5);
    const impact = candidates.reduce((a, q) => a + q.gain, 0);

    return {
        id: 'page2',
        category: 'Posicionamiento',
        priority: 1,
        title: `Empujar ${candidates.length} ${candidates.length === 1 ? 'consulta' : 'consultas'} de la página 2 al top`,
        finding: `${candidates.length} ${candidates.length === 1 ? 'consulta está' : 'consultas están'} entre las posiciones 8 y 20. `
            + `La más valiosa es «${top[0].query}»: posición ${top[0].position} con ${nStr(top[0].impressions)} impresiones `
            + `y solo ${nStr(top[0].clicks)} clicks.`,
        why: 'En la página 2 casi nadie hace click. Subir al top 5 convierte impresiones que ya tenés en visitas reales.',
        actions: [
            `Buscá la página que rankea para «${top[0].query}» y ampliala: cubrí subtemas y preguntas relacionadas.`,
            'Reforzá el enlazado interno hacia esa página con texto ancla descriptivo.',
            'Actualizá el contenido y su fecha: Google premia lo vigente.',
        ],
        impactClicks: impact,
        evidence: {
            type: 'queries',
            columns: ['Consulta', 'Posición', 'Impresiones', 'Clicks', 'Clicks ganables'],
            rows: top.map((q) => [q.query, q.position, q.impressions, q.clicks, q.gain]),
        },
    };
};

/** Rankea bien pero no la clickean: el título/descripción no convence. */
const ruleCtrGap = (d) => {
    const candidates = d.queries
        .filter((q) => q.position !== null && q.position <= 10 && q.impressions >= 50)
        .map((q) => {
            const target = expectedCtr(q.position);
            return { ...q, target, gap: target - q.ctr, gain: Math.max(0, Math.round(q.impressions * target) - q.clicks) };
        })
        // Solo cuando el CTR está por debajo de la MITAD de lo esperable para esa posición.
        .filter((q) => q.ctr < q.target * 0.5 && q.gain > 0)
        .sort((a, b) => b.gain - a.gain);

    if (candidates.length === 0) return null;
    const top = candidates.slice(0, 5);
    const impact = candidates.reduce((a, q) => a + q.gain, 0);
    const worst = top[0];

    return {
        id: 'ctr-gap',
        category: 'CTR',
        priority: 1,
        title: `Reescribir títulos: ${candidates.length} ${candidates.length === 1 ? 'consulta rankea' : 'consultas rankean'} bien pero no las clickean`,
        finding: `«${worst.query}» está en posición ${worst.position} —donde lo esperable es un CTR de ~${pctStr(worst.target)}— `
            + `pero solo tiene ${pctStr(worst.ctr)}. Con ${nStr(worst.impressions)} impresiones, eso son `
            + `~${nStr(worst.gain)} clicks que se están perdiendo.`,
        why: 'Cuando la posición es buena y el CTR es malo, el problema no es rankear: es cómo te presentás en el resultado.',
        actions: [
            `Reescribí el <title> de la página que rankea para «${worst.query}»: keyword al inicio, beneficio claro, y número o año si aplica.`,
            'Ajustá la meta-descripción para que responda la intención de búsqueda y cierre con un llamado a la acción.',
            'Sumá datos estructurados (schema) para ganar estrellas, precio o FAQ en el resultado.',
        ],
        impactClicks: impact,
        evidence: {
            type: 'queries',
            columns: ['Consulta', 'Posición', 'CTR actual', 'CTR esperable', 'Clicks ganables'],
            rows: top.map((q) => [q.query, q.position, pctStr(q.ctr), pctStr(q.target), q.gain]),
        },
    };
};

/** Consultas que perdieron posiciones respecto del período anterior. */
const ruleDrops = (d) => {
    const dropped = d.queries
        .filter((q) =>
            q.position !== null && q.prevPosition !== null
            && q.impressions >= 50
            && q.position - q.prevPosition >= 3)
        .map((q) => ({ ...q, lost: round(q.position - q.prevPosition) }))
        .sort((a, b) => b.lost - a.lost);

    if (dropped.length === 0) return null;
    const top = dropped.slice(0, 5);
    const worst = top[0];

    return {
        id: 'drops',
        category: 'Alerta',
        priority: 1,
        title: `${dropped.length} ${dropped.length === 1 ? 'consulta perdió' : 'consultas perdieron'} posiciones`,
        finding: `«${worst.query}» cayó ${worst.lost} puestos: de la posición ${worst.prevPosition} a la ${worst.position}, `
            + `con ${nStr(worst.impressions)} impresiones en juego.`,
        why: 'Una caída sostenida suele significar que un competidor mejoró su contenido, o que el tuyo quedó desactualizado.',
        actions: [
            `Buscá en Google «${worst.query}» y mirá quién te pasó: qué cubre su contenido que el tuyo no.`,
            'Actualizá y ampliá la página que rankea para esa consulta.',
            'Revisá que la página no haya tenido cambios técnicos (noindex, redirect, caída de velocidad).',
        ],
        impactClicks: 0,
        evidence: {
            type: 'queries',
            columns: ['Consulta', 'Antes', 'Ahora', 'Puestos perdidos', 'Impresiones'],
            rows: top.map((q) => [q.query, q.prevPosition, q.position, `−${q.lost}`, q.impressions]),
        },
    };
};

/** Páginas con mucha exposición y casi ningún click. */
const rulePagesLowCtr = (d) => {
    const candidates = d.gscPages
        .filter((p) => p.impressions >= 100 && p.ctr < 0.01)
        .sort((a, b) => b.impressions - a.impressions);

    if (candidates.length === 0) return null;
    const top = candidates.slice(0, 5);
    const worst = top[0];

    return {
        id: 'pages-low-ctr',
        category: 'CTR',
        priority: 2,
        title: `${candidates.length} ${candidates.length === 1 ? 'página aparece' : 'páginas aparecen'} mucho y no reciben clicks`,
        finding: `${worst.page} tuvo ${nStr(worst.impressions)} impresiones y solo ${nStr(worst.clicks)} clicks `
            + `(CTR ${pctStr(worst.ctr)}), en posición media ${worst.position}.`,
        why: 'Google la muestra, pero nadie la elige. O el título no representa lo que la gente busca, o la posición es demasiado baja para que la vean.',
        actions: [
            'Revisá el título y la meta-descripción de esas páginas: ¿responden a lo que se está buscando?',
            'Verificá que la página realmente cubra la intención de las consultas por las que aparece.',
            'Si la posición media es mayor a 10, primero hay que subirla; el título solo no alcanza.',
        ],
        impactClicks: 0,
        evidence: {
            type: 'pages',
            columns: ['Página', 'Impresiones', 'Clicks', 'CTR', 'Posición'],
            rows: top.map((p) => [p.page, p.impressions, p.clicks, pctStr(p.ctr), p.position]),
        },
    };
};

/** Sin nada en el top 3, pero con consultas cerca. */
const ruleNoTop3 = (d) => {
    const withPos = d.queries.filter((q) => q.position !== null);
    if (withPos.length < 5) return null;

    const top3 = withPos.filter((q) => q.position <= 3);
    if (top3.length > 0) return null;

    const close = withPos
        .filter((q) => q.position > 3 && q.position <= 7 && q.impressions >= 20)
        .sort((a, b) => b.impressions - a.impressions);
    if (close.length === 0) return null;

    return {
        id: 'no-top3',
        category: 'Posicionamiento',
        priority: 2,
        title: 'No tenés ninguna consulta en el top 3',
        finding: `De ${withPos.length} consultas, ninguna está en las tres primeras posiciones. `
            + `La más cerca es «${close[0].query}», en la posición ${close[0].position}.`,
        why: 'Los tres primeros resultados se llevan la mayoría de los clicks. Estar cuarto o quinto rinde muchísimo menos que estar tercero.',
        actions: [
            `Concentrate en «${close[0].query}»: es la que tenés más a mano.`,
            'Convertí esa página en la más completa del tema: profundidad, ejemplos, preguntas frecuentes.',
            'Sumá enlaces internos desde tus páginas con más autoridad hacia ella.',
        ],
        impactClicks: 0,
        evidence: {
            type: 'queries',
            columns: ['Consulta', 'Posición', 'Impresiones', 'Clicks'],
            rows: close.slice(0, 5).map((q) => [q.query, q.position, q.impressions, q.clicks]),
        },
    };
};

/** Todo el tráfico depende de un solo canal. */
const ruleChannelConcentration = (d) => {
    const total = d.channels.reduce((a, c) => a + c.sessions, 0);
    if (total < 100 || d.channels.length === 0) return null;

    const top = d.channels[0];
    const share = top.sessions / total;
    if (share < 0.8) return null;

    return {
        id: 'channel-concentration',
        category: 'Riesgo',
        priority: 2,
        title: `El ${pctStr(share)} del tráfico viene de un solo canal`,
        finding: `${top.channel} aporta ${nStr(top.sessions)} de ${nStr(total)} sesiones. `
            + `El resto de los canales aporta apenas ${nStr(total - top.sessions)}.`,
        why: 'Depender de un solo canal es frágil: un cambio de algoritmo o un problema de tracking te deja sin tráfico de golpe.',
        actions: [
            'Identificá el segundo canal con más potencial y trabajalo de forma deliberada.',
            top.channel.toLowerCase().includes('organic')
                ? 'Al depender del orgánico, cualquier actualización de Google te expone: diversificá con directo, referidos o email.'
                : 'Si el orgánico es débil, ahí hay recorrido: es el canal más rentable a largo plazo.',
            'Medí el mix de canales todos los meses, no solo el total de sesiones.',
        ],
        impactClicks: 0,
        evidence: {
            type: 'plain',
            columns: ['Canal', 'Sesiones', 'Participación'],
            rows: d.channels.slice(0, 5).map((c) => [c.channel, c.sessions, pctStr(c.sessions / total)]),
        },
    };
};

/** Una sola página concentra casi todo el consumo. */
const rulePageConcentration = (d) => {
    const total = d.gaPages.reduce((a, p) => a + p.pageViews, 0);
    if (total < 200 || d.gaPages.length < 3) return null;

    const top = d.gaPages[0];
    const share = top.pageViews / total;
    if (share < 0.5) return null;

    return {
        id: 'page-concentration',
        category: 'Contenido',
        priority: 3,
        title: `Una sola página se lleva el ${pctStr(share)} de las vistas`,
        finding: `${top.path} concentra ${nStr(top.pageViews)} de ${nStr(total)} vistas. `
            + `El resto del sitio casi no se consume.`,
        why: 'Un sitio que vive de una sola página tiene poca superficie para captar búsquedas: cada página nueva es una puerta de entrada más.',
        actions: [
            'Creá contenido para las consultas que ya te traen impresiones pero no tienen una página propia.',
            `Desde ${top.path}, enlazá al resto del sitio para repartir tráfico y autoridad.`,
            'Revisá si las demás páginas están indexadas y son accesibles desde el menú.',
        ],
        impactClicks: 0,
        evidence: {
            type: 'pages',
            columns: ['Página', 'Vistas', 'Sesiones'],
            rows: d.gaPages.slice(0, 5).map((p) => [p.path, p.pageViews, p.sessions]),
        },
    };
};

/** Sin eventos clave configurados: no se puede medir si el sitio sirve para algo. */
const ruleNoKeyEvents = (d) => {
    const sessions = int(d.ga.sessions);
    if (sessions < 100 || int(d.ga.key_events) > 0) return null;

    return {
        id: 'no-key-events',
        category: 'Medición',
        priority: 2,
        title: 'No hay eventos clave configurados',
        finding: `El sitio tuvo ${nStr(sessions)} sesiones en el período y ${nStr(0)} eventos clave registrados.`,
        why: 'Sin eventos clave, GA4 mide visitas pero no resultados: no se sabe cuántos consultaron, compraron o llamaron. Todo el análisis se queda en el tráfico.',
        actions: [
            'Definí qué es una conversión para este sitio: formulario enviado, click a WhatsApp, llamada, compra.',
            'Marcá ese evento como "evento clave" en GA4 (Administrar → Eventos).',
            'Recién con eso vas a poder comparar canales por resultado y no solo por volumen.',
        ],
        impactClicks: 0,
        evidence: null,
    };
};

/** Mucho tráfico, poca interacción. */
const ruleLowEngagement = (d) => {
    const sessions = int(d.ga.sessions);
    const engaged = int(d.ga.engaged);
    if (sessions < 200) return null;
    const rate = engaged / sessions;
    if (rate >= 0.4) return null;

    const mobile = d.devices.find((x) => (x.device || '').toLowerCase().includes('mobile'));
    const totalDev = d.devices.reduce((a, x) => a + x.sessions, 0);
    const mobileShare = mobile && totalDev ? mobile.sessions / totalDev : null;

    return {
        id: 'low-engagement',
        category: 'Calidad',
        priority: 2,
        title: `La interacción es del ${pctStr(rate)}: el tráfico entra y se va`,
        finding: `De ${nStr(sessions)} sesiones, solo ${nStr(engaged)} tuvieron interacción real `
            + `(más de 10 segundos, más de una página, o una conversión).`
            + (mobileShare !== null && mobileShare > 0.6
                ? ` Además, el ${pctStr(mobileShare)} del tráfico es mobile.`
                : ''),
        why: 'Traer visitas que rebotan no sirve. O el contenido no responde a lo que buscaban, o la página tarda o se ve mal.',
        actions: [
            'Mirá de qué canal viene el tráfico con menos interacción y ajustá la segmentación.',
            mobileShare !== null && mobileShare > 0.6
                ? 'Con este nivel de mobile, probá el sitio en un celular real: velocidad, tamaño de texto, botones.'
                : 'Revisá la velocidad de carga y que el mensaje principal se vea sin hacer scroll.',
            'Alineá lo que promete el resultado de búsqueda con lo que la página realmente entrega.',
        ],
        impactClicks: 0,
        evidence: {
            type: 'plain',
            columns: ['Dispositivo', 'Sesiones'],
            rows: d.devices.map((x) => [x.device, x.sessions]),
        },
    };
};

/** Consultas que están mejorando: conviene reforzarlas. */
const ruleRising = (d) => {
    const rising = d.queries
        .filter((q) =>
            q.position !== null && q.prevPosition !== null
            && q.impressions >= 30
            && q.prevPosition - q.position >= 3)
        .map((q) => ({ ...q, gained: round(q.prevPosition - q.position) }))
        .sort((a, b) => b.gained - a.gained);

    if (rising.length === 0) return null;
    const top = rising.slice(0, 5);
    const best = top[0];

    return {
        id: 'rising',
        category: 'Oportunidad',
        priority: 3,
        title: `${rising.length} ${rising.length === 1 ? 'consulta está subiendo' : 'consultas están subiendo'}: reforzalas`,
        finding: `«${best.query}» ganó ${best.gained} puestos: pasó de la posición ${best.prevPosition} a la ${best.position}.`,
        why: 'Cuando algo ya tiene impulso, un empujón chico rinde más que empezar de cero en otro tema.',
        actions: [
            `Ampliá el contenido que rankea para «${best.query}» mientras Google lo está premiando.`,
            'Sumá enlaces internos hacia esa página para consolidar la subida.',
            'Buscá consultas relacionadas y cubrilas en la misma página o en una nueva.',
        ],
        impactClicks: 0,
        evidence: {
            type: 'queries',
            columns: ['Consulta', 'Antes', 'Ahora', 'Puestos ganados', 'Impresiones'],
            rows: top.map((q) => [q.query, q.prevPosition, q.position, `+${q.gained}`, q.impressions]),
        },
    };
};

const RULES = [
    ruleDrops,
    ruleCtrGap,
    rulePage2,
    ruleNoTop3,
    rulePagesLowCtr,
    ruleNoKeyEvents,
    ruleLowEngagement,
    ruleChannelConcentration,
    rulePageConcentration,
    ruleRising,
];

/**
 * GET /insights/strategies?siteId=&period=
 * Devuelve las recomendaciones de ESE sitio, ordenadas por prioridad e impacto.
 */
export const getSiteStrategies = async (siteId, period = '28d') => {
    const site = await Site.findByPk(siteId);
    if (!site) {
        const error = new Error('Sitio no encontrado');
        error.code = 'SITE_NOT_FOUND';
        throw error;
    }

    const data = await loadSiteData(site.id, period);

    const recommendations = RULES
        .map((rule) => {
            try {
                return rule(data);
            } catch (error) {
                console.error(`[strategies] la regla falló para el sitio ${site.id}:`, error.message);
                return null;
            }
        })
        .filter(Boolean)
        .sort((a, b) => a.priority - b.priority || b.impactClicks - a.impactClicks);

    return {
        site: { id: site.id, name: site.name, domain: site.domain },
        range: { from: data.range.from, to: data.range.to },
        // Contexto que explica por qué salieron estas y no otras.
        context: {
            queries: data.queries.length,
            sessions: int(data.ga.sessions),
            hasSearchData: data.queries.length > 0,
            hasTrafficData: int(data.ga.sessions) > 0,
        },
        totalImpactClicks: recommendations.reduce((a, r) => a + r.impactClicks, 0),
        recommendations,
    };
};
