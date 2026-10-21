'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Gauge, Smartphone, Monitor } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { cn } from '@/utils/shadcn';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type Metrics = {
    date: string; perfScore: number | null;
    lcpMs: number | null; inpMs: number | null; cls: number | null;
    fcpMs: number | null; ttfbMs: number | null;
    source: 'field' | 'lab' | null; overall: string | null;
};

/** Umbrales oficiales de Google: bueno / a mejorar / malo. */
const rate = (metric: string, v: number | null): 'good' | 'ni' | 'poor' | null => {
    if (v === null) return null;
    const t: Record<string, [number, number]> = {
        lcp: [2500, 4000], inp: [200, 500], cls: [0.1, 0.25],
        fcp: [1800, 3000], ttfb: [800, 1800], score: [50, 90],
    };
    if (metric === 'score') return v >= 90 ? 'good' : v >= 50 ? 'ni' : 'poor';
    const range = t[metric];
    if (!range) return null; // métrica sin umbral definido: sin color, no rompe.
    const [g, p] = range;
    return v <= g ? 'good' : v <= p ? 'ni' : 'poor';
};

const TONE = {
    good: 'text-emerald-600',
    ni: 'text-amber-600',
    poor: 'text-destructive',
} as const;

function Vital({ label, metric, value, format, hint }: {
    label: string; metric: string; value: number | null;
    format: (v: number) => string; hint: string;
}) {
    const tone = rate(metric, value);
    return (
        <div className="rounded-sm border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn('mt-1 text-xl font-semibold tabular-nums', tone && TONE[tone])}>
                {value === null ? '—' : format(value)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        </div>
    );
}

/**
 * Rendimiento del sitio (Core Web Vitals). Es lo que Google usa para rankear y lo que ningún
 * reporte profesional omite. Muestra datos de usuarios reales (CrUX) cuando hay tráfico
 * suficiente, o de laboratorio (Lighthouse) si no. Mobile primero: Google rankea por mobile.
 */
export function SitePerformance({ siteId }: { siteId: string }) {
    const [strategy, setStrategy] = useState<'mobile' | 'desktop'>('mobile');
    const { data, isLoading } = useSWR(`/insights/performance?siteId=${siteId}`, fetcher, {
        revalidateOnFocus: false,
    });

    if (isLoading) return <Skeleton className="h-48" />;
    if (!data) return null;

    const m: Metrics | null = data[strategy];
    const scoreTone = rate('score', m?.perfScore ?? null);

    return (
        <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
                <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Gauge className="h-4 w-4 text-muted-foreground" />
                        Rendimiento (Core Web Vitals)
                    </CardTitle>
                    <CardDescription>
                        Velocidad y estabilidad de la página. Google lo usa para rankear.
                        {m?.source === 'field' && ' Datos de usuarios reales (últimos 28 días).'}
                        {m?.source === 'lab' && ' Medición de laboratorio (el sitio no tiene tráfico suficiente para datos reales).'}
                    </CardDescription>
                </div>
                <div className="flex rounded-md border bg-background p-0.5">
                    {(['mobile', 'desktop'] as const).map((s) => {
                        const Icon = s === 'mobile' ? Smartphone : Monitor;
                        return (
                            <button
                                key={s}
                                onClick={() => setStrategy(s)}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                                    strategy === s ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {s === 'mobile' ? 'Celular' : 'Escritorio'}
                            </button>
                        );
                    })}
                </div>
            </CardHeader>
            <CardContent>
                {!data.hasData || !m ? (
                    <div className="flex flex-col items-start gap-2 text-sm">
                        <Badge variant="warning">midiendo</Badge>
                        <p className="text-muted-foreground">
                            Todavía no hay una medición de rendimiento para este sitio. Se toma una foto por
                            día; si recién se conectó, esperá a la próxima corrida.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                'flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 text-xl font-semibold tabular-nums',
                                scoreTone === 'good' && 'border-emerald-500/40 text-emerald-600',
                                scoreTone === 'ni' && 'border-amber-500/40 text-amber-600',
                                scoreTone === 'poor' && 'border-destructive/40 text-destructive',
                            )}>
                                {m.perfScore ?? '—'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                                <p className="font-medium text-foreground">Puntaje de velocidad</p>
                                <p>0–100. Verde ≥ 90, ámbar 50–89, rojo &lt; 50.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <Vital label="LCP" metric="lcp" value={m.lcpMs}
                                format={(v) => `${(v / 1000).toFixed(1).replace('.', ',')} s`}
                                hint="carga del contenido principal" />
                            <Vital label="INP" metric="inp" value={m.inpMs}
                                format={(v) => `${Math.round(v)} ms`}
                                hint="respuesta a la interacción" />
                            <Vital label="CLS" metric="cls" value={m.cls}
                                format={(v) => v.toFixed(2).replace('.', ',')}
                                hint="estabilidad visual" />
                            <Vital label="TTFB" metric="ttfb" value={m.ttfbMs}
                                format={(v) => `${Math.round(v)} ms`}
                                hint="respuesta del servidor" />
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
