/**
 * Fuente única de verdad del glosario. Alimenta tanto la página /glosario como los
 * tooltips (ⓘ) que aparecen junto a cada métrica del dashboard.
 *
 * Para agregar o corregir un término: editá este archivo. `short` es la definición
 * de una línea que se ve en el tooltip; `long` es la explicación completa de la página.
 * `updatedAt` (abajo) refleja la última revisión del glosario.
 */

export type GlossaryCategory = 'analytics' | 'search' | 'sistema';

export type GlossaryTerm = {
    slug: string;
    term: string;
    category: GlossaryCategory;
    short: string;
    long: string;
    /** Fórmula o forma de cálculo, si aplica. */
    formula?: string;
    /** Otros slugs relacionados. */
    related?: string[];
};

export const CATEGORY_LABELS: Record<GlossaryCategory, string> = {
    analytics: 'Analytics (GA4)',
    search: 'Search Console (GSC)',
    sistema: 'Sistema y datos',
};

export const CATEGORY_ORDER: GlossaryCategory[] = ['analytics', 'search', 'sistema'];

/** Última revisión del contenido del glosario. */
export const GLOSSARY_UPDATED_AT = '2026-07-10';

export const GLOSSARY: GlossaryTerm[] = [
    // ── Analytics (GA4) ────────────────────────────────────────────────────
    {
        slug: 'ga4',
        term: 'GA4 (Google Analytics 4)',
        category: 'analytics',
        short: 'La herramienta de Google que mide el tráfico y el comportamiento dentro del sitio.',
        long: 'Google Analytics 4 es la versión actual de Google Analytics. Mide qué hace la gente dentro del sitio: cuántas visitas hay, de dónde vienen, qué páginas ven y cuánto interactúan. Se basa en un "tag" (un fragmento de código) instalado en el sitio. Es la fuente de todas las métricas de la columna Analytics del dashboard.',
        related: ['propiedad-ga4', 'sesiones'],
    },
    {
        slug: 'propiedad-ga4',
        term: 'Propiedad GA4',
        category: 'analytics',
        short: 'La "cuenta" de GA4 de un sitio concreto, identificada por un número.',
        long: 'Una propiedad es el contenedor donde GA4 guarda los datos de un sitio. Se identifica con un número (ej: 312345678). En Cenit, mapear un sitio significa decirle a qué propiedad GA4 corresponde, para que el ETL sepa de dónde traer sus datos.',
        related: ['mapeo', 'discovery'],
    },
    {
        slug: 'sesiones',
        term: 'Sesiones',
        category: 'analytics',
        short: 'Cantidad de visitas al sitio. Una sesión agrupa toda la actividad de un usuario en un lapso.',
        long: 'Una sesión es una visita: agrupa toda la actividad de una persona en el sitio dentro de un período continuo (se corta tras ~30 minutos de inactividad). Si el mismo usuario vuelve más tarde, cuenta como otra sesión. Es la métrica base de volumen de tráfico.',
        related: ['usuarios', 'engagement-rate'],
    },
    {
        slug: 'usuarios',
        term: 'Usuarios',
        category: 'analytics',
        short: 'Personas distintas que visitaron el sitio (una persona puede tener varias sesiones).',
        long: 'Cantidad de personas distintas que visitaron el sitio en el período. Un mismo usuario puede generar varias sesiones, así que siempre hay igual o menos usuarios que sesiones. GA4 los identifica por dispositivo/navegador, no por identidad real.',
        related: ['sesiones'],
    },
    {
        slug: 'engagement-rate',
        term: 'Tasa de interacción (engagement rate)',
        category: 'analytics',
        short: 'Porcentaje de sesiones "con interacción" (duran +10s, ven +1 página o convierten).',
        long: 'Porcentaje de sesiones que GA4 considera "con interacción": duraron más de 10 segundos, tuvieron más de una vista de página, o registraron una conversión. Una tasa baja con mucho volumen suele indicar tráfico superficial, mal segmentado o de baja calidad.',
        formula: 'sesiones con interacción ÷ sesiones totales',
        related: ['sesiones'],
    },
    {
        slug: 'vistas',
        term: 'Vistas de página (page views)',
        category: 'analytics',
        short: 'Cantidad total de veces que se cargó una página del sitio.',
        long: 'Número total de veces que se cargaron páginas del sitio, incluyendo recargas y vistas repetidas de la misma página. Sirve para medir consumo de contenido, pero no equivale a personas: una sola sesión puede generar muchas vistas.',
        related: ['sesiones'],
    },
    {
        slug: 'canal',
        term: 'Canal / Fuente-medio',
        category: 'analytics',
        short: 'De dónde llega el tráfico: búsqueda orgánica, directo, redes sociales, referido, pago…',
        long: 'GA4 clasifica cada sesión según su origen: Organic Search (búsqueda no pagada), Direct (escribieron la URL o vienen sin referente), Social (redes), Referral (enlaces de otros sitios), Paid (campañas pagas), etc. Ver el mix de canales ayuda a entender de qué depende el tráfico de un sitio.',
        related: ['sesiones'],
    },

    // ── Search Console (GSC) ───────────────────────────────────────────────
    {
        slug: 'gsc',
        term: 'Search Console (GSC)',
        category: 'search',
        short: 'La herramienta de Google que muestra cómo aparece el sitio en los resultados de búsqueda.',
        long: 'Google Search Console reporta cómo se comporta el sitio en la búsqueda de Google (SEO): con qué consultas aparece, cuántas veces se muestra, cuántos clicks recibe y en qué posición. Es la fuente de todas las métricas de la columna Búsqueda del dashboard. Complementa a GA4: GSC mira lo que pasa antes de entrar al sitio; GA4, lo que pasa adentro.',
        related: ['gsc-site-url', 'impresiones', 'clicks'],
    },
    {
        slug: 'gsc-site-url',
        term: 'Sitio de Search Console (sc-domain / URL)',
        category: 'search',
        short: 'El identificador del sitio en GSC: "sc-domain:ejemplo.com" o "https://ejemplo.com/".',
        long: 'Cada sitio en Search Console se identifica por una "propiedad", que puede ser de dominio ("sc-domain:ejemplo.com", abarca todo el dominio) o de prefijo de URL ("https://ejemplo.com/"). Mapear un sitio en Cenit es elegir cuál de estas propiedades le corresponde.',
        related: ['mapeo', 'gsc'],
    },
    {
        slug: 'clicks',
        term: 'Clicks',
        category: 'search',
        short: 'Veces que alguien hizo click en tu sitio desde los resultados de búsqueda de Google.',
        long: 'Cantidad de clicks que recibió el sitio desde los resultados de búsqueda de Google. Es la métrica de SEO más cercana al tráfico real: cada click es una persona que eligió tu resultado sobre los demás.',
        related: ['impresiones', 'ctr'],
    },
    {
        slug: 'impresiones',
        term: 'Impresiones',
        category: 'search',
        short: 'Veces que tu sitio apareció en los resultados de búsqueda (lo hayan clickeado o no).',
        long: 'Cantidad de veces que un enlace a tu sitio se mostró en los resultados de búsqueda de Google, independientemente de si lo clickearon. Muchas impresiones con pocos clicks (CTR bajo) suele significar que aparecés, pero el título/descripción no convencen o estás en una posición baja.',
        related: ['clicks', 'ctr', 'posicion'],
    },
    {
        slug: 'ctr',
        term: 'CTR (tasa de clicks)',
        category: 'search',
        short: 'Porcentaje de impresiones que terminaron en click. Mide qué tan atractivo es tu resultado.',
        long: 'Click-Through Rate: qué porcentaje de las veces que apareciste en la búsqueda la gente efectivamente entró. Un CTR bajo para una buena posición indica que el título o la meta-descripción no están convenciendo. El CTR esperable depende mucho de la posición: los primeros lugares tienen CTR naturalmente más alto.',
        formula: 'clicks ÷ impresiones',
        related: ['clicks', 'impresiones', 'posicion'],
    },
    {
        slug: 'posicion',
        term: 'Posición media',
        category: 'search',
        short: 'El lugar promedio en el que aparece tu sitio en los resultados. Más bajo es mejor (1 = primero).',
        long: 'Posición promedio en la que apareció tu sitio en los resultados de búsqueda para sus consultas, ponderada por impresiones. A diferencia del resto de las métricas, acá bajar es mejor: posición 1 es el primer resultado. Las posiciones 8–20 (páginas 2 y 3) son "oportunidades": con un empujón pueden subir al top y ganar muchos clicks.',
        related: ['impresiones', 'ctr'],
    },
    {
        slug: 'query',
        term: 'Consulta (query / keyword)',
        category: 'search',
        short: 'El término que la persona escribió en Google y que hizo aparecer tu sitio.',
        long: 'La consulta o keyword es exactamente lo que el usuario tipeó en Google. Search Console muestra con qué consultas aparece tu sitio, cuántas impresiones y clicks trae cada una y en qué posición. Analizarlas revela qué temas te posicionan y cuáles son oportunidades.',
        related: ['posicion', 'impresiones'],
    },

    // ── Sistema y datos ────────────────────────────────────────────────────
    {
        slug: 'etl',
        term: 'ETL (proceso de carga)',
        category: 'sistema',
        short: 'El proceso que trae los datos de GA4 y GSC a la base de Cenit. Corre solo cada día.',
        long: 'ETL = Extract, Transform, Load. Es el proceso automático que extrae los datos de las APIs de Google (GA4 y Search Console), los transforma al formato de Cenit y los guarda en la base. Corre solo todos los días a las 05:00 (ART). También podés dispararlo a mano desde Configuración ("Correr ahora").',
        related: ['backfill', 'lag', 'upsert'],
    },
    {
        slug: 'backfill',
        term: 'Backfill (carga histórica)',
        category: 'sistema',
        short: 'Traer de un tirón varios meses de historia hacia atrás, no solo el día de ayer.',
        long: 'Mientras el ETL diario trae solo lo último, el backfill trae la historia hacia atrás: hasta 16 meses de GA4 y Search Console, en bloques de 30 días. Se usa al mapear un sitio nuevo, para que arranque con contexto en vez de una sola jornada. Puede tardar varios minutos; el progreso se ve en la lista de corridas.',
        related: ['etl'],
    },
    {
        slug: 'lag',
        term: 'Lag de datos (retraso)',
        category: 'sistema',
        short: 'Search Console publica sus datos con ~3 días de retraso; por eso el "último día" no es hoy.',
        long: 'Los datos de Search Console no están disponibles en tiempo real: Google los publica con unos 3 días de demora. Por eso, cuando ves el "último día con datos" de GSC, es normal que sea de hace un par de días y no de hoy. Cenit ancla sus ventanas de análisis a ese último día real para no comparar contra períodos incompletos.',
        related: ['etl'],
    },
    {
        slug: 'upsert',
        term: 'Upsert',
        category: 'sistema',
        short: 'Insertar el dato si no existe, o actualizarlo si ya estaba. Evita duplicados al recargar.',
        long: 'Upsert = update + insert. Cuando el ETL vuelve a traer un día que ya estaba cargado, en vez de duplicarlo lo actualiza. Esto hace que correr el ETL o un backfill varias veces sea seguro (idempotente): no se rompen ni se inflan los datos.',
        related: ['etl', 'backfill'],
    },
    {
        slug: 'yoy',
        term: 'YoY (interanual)',
        category: 'sistema',
        short: 'Comparación contra el mismo período del año pasado (Year over Year).',
        long: 'Year over Year: compara el período actual contra el mismo período de un año atrás. Sirve para separar el crecimiento real de la estacionalidad (ej: una caída en enero puede ser normal si el año pasado también cayó). En el dashboard aparece como segunda línea en cada KPI.',
        related: ['periodo-anterior'],
    },
    {
        slug: 'periodo-anterior',
        term: 'vs. período anterior',
        category: 'sistema',
        short: 'Comparación contra el período inmediatamente previo de igual duración.',
        long: 'La variación "vs período anterior" compara el rango elegido contra el bloque inmediatamente anterior de la misma duración (ej: últimos 28 días vs los 28 días previos). Muestra el momentum reciente; el YoY, en cambio, controla la estacionalidad.',
        related: ['yoy'],
    },
    {
        slug: 'mapeo',
        term: 'Mapeo',
        category: 'sistema',
        short: 'Vincular cada sitio de Cenit con su propiedad GA4 y su sitio de Search Console.',
        long: 'Mapear es decirle a Cenit qué propiedad GA4 y qué sitio de Search Console le corresponden a cada proyecto. Sin mapeo, el ETL no sabe de dónde traer los datos y el sitio aparece "sin mapear". Se hace desde Configuración → Mapeo de sitios, con ayuda del discovery.',
        related: ['discovery', 'propiedad-ga4', 'gsc-site-url'],
    },
    {
        slug: 'discovery',
        term: 'Discovery ("Buscar en Google")',
        category: 'sistema',
        short: 'Consulta las APIs de Google y sugiere qué propiedad/sitio corresponde a cada dominio.',
        long: 'El discovery consulta la cuenta de Google conectada y lista todas las propiedades GA4 y sitios de Search Console disponibles, sugiriendo automáticamente el match por dominio. Es el atajo para mapear: en vez de buscar el ID a mano, elegís de una lista ya filtrada.',
        related: ['mapeo'],
    },
    {
        slug: 'sitio-inactivo',
        term: 'Sitio activo / inactivo',
        category: 'sistema',
        short: 'Un sitio inactivo no aparece en el overview ni recibe datos nuevos, pero conserva su histórico.',
        long: 'Al eliminar un sitio que ya tiene métricas cargadas, en vez de borrarlo se desactiva (soft delete): desaparece del overview, de Salud/Oportunidades y del ETL, pero sus datos históricos quedan intactos en la base. Se puede reactivar cuando quieras desde la edición del sitio.',
        related: ['etl'],
    },
];

export const getTerm = (slug: string): GlossaryTerm | undefined =>
    GLOSSARY.find((t) => t.slug === slug);
