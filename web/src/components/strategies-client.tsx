'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import {
    Lightbulb, TrendingUp, MousePointerClick, ShieldAlert, ArrowUpRight, Target,
} from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { formatNumber } from '@/lib/format';
import { resolveCurrentSite } from '@/lib/current-site';
import { STRATEGIES, STRATEGIES_UPDATED_AT } from '@/lib/strategies';
import { InfoTip } from '@/components/info-tip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type HealthItem = {
    id: number; name: string; domain: string; level: 'ok' | 'warning' | 'critical';
    reasons: { code: string; label: string }[];
};
type Opportunity = {
    siteId: number; site: string; query: string; position: number; impressions: number;
    ctr: number; estClicks: number;
};

const levelBadge = (level: string) =>
    level === 'critical'
        ? <Badge variant="destructive">crítico</Badge>
        : <Badge variant="warning">atención</Badge>;

export function StrategiesClient() {
    const searchParams = useSearchParams();
    const { data: sitesData } = useSWR('/sites', fetcher, { revalidateOnFocus: false });
    const sites = (sitesData?.sites || []).filter((s: any) => s.is_active);

    // La pantalla vive dentro del proyecto activo: URL (?site=) → guardado → primero.
    const [siteId, setSiteId] = useState<string>('');
    useEffect(() => {
        if (!siteId && sites.length) {
            setSiteId(resolveCurrentSite(sites, searchParams.get('site')) || '');
        }
    }, [sites, siteId, searchParams]);

    const siteName = sites.find((s: any) => String(s.id) === siteId)?.name || null;

    const { data: health, isLoading: loadingHealth } = useSWR('/insights/health', fetcher, { revalidateOnFocus: false });
    const { data: seo, isLoading: loadingSeo } = useSWR(
        siteId ? `/insights/seo-opportunities?siteId=${siteId}` : null,
        fetcher, { revalidateOnFocus: false },
    );

    // Solo las alertas de este proyecto.
    const alerts: HealthItem[] = (health?.items || [])
        .filter((i: HealthItem) => i.level !== 'ok')
        .filter((i: HealthItem) => !siteId || String(i.id) === siteId);
    const opportunities: (Opportunity & { type: 'page2' | 'lowCtr' })[] = [
        ...(seo?.page2 || []).map((o: Opportunity) => ({ ...o, type: 'page2' as const })),
        ...(seo?.lowCtr || []).map((o: Opportunity) => ({ ...o, type: 'lowCtr' as const })),
    ].sort((a, b) => b.estClicks - a.estClicks).slice(0, 6);

    const estGain = seo?.totals?.estClicksGain || 0;
    const loading = loadingHealth || loadingSeo || !siteId;

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-xl font-semibold tracking-tight">
                    Estrategias{siteName && <span className="text-muted-foreground"> · {siteName}</span>}
                </h1>
                <p className="text-sm text-muted-foreground">
                    Qué hacer para mejorar el posicionamiento y el rendimiento de este proyecto. Las prioridades
                    se recalculan con cada corrida del ETL; el playbook se revisa periódicamente.
                </p>
            </div>

            {/* ── Prioridades ahora (data-driven) ─────────────────────────── */}
            <section className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <h2 className="font-display text-sm font-semibold text-foreground">
                        Prioridades ahora
                    </h2>
                </div>

                {loading ? (
                    <div className="grid gap-3 md:grid-cols-2">
                        <Skeleton className="h-40" />
                        <Skeleton className="h-40" />
                    </div>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <ShieldAlert className="h-4 w-4 text-red-500" />
                                    Problemas a resolver
                                </CardTitle>
                                <CardDescription>Señales de Salud de este proyecto, las más graves primero.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3">
                                {alerts.length === 0 && (
                                    <p className="text-sm text-muted-foreground">Sin alertas: este proyecto está OK.</p>
                                )}
                                {alerts.slice(0, 6).map((s) => (
                                    <div key={s.id} className="flex flex-col gap-1 border-b pb-2 last:border-0 last:pb-0">
                                        <div className="flex items-center gap-2">
                                            <Link href={`/sites/${s.id}`} className="group flex items-center gap-1 text-sm font-medium">
                                                {s.name}
                                                <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
                                            </Link>
                                            {levelBadge(s.level)}
                                        </div>
                                        <p className="text-xs text-muted-foreground">{s.reasons[0]?.label}</p>
                                    </div>
                                ))}
                                {alerts.length > 6 && (
                                    <Link href={`/salud?site=${siteId}`} className="text-xs font-medium text-muted-foreground hover:text-foreground">
                                        Ver todo el detalle en Salud →
                                    </Link>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                                    Ganancias rápidas de SEO
                                </CardTitle>
                                <CardDescription>
                                    {estGain > 0
                                        ? <>Hasta <span className="font-medium text-foreground">{formatNumber(estGain)}</span> clicks/mes potenciales en este proyecto.</>
                                        : 'Consultas con más potencial de clicks.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3">
                                {opportunities.length === 0 && (
                                    <p className="text-sm text-muted-foreground">Sin oportunidades detectadas todavía.</p>
                                )}
                                {opportunities.map((o, i) => (
                                    <div key={`${o.siteId}-${o.query}-${i}`} className="flex flex-col gap-0.5 border-b pb-2 last:border-0 last:pb-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate text-sm font-medium" title={o.query}>{o.query}</span>
                                            <span className="shrink-0 text-xs font-medium tabular-nums text-emerald-600">
                                                +{formatNumber(o.estClicks)}
                                            </span>
                                        </div>
                                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            {o.type === 'page2'
                                                ? <><TrendingUp className="h-3 w-3" />pos. {o.position} · subir al top</>
                                                : <><MousePointerClick className="h-3 w-3" />CTR bajo · mejorar título</>}
                                            <span>·</span>
                                            <Link href={`/sites/${o.siteId}`} className="hover:text-foreground">{o.site}</Link>
                                        </p>
                                    </div>
                                ))}
                                <Link href={`/oportunidades?site=${siteId}`} className="text-xs font-medium text-muted-foreground hover:text-foreground">
                                    Ver todas las oportunidades →
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </section>

            {/* ── Playbook curado ─────────────────────────────────────────── */}
            <section className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-muted-foreground" />
                    <h2 className="font-display text-sm font-semibold text-foreground">
                        Playbook de posicionamiento
                    </h2>
                </div>
                {/*
                  * Narrativa seccionada, no grilla de cards. Son seis estrategias
                  * comparables: en cajas iguales, ninguna manda y la lista no se puede
                  * leer de corrido. Acá el título hace la jerarquía y la regla separa,
                  * que es el trabajo que la card estaba fingiendo hacer.
                  */}
                <div className="flex flex-col">
                    {STRATEGIES.map((s) => (
                        <article
                            key={s.slug}
                            className="border-b py-6 last:border-0 md:grid md:grid-cols-[minmax(0,20rem)_1fr] md:gap-10"
                        >
                            <div>
                                <h3 className="font-display text-lg font-medium">{s.title}</h3>
                                <p className="mt-1 max-w-[42ch] text-sm text-muted-foreground">{s.goal}</p>
                                {s.watch && s.watch.length > 0 && (
                                    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                        <span>Se ve en</span>
                                        {s.watch.map((slug) => (
                                            <span key={slug} className="inline-flex items-center gap-0.5">
                                                <Link
                                                    href={`/glosario#${slug}`}
                                                    className="underline decoration-border underline-offset-4 hover:text-foreground"
                                                >
                                                    {slug}
                                                </Link>
                                                <InfoTip term={slug} />
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <ul className="mt-4 flex max-w-[68ch] flex-col gap-2 md:mt-0">
                                {s.steps.map((step, i) => (
                                    <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
                                        <span aria-hidden className="mt-2.5 h-px w-3 shrink-0 bg-border" />
                                        {step}
                                    </li>
                                ))}
                            </ul>
                        </article>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground">
                    Playbook actualizado el {STRATEGIES_UPDATED_AT}. ¿Falta una estrategia? Se puede sumar.
                </p>
            </section>
        </div>
    );
}
