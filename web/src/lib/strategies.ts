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
