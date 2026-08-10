'use client';

import { Sparkles } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Resumen en lenguaje de dueño de negocio, no de analista. Va arriba de todo el detalle
 * y traduce los números a una frase que cualquiera entiende: cuánta gente entró y si
 * mejoró, de dónde llega, con qué te buscan. Se arma con los datos que el detalle ya trae,
 * sin pedir nada nuevo.
 */
export function SiteSummary({ data }: { data: any }) {
    const kpis = data?.kpis;
    if (!kpis) return null;

    const sessions = kpis.ga?.sessions ?? 0;
    const prevSessions = kpis.gaPrev?.sessions ?? 0;
    const clicks = kpis.gsc?.clicks ?? 0;
    const topChannel = data.channels?.[0];
    const topCountry = data.countries?.[0];
    const topQuery = data.gscQueries?.[0];

    // Nada que narrar si el sitio todavía no tiene tráfico.
    if (sessions === 0 && clicks === 0) {
        return (
            <Card className="border-primary/20 bg-primary/[0.03]">
                <CardContent className="flex items-start gap-3 p-4">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p className="text-sm text-muted-foreground">
                        Todavía no hay tráfico en este período. Cuando empiece a entrar gente, acá vas a
                        ver un resumen en criollo de cómo viene tu sitio.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const deltaPct = prevSessions > 0 ? Math.round(((sessions - prevSessions) / prevSessions) * 100) : null;
    const trend = deltaPct === null ? null
        : deltaPct >= 5 ? { word: `subió ${deltaPct}%`, tone: 'up' as const }
            : deltaPct <= -5 ? { word: `bajó ${Math.abs(deltaPct)}%`, tone: 'down' as const }
                : { word: 'se mantuvo estable', tone: 'flat' as const };

    // Traducción de los canales de GA4 a lenguaje llano.
    const channelPhrase = (ch?: string) => {
        const c = (ch || '').toLowerCase();
        if (c.includes('organic search')) return 'buscándote en Google';
        if (c.includes('direct')) return 'entrando directo (ya te conocían o guardaron el link)';
        if (c.includes('paid')) return 'desde avisos pagos';
        if (c.includes('social')) return 'desde redes sociales';
        if (c.includes('referral')) return 'desde enlaces en otros sitios';
        if (c.includes('email')) return 'desde emails';
        return ch ? `desde ${ch}` : '';
    };

    return (
        <Card className="border-primary/20 bg-primary/[0.03]">
            <CardContent className="flex items-start gap-3 p-4">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm leading-relaxed">
                    Tu web recibió{' '}
                    <strong className="font-semibold">{formatNumber(sessions)} visitas</strong> en este período
                    {trend && (
                        <>
                            {' '}y{' '}
                            <strong className={
                                trend.tone === 'up' ? 'font-semibold text-emerald-600'
                                    : trend.tone === 'down' ? 'font-semibold text-destructive'
                                        : 'font-semibold'
                            }>{trend.word}</strong>
                            {' '}frente al período anterior
                        </>
                    )}
                    .{' '}
                    {topChannel && (
                        <>La mayoría llegó <span className="font-medium">{channelPhrase(topChannel.channel)}</span>. </>
                    )}
                    {topCountry && topCountry.country && topCountry.country !== '(not set)' && (
                        <>El grueso del tráfico es de <span className="font-medium">{topCountry.country}</span>. </>
                    )}
                    {clicks > 0 && topQuery && (
                        <>En Google te encontraron sobre todo buscando{' '}
                            <span className="font-medium">«{topQuery.query}»</span>.</>
                    )}
                </p>
            </CardContent>
        </Card>
    );
}
