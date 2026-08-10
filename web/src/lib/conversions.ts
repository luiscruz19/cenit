/**
 * Catálogo de conversiones recomendadas + cómo configurarlas en GA4. Cenit no inventa el
 * negocio de cada cliente, pero sí puede recomendar según el TIPO de sitio (una tienda mide
 * compras; un sitio de servicios mide contactos) y explicar el paso a paso real en Analytics.
 *
 * `event` es el nombre del evento GA4 a marcar como "evento clave". Los que GA4 puede capturar
 * solos (con Medición mejorada) se marcan auto:true; los custom necesitan Google Tag Manager.
 */

export type Conversion = {
    id: string;
    label: string;
    event: string;
    whatFor: string;
    auto: boolean;
    how: string;
};

export const CONVERSIONS: Record<string, Conversion> = {
    whatsapp: {
        id: 'whatsapp',
        label: 'Click a WhatsApp',
        event: 'click_whatsapp',
        whatFor: 'La consulta por WhatsApp suele ser la conversión más valiosa de un sitio de servicios.',
        auto: false,
        how: 'Es un evento personalizado: se crea en Google Tag Manager con un activador de click sobre los enlaces a wa.me / api.whatsapp.com, que dispare a GA4 el evento "click_whatsapp". Cuando empiece a llegar, marcalo como evento clave en GA4 → Administrar → Eventos.',
    },
    form: {
        id: 'form',
        label: 'Envío de formulario',
        event: 'form_submit',
        whatFor: 'Cada formulario enviado es un lead concreto: alguien te dejó sus datos.',
        auto: true,
        how: 'GA4 puede capturarlo solo: Administrar → Flujos de datos → Medición mejorada → activá "Interacciones con formularios". Después, en Administrar → Eventos, marcá "form_submit" como evento clave.',
    },
    phone: {
        id: 'phone',
        label: 'Click a teléfono',
        event: 'click_phone',
        whatFor: 'Quien toca el número para llamar tiene intención alta de contratar.',
        auto: false,
        how: 'Evento personalizado: en Google Tag Manager, un activador de click sobre los enlaces "tel:" que dispare a GA4 el evento "click_phone". Después marcalo como evento clave.',
    },
    purchase: {
        id: 'purchase',
        label: 'Compra',
        event: 'purchase',
        whatFor: 'La venta: el resultado final de una tienda.',
        auto: false,
        how: 'Requiere el seguimiento de e-commerce de GA4 (el evento "purchase" con el detalle de la orden), que suele venir en la plataforma de la tienda o se configura con Google Tag Manager. Una vez que llega, marcalo como evento clave.',
    },
    addToCart: {
        id: 'addToCart',
        label: 'Agregar al carrito',
        event: 'add_to_cart',
        whatFor: 'Mide la intención de compra antes del checkout: ayuda a ver dónde se cae la venta.',
        auto: false,
        how: 'Parte del e-commerce de GA4 (evento "add_to_cart"). Si la tienda ya lo envía, marcalo como evento clave en Administrar → Eventos.',
    },
    schedule: {
        id: 'schedule',
        label: 'Reserva o turno',
        event: 'schedule',
        whatFor: 'Para sitios que agendan turnos o reservas, es la conversión principal.',
        auto: false,
        how: 'Evento personalizado desde Google Tag Manager al confirmar la reserva, enviando a GA4 el evento "schedule". Después marcalo como evento clave.',
    },
};

/**
 * Recomienda conversiones según el tipo de sitio, inferido del dominio. Es una guía por tipo,
 * no un diagnóstico del negocio puntual: sirve para arrancar, después se ajusta a mano.
 */
export const recommendFor = (domain: string): Conversion[] => {
    const d = (domain || '').toLowerCase();
    const isShop = /\.(shop|store)$/.test(d) || /(shop|tienda|store|market)/.test(d);
    const order = isShop
        ? ['purchase', 'addToCart', 'whatsapp', 'form']
        : ['whatsapp', 'form', 'phone', 'schedule'];
    return order.map((k) => CONVERSIONS[k]);
};
