/**
 * Playbook de estrategias: contenido curado con buenas prácticas para mejorar el
 * posicionamiento (SEO) y el rendimiento general de los sitios del portfolio.
 *
 * A diferencia de las "Prioridades ahora" (que se calculan solas desde los datos del
 * ETL), esto es contenido editable: para agregar o ajustar una estrategia, editá este
 * archivo. `STRATEGIES_UPDATED_AT` refleja la última revisión.
 */

export type StrategyTheme = {
    slug: string;
    title: string;
    goal: string;
    /** Pasos concretos y accionables. */
    steps: string[];
    /** Métricas del dashboard donde se ve el impacto (slugs del glosario). */
    watch?: string[];
};

/** Última revisión del contenido de estrategias. */
export const STRATEGIES_UPDATED_AT = '2026-07-10';

export const STRATEGIES: StrategyTheme[] = [
    {
        slug: 'pagina-2',
        title: 'Subir keywords de la página 2 al top',
        goal: 'Las consultas en posición 8–20 ya rankean: un empujón las lleva al top 5, donde está la mayoría de los clicks.',
        steps: [
            'Identificá las keywords en posición 8–20 con impresiones altas (las lista "Oportunidades").',
            'Buscá la página que rankea para esa keyword y ampliala: cubrí subtemas, preguntas frecuentes y términos relacionados.',
            'Reforzá el enlazado interno hacia esa página desde otras del sitio con texto ancla descriptivo.',
            'Actualizá la fecha y refrescá el contenido: Google premia el contenido vigente.',
        ],
        watch: ['posicion', 'impresiones', 'clicks'],
    },
    {
        slug: 'ctr-titulos',
        title: 'Mejorar títulos y descripciones (CTR)',
        goal: 'Cuando rankeás bien pero el CTR es bajo, aparecés pero no te eligen: el problema es cómo te presentás en el resultado.',
        steps: [
            'Revisá las keywords con buena posición (≤10) y CTR bajo (las lista "Oportunidades").',
            'Reescribí el <title>: incluí la keyword al inicio, un beneficio claro y, si aplica, número/año o marca.',
            'Ajustá la meta-descripción para que responda la intención de búsqueda y sume un llamado a la acción.',
            'Considerá datos estructurados (schema) para ganar resultados enriquecidos: estrellas, precio, FAQ.',
        ],
        watch: ['ctr', 'clicks'],
    },
    {
        slug: 'intencion-contenido',
        title: 'Alinear el contenido con la intención de búsqueda',
        goal: 'Google posiciona lo que mejor responde a lo que la persona busca, no lo que más keywords repite.',
        steps: [
            'Agrupá tus keywords por intención: informativa (cómo…), comercial (mejor…), transaccional (comprar…).',
            'Para cada grupo, asegurá una página cuyo formato coincida (guía, comparativa, ficha de producto).',
            'Cubrí el tema en profundidad en una sola página fuerte en vez de varias débiles que compiten entre sí.',
            'Sumá contenido que resuelva dudas reales: usá las consultas de Search Console como fuente de temas.',
        ],
        watch: ['query', 'posicion', 'engagement-rate'],
    },
    {
        slug: 'tecnico',
        title: 'Base técnica y velocidad',
        goal: 'Un sitio lento o con problemas de indexación pierde posiciones y clicks aunque el contenido sea bueno.',
        steps: [
            'Verificá en Search Console que las páginas clave estén indexadas (Cobertura / Páginas).',
            'Optimizá la velocidad: comprimí imágenes, activá caché y minimizá scripts que bloquean el render.',
            'Asegurá que el sitio sea usable en celular: la mayoría del tráfico y del ranking es mobile-first.',
            'Mantené una arquitectura clara con URLs limpias, sitemap actualizado y sin enlaces rotos.',
        ],
        watch: ['impresiones', 'sesiones'],
    },
    {
        slug: 'trafico-calidad',
        title: 'Convertir tráfico en tráfico de calidad',
        goal: 'Muchas sesiones con baja interacción no sirven: el objetivo es atraer a la gente correcta y retenerla.',
        steps: [
            'Detectá sitios con engagement bajo y volumen alto (aparecen en "Salud"): revisá de qué canal viene ese tráfico.',
            'Si viene de campañas o redes, ajustá la segmentación para atraer perfiles más afines.',
            'Mejorá la experiencia de la landing: carga rápida, mensaje claro arriba y un próximo paso evidente.',
            'Alineá la promesa del anuncio/resultado con lo que la página realmente entrega.',
        ],
        watch: ['engagement-rate', 'sesiones', 'canal'],
    },
    {
        slug: 'medicion',
        title: 'Medir bien para decidir bien',
        goal: 'Si los datos no llegan completos o comparás mal, las decisiones salen torcidas.',
        steps: [
            'Mantené cada sitio mapeado a GA4 y a Search Console: sin GSC falta toda la mitad SEO del panorama.',
            'Revisá "Salud" una vez por semana para detectar tags rotos, caídas o pérdidas de acceso a tiempo.',
            'Compará con el período anterior para el momentum y con el año anterior (YoY) para descontar la estacionalidad.',
            'Recordá el lag de ~3 días de Search Console: el último día con datos no es hoy.',
        ],
        watch: ['mapeo', 'yoy', 'lag'],
    },
];

export const getStrategy = (slug: string): StrategyTheme | undefined =>
    STRATEGIES.find((s) => s.slug === slug);

/** Señales reales de un sitio, derivadas de Salud + Oportunidades. */
export type SiteSignals = {
    page2Count: number;
    lowCtrCount: number;
    /** Códigos de las razones de Salud (ej: 'drop', 'low_engagement', 'gsc_unmapped'). */
    reasonCodes: string[];
};

/**
 * Elige del playbook las estrategias que le corresponden a UN sitio según sus señales,
 * y explica por qué se la recomienda. Las más específicas primero; 'intencion-contenido'
 * queda siempre como base. Se recalcula sola: las señales vienen de los datos del ETL.
 */
export const getRecommendedStrategies = (
    signals: SiteSignals
): { strategy: StrategyTheme; why: string }[] => {
    const has = (...codes: string[]) => codes.some((c) => signals.reasonCodes.includes(c));
    const picks: { slug: string; why: string }[] = [];

    if (signals.page2Count > 0) {
        picks.push({
            slug: 'pagina-2',
            why: `${signals.page2Count} ${signals.page2Count === 1 ? 'consulta está' : 'consultas están'} en posición 8–20: con un empujón entran al top.`,
        });
    }
    if (signals.lowCtrCount > 0) {
        picks.push({
            slug: 'ctr-titulos',
            why: `${signals.lowCtrCount} ${signals.lowCtrCount === 1 ? 'consulta rankea' : 'consultas rankean'} bien pero con CTR bajo: aparecés y no te eligen.`,
        });
    }
    if (has('low_engagement')) {
        picks.push({
            slug: 'trafico-calidad',
            why: 'La interacción es baja con volumen alto: el tráfico que llega no es el adecuado.',
        });
    }
    if (has('drop', 'traffic_collapse')) {
        picks.push({
            slug: 'tecnico',
            why: 'Hay una caída fuerte de tráfico: revisá primero indexación, tag y estado del sitio.',
        });
    }
    if (has('no_ga_data', 'gsc_unmapped', 'gsc_no_access')) {
        picks.push({
            slug: 'medicion',
            why: 'Faltan datos de alguna fuente: sin medición completa no se puede decidir bien.',
        });
    }
    picks.push({
        slug: 'intencion-contenido',
        why: 'Base siempre válida: alinear el contenido con lo que la gente realmente busca.',
    });

    return picks
        .map(({ slug, why }) => {
            const strategy = getStrategy(slug);
            return strategy ? { strategy, why } : null;
        })
        .filter((x): x is { strategy: StrategyTheme; why: string } => x !== null);
};
