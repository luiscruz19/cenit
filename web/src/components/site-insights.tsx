'use client';

import Link from 'next/link';
import useSWR from 'swr';
import {
    ShieldAlert, ShieldCheck, Lightbulb, ArrowUpRight, TrendingUp,
} from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { formatNumber } from '@/lib/format';
import { cn } from '@/utils/shadcn';
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

type Recommendation = {
    id: string;
    category: string;
    priority: 1 | 2 | 3;
    title: string;
    finding: string;
    why: string;
    actions: string[];
    impactClicks: number;
    evidence: { type: string; columns: string[]; rows: (string | number)[][] } | null;
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
                            : <Badge variant="warning">atención</Badge>
                    )}
                    {ok && <Badge variant="success">ok</Badge>}
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
    );
}

const PRIORITY = {
    1: { label: 'Alta', variant: 'destructive' as const },
    2: { label: 'Media', variant: 'warning' as const },
    3: { label: 'Baja', variant: 'secondary' as const },
};

/**
 * Recomendaciones de ESTE sitio, generadas analizando sus propios datos
 * (/insights/strategies). No es un playbook genérico: cada hallazgo cita las consultas,
 * las páginas y los números reales del sitio, y por eso dos sitios distintos ven
 * recomendaciones distintas.
 */
export function SiteActionPlan({ siteId, period }: { siteId: string; period: string }) {
    const { data, isLoading } = useSWR(
        `/insights/strategies?siteId=${siteId}&period=${period}`,
        fetcher,
        { revalidateOnFocus: false }
    );

    if (isLoading) return <Skeleton className="h-64" />;

    const recommendations: Recommendation[] = data?.recommendations || [];
    const context = data?.context;

    return (
        <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
                <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        Qué hacer en este sitio
                    </CardTitle>
                    <CardDescription>
                        Sale de analizar los datos de <span className="font-medium">este</span> sitio:
                        sus consultas, sus páginas y sus números.
                        {data?.totalImpactClicks > 0 && (
                            <> Hasta <span className="font-medium text-foreground">
                                {formatNumber(data.totalImpactClicks)}
                            </span> clicks potenciales en juego.</>
                        )}
                    </CardDescription>
                </div>
                <Link
                    href="/estrategias"
                    className="group inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                    Playbook general
                    <ArrowUpRight className="h-3 w-3 opacity-60" />
                </Link>
            </CardHeader>

            <CardContent className="flex flex-col gap-6">
                {recommendations.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        {!context?.hasSearchData && !context?.hasTrafficData
                            ? 'Todavía no hay datos suficientes de este sitio para analizarlo. Revisá el mapeo a GA4 y Search Console.'
                            : 'No se detectaron problemas ni oportunidades claras en este período. Buena señal.'}
                    </p>
                )}

                {recommendations.map((r) => (
                    <div key={r.id} className="border-b pb-6 last:border-0 last:pb-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={PRIORITY[r.priority].variant}>
                                {PRIORITY[r.priority].label}
                            </Badge>
                            <Badge variant="outline" className="font-normal text-muted-foreground">
                                {r.category}
                            </Badge>
                            {r.impactClicks > 0 && (
                                <Badge variant="success" className="gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    +{formatNumber(r.impactClicks)} clicks
                                </Badge>
                            )}
                        </div>

                        <h3 className="mt-2 font-medium">{r.title}</h3>

                        {/* El hallazgo es la evidencia en prosa: números y nombres reales. */}
                        <p className="mt-1.5 rounded-sm bg-muted/60 px-3 py-2 text-sm">
                            {r.finding}
                        </p>

                        <p className="mt-2 text-sm text-muted-foreground">{r.why}</p>

                        <ul className="mt-3 flex flex-col gap-2">
                            {r.actions.map((action, i) => (
                                <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
                                        <span aria-hidden className="mt-2.5 h-px w-3 shrink-0 bg-border" />
                                        {action}
                                </li>
                            ))}
                        </ul>

                        {r.evidence && r.evidence.rows.length > 0 && (
                            <div className="mt-3 overflow-x-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {r.evidence.columns.map((c, i) => (
                                                <TableHead
                                                    key={c}
                                                    className={cn('whitespace-nowrap text-xs', i > 0 && 'text-right')}
                                                >
                                                    {c}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {r.evidence.rows.map((row, i) => (
                                            <TableRow key={i}>
                                                {row.map((cell, j) => (
                                                    <TableCell
                                                        key={j}
                                                        className={cn(
                                                            'text-sm',
                                                            j === 0 && 'max-w-[240px] truncate font-medium',
                                                            j > 0 && 'text-right tabular-nums'
                                                        )}
                                                        title={j === 0 ? String(cell) : undefined}
                                                    >
                                                        {typeof cell === 'number' ? formatNumber(cell) : cell}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
