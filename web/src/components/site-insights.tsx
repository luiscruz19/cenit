'use client';

import Link from 'next/link';
import useSWR from 'swr';
import {
    ShieldAlert, ShieldCheck, TrendingUp, MousePointerClick, Lightbulb, ArrowUpRight,
} from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { formatNumber, formatPct, formatPosition } from '@/lib/format';
import { getRecommendedStrategies } from '@/lib/strategies';
import { InfoTip } from '@/components/info-tip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

type HealthItem = {
    id: number; name: string; level: 'ok' | 'warning' | 'critical';
    reasons: { code: string; label: string }[];
};
type Opportunity = {
    query: string; clicks: number; impressions: number; position: number;
    ctr: number; estClicks: number;
};

/** Salud de ESTE sitio. Reusa la clave SWR del nav (/insights/health): no pide de más. */
export function SiteHealthCard({ siteId }: { siteId: string }) {
    const { data: health, isLoading } = useSWR('/insights/health', fetcher, { revalidateOnFocus: false });

    const item: HealthItem | undefined = (health?.items || [])
        .find((i: HealthItem) => String(i.id) === String(siteId));

    if (isLoading) return <Skeleton className="h-28" />;

    // El endpoint de salud solo evalúa sitios activos: si el sitio no figura, no es "ok",
    // simplemente no hay diagnóstico (sitio desactivado).
    const ok = item?.level === 'ok';
    const unknown = !item;

    return (
        <div className="flex flex-col gap-4">
            <Card className={item?.level === 'critical' ? 'border-destructive/40' : undefined}>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        {unknown
                            ? <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                            : ok
                                ? <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                : <ShieldAlert className={item?.level === 'critical' ? 'h-4 w-4 text-destructive' : 'h-4 w-4 text-amber-500'} />}
                        Salud del sitio
                        {item && !ok && (
                            item.level === 'critical'
                                ? <Badge variant="destructive">crítico</Badge>
                                : <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 dark:text-amber-400">atención</Badge>
                        )}
                        {ok && <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400">ok</Badge>}
                        {unknown && <Badge variant="outline" className="text-muted-foreground">sin diagnóstico</Badge>}
                    </CardTitle>
                    <CardDescription>
                        {unknown
                            ? 'Este sitio está inactivo: no se evalúa su salud ni recibe datos nuevos del ETL.'
                            : ok
                                ? 'No se detectaron problemas de medición ni caídas relevantes.'
                                : 'Problemas detectados en los últimos 28 días.'}
                    </CardDescription>
                </CardHeader>
                {!ok && item && (
                    <CardContent>
                        <ul className="flex flex-col gap-2">
                            {item.reasons.map((r) => (
                                <li key={r.code} className="flex gap-2 text-sm text-muted-foreground">
                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                                    {r.label}
                                </li>
                            ))}
                        </ul>
                        <Link href="/salud" className="mt-3 inline-block text-xs font-medium text-muted-foreground hover:text-foreground">
                            Ver la salud de todo el portfolio →
                        </Link>
                    </CardContent>
                )}
            </Card>
        </div>
    );
}

/**
 * Plan de acción de ESTE sitio: oportunidades SEO acotadas al sitio
 * (/insights/seo-opportunities?siteId=) + las estrategias del playbook que le tocan
 * según sus señales reales (salud + oportunidades). Se recalcula con cada ETL.
 */
export function SiteActionPlan({ siteId }: { siteId: string }) {
    const { data: health } = useSWR('/insights/health', fetcher, { revalidateOnFocus: false });
    const { data: seo, isLoading } = useSWR(
        `/insights/seo-opportunities?siteId=${siteId}`, fetcher, { revalidateOnFocus: false }
    );

    const item: HealthItem | undefined = (health?.items || [])
        .find((i: HealthItem) => String(i.id) === String(siteId));

    const page2: Opportunity[] = seo?.page2 || [];
    const lowCtr: Opportunity[] = seo?.lowCtr || [];
    const estGain = seo?.totals?.estClicksGain || 0;

    const strategies = getRecommendedStrategies({
        page2Count: seo?.totals?.page2Count || 0,
        lowCtrCount: seo?.totals?.lowCtrCount || 0,
        reasonCodes: (item?.reasons || []).map((r) => r.code),
    });

    if (isLoading) return <Skeleton className="h-64" />;

    return (
        <div className="flex flex-col gap-4">
            {/* ── Oportunidades SEO de este sitio ─────────────────────────── */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                        Oportunidades SEO
                    </CardTitle>
                    <CardDescription>
                        {estGain > 0
                            ? <>Hasta <span className="font-medium text-foreground">{formatNumber(estGain)}</span> clicks potenciales si se trabajan estas consultas (últimos 90 días).</>
                            : 'Sin oportunidades detectadas en los últimos 90 días.'}
                    </CardDescription>
                </CardHeader>
                {(page2.length > 0 || lowCtr.length > 0) && (
                    <CardContent className="flex flex-col gap-6">
                        {page2.length > 0 && (
                            <div>
                                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                                    <TrendingUp className="h-3.5 w-3.5" />
                                    En página 2 — subirlas al top
                                    <InfoTip term="posicion" />
                                </p>
                                <OpportunityTable rows={page2.slice(0, 8)} />
                            </div>
                        )}
                        {lowCtr.length > 0 && (
                            <div>
                                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                                    <MousePointerClick className="h-3.5 w-3.5" />
                                    CTR bajo — mejorar título y descripción
                                    <InfoTip term="ctr" />
                                </p>
                                <OpportunityTable rows={lowCtr.slice(0, 8)} />
                            </div>
                        )}
                    </CardContent>
                )}
            </Card>

            {/* ── Estrategias recomendadas para este sitio ────────────────── */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        Estrategias recomendadas
                    </CardTitle>
                    <CardDescription>
                        Elegidas del playbook según las señales reales de este sitio.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    {strategies.map(({ strategy, why }) => (
                        <div key={strategy.slug} className="border-b pb-4 last:border-0 last:pb-0">
                            <p className="text-sm font-medium">{strategy.title}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{why}</p>
                            <ol className="mt-2 flex flex-col gap-1">
                                {strategy.steps.map((step, i) => (
                                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
                                            {i + 1}
                                        </span>
                                        {step}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    ))}
                    <Link href="/estrategias" className="group inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                        Ver el playbook completo
                        <ArrowUpRight className="h-3 w-3 opacity-60" />
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}

function OpportunityTable({ rows }: { rows: Opportunity[] }) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Consulta</TableHead>
                    <TableHead className="text-right">Pos.</TableHead>
                    <TableHead className="text-right">Impr.</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">Clicks ganables</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.map((o) => (
                    <TableRow key={o.query}>
                        <TableCell className="max-w-xs truncate" title={o.query}>{o.query}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatPosition(o.position)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(o.impressions)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatPct(o.ctr)}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-emerald-600">
                            +{formatNumber(o.estClicks)}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
