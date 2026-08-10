'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ExternalLink, Download, Table2, Settings } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { parsePeriod } from '@/lib/periods';
import {
    formatCompact, formatDate, formatDuration, formatNumber, formatPct, formatPosition,
} from '@/lib/format';
import { PeriodSelector } from '@/components/period-selector';
import { KpiStat } from '@/components/kpi-stat';
import { SiteHealthCard, SiteActionPlan } from '@/components/site-insights';
import { SiteMeta } from '@/components/site-meta';
import { SiteClarity } from '@/components/site-clarity';
import { SitePerformance } from '@/components/site-performance';
import { SiteSummary } from '@/components/site-summary';
import { SiteGeography } from '@/components/site-geography';
import { SiteConversionsGuide } from '@/components/site-conversions-guide';
import { SiteRankings } from '@/components/site-rankings';
import { ErrorState } from '@/components/ui/states';
import { SiteAlerts } from '@/components/site-alerts';
import { TimeSeriesChart } from '@/components/charts/time-series-chart';
import { MonthlyTrendChart } from '@/components/charts/monthly-trend-chart';
import { ChannelBarChart } from '@/components/charts/channel-bar-chart';
import { DeviceDonut } from '@/components/charts/device-donut';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { btn } from '@/lib/ui';


/** Encabezado de sección, para que la página larga siga siendo navegable. */
function Section({ title, hint }: { title: string; hint?: string }) {
    return (
        <div className="flex items-baseline gap-2 pt-2">
            <h2 className="font-display text-sm font-semibold text-foreground">{title}</h2>
            {hint && <span className="text-xs text-muted-foreground">· {hint}</span>}
        </div>
    );
}

export function SiteDetailClient({ siteId }: { siteId: string }) {
    const period = parsePeriod(useSearchParams().get('period'));
    const { data, isLoading, error, mutate } = useSWR(`/metrics/sites/${siteId}?period=${period}`, fetcher);
    const { data: monthlyData } = useSWR(`/insights/monthly/${siteId}`, fetcher);

    if (error) {
        return <ErrorState message={(error as Error).message} onRetry={() => mutate()} />;
    }

    const site = data?.site;
    const kpis = data?.kpis;
    const range = data?.range;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Link href={`/?period=${period}`} className="rounded-md border bg-background p-2 hover:bg-muted">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                            {site?.name || '…'}
                            {site && (
                                <a href={`https://${site.domain}`} target="_blank" rel="noreferrer"
                                    className="text-muted-foreground hover:text-foreground">
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            )}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {site?.domain}
                            {range && <> · {formatDate(range.from)} – {formatDate(range.to)} · vs período anterior</>}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {/* El PDF se arma al vuelo: no hace falta crear un reporte guardado. */}
                    <a
                        className={btn}
                        href={`/api/proxy/reports/site/${siteId}/pdf?period=${period}`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <Download className="h-4 w-4" />
                        PDF
                    </a>
                    <Link className={btn} href="/explorer">
                        <Table2 className="h-4 w-4" />
                        Explorer
                    </Link>
                    <Link className={btn} href="/settings">
                        <Settings className="h-4 w-4" />
                        Mapeo
                    </Link>
                    <PeriodSelector />
                </div>
            </div>

            {isLoading || !data ? (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[86px]" />)}
                    </div>
                    <Skeleton className="h-80" />
                </>
            ) : (
                <>
                    <SiteSummary data={data} />

                    {/* ── Tráfico (GA4) ──────────────────────────────────── */}
                    <Section title="Tráfico" hint="Google Analytics 4" />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <KpiStat label="Sesiones" value={formatCompact(kpis.ga?.sessions)} term="sesiones"
                            current={kpis.ga?.sessions} previous={kpis.gaPrev?.sessions} yoy={kpis.gaYoy?.sessions} />
                        <KpiStat label="Usuarios" value={formatCompact(kpis.ga?.users)} term="usuarios"
                            current={kpis.ga?.users} previous={kpis.gaPrev?.users} yoy={kpis.gaYoy?.users} />
                        <KpiStat label="Usuarios nuevos" value={formatCompact(kpis.ga?.newUsers)} term="usuarios"
                            current={kpis.ga?.newUsers} previous={kpis.gaPrev?.newUsers} yoy={kpis.gaYoy?.newUsers} />
                        <KpiStat label="Recurrentes" value={formatCompact(Math.max(0, (kpis.ga?.users || 0) - (kpis.ga?.newUsers || 0)))}
                            current={Math.max(0, (kpis.ga?.users || 0) - (kpis.ga?.newUsers || 0))}
                            previous={Math.max(0, (kpis.gaPrev?.users || 0) - (kpis.gaPrev?.newUsers || 0))} />
                        <KpiStat label="Vistas de página" value={formatCompact(kpis.ga?.pageViews)} term="vistas"
                            current={kpis.ga?.pageViews} previous={kpis.gaPrev?.pageViews} yoy={kpis.gaYoy?.pageViews} />
                        <KpiStat label="Interacción" value={formatPct(kpis.ga?.engagementRate)} term="engagement-rate"
                            current={kpis.ga?.engagementRate} previous={kpis.gaPrev?.engagementRate} />
                        <KpiStat label="Duración media" value={formatDuration(kpis.ga?.avgSessionDuration)}
                            current={kpis.ga?.avgSessionDuration} previous={kpis.gaPrev?.avgSessionDuration} />
                        <KpiStat label="Eventos clave" value={formatCompact(kpis.ga?.keyEvents)}
                            current={kpis.ga?.keyEvents} previous={kpis.gaPrev?.keyEvents} yoy={kpis.gaYoy?.keyEvents} />
                        <KpiStat
                            label="Tasa de conversión"
                            value={kpis.ga?.sessions ? formatPct((kpis.ga.keyEvents || 0) / kpis.ga.sessions) : '—'}
                            current={kpis.ga?.sessions ? (kpis.ga.keyEvents || 0) / kpis.ga.sessions : null}
                            previous={kpis.gaPrev?.sessions ? (kpis.gaPrev.keyEvents || 0) / kpis.gaPrev.sessions : null}
                        />
                    </div>

                    {/* ── Búsqueda (GSC) ─────────────────────────────────── */}
                    <Section title="Búsqueda" hint="Search Console · datos con ~3 días de retraso" />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <KpiStat label="Clicks" value={formatCompact(kpis.gsc?.clicks)} term="clicks"
                            current={kpis.gsc?.clicks} previous={kpis.gscPrev?.clicks} yoy={kpis.gscYoy?.clicks} />
                        <KpiStat label="Impresiones" value={formatCompact(kpis.gsc?.impressions)} term="impresiones"
                            current={kpis.gsc?.impressions} previous={kpis.gscPrev?.impressions} yoy={kpis.gscYoy?.impressions} />
                        <KpiStat label="CTR" value={formatPct(kpis.gsc?.ctr)} term="ctr"
                            current={kpis.gsc?.ctr} previous={kpis.gscPrev?.ctr} />
                        <KpiStat label="Posición media" value={formatPosition(kpis.gsc?.position)} term="posicion"
                            current={kpis.gsc?.position} previous={kpis.gscPrev?.position} invert />
                    </div>

                    {/* ── Diagnóstico ────────────────────────────────────── */}
                    <Section title="Diagnóstico" />
                    <SiteHealthCard siteId={siteId} />
                    <SitePerformance siteId={siteId} />
                    <SiteClarity siteId={siteId} period={period} />
                    <SiteMeta siteId={siteId} period={period} />

                    {/* ── Evolución ──────────────────────────────────────── */}
                    <Section title="Evolución" />
                    <Card>
                        <CardHeader className="pb-2">
                            <Tabs defaultValue="ga4">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base">Evolución diaria</CardTitle>
                                    <TabsList>
                                        <TabsTrigger value="ga4">Tráfico (GA4)</TabsTrigger>
                                        <TabsTrigger value="gsc">Búsqueda (GSC)</TabsTrigger>
                                    </TabsList>
                                </div>
                                <TabsContent value="ga4" className="mt-4">
                                    <TimeSeriesChart
                                        data={data.series}
                                        series={[
                                            { key: 'sessions', label: 'Sesiones', color: 'hsl(var(--chart-1))' },
                                            { key: 'users', label: 'Usuarios', color: 'hsl(var(--chart-2))' },
                                        ]}
                                    />
                                </TabsContent>
                                <TabsContent value="gsc" className="mt-4">
                                    <TimeSeriesChart
                                        data={data.series}
                                        series={[
                                            { key: 'clicks', label: 'Clicks', color: 'hsl(var(--chart-3))' },
                                            { key: 'impressions', label: 'Impresiones', color: 'hsl(var(--chart-4))' },
                                        ]}
                                    />
                                </TabsContent>
                            </Tabs>
                        </CardHeader>
                        <CardContent />
                    </Card>

                    {monthlyData?.trend?.length > 1 && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Tendencia histórica
                                    <span className="ml-2 align-middle text-xs font-normal text-muted-foreground">últimos 16 meses</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <MonthlyTrendChart data={monthlyData.trend} />
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid gap-4 lg:grid-cols-3">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Canales de tráfico
                                    <span className="ml-2 align-middle text-xs font-normal text-muted-foreground">actual vs anterior</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {data.channels.length
                                    ? <ChannelBarChart data={data.channels} />
                                    : <p className="text-sm text-muted-foreground">Sin datos de canales en el período.</p>}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Dispositivos</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {data.devices.length
                                    ? <DeviceDonut data={data.devices} />
                                    : <p className="text-sm text-muted-foreground">Sin datos de dispositivos en el período.</p>}
                            </CardContent>
                        </Card>
                        <SiteGeography countries={data.countries || []} />
                    </div>

                    {/* ── Posicionamiento ────────────────────────────────── */}
                    <Section title="Posicionamiento" />
                    <SiteRankings siteId={siteId} period={period} />

                    {/* ── Contenido ──────────────────────────────────────── */}
                    {/* ── Resultados (conversiones) ──────────────────────── */}
                    <Section title="Resultados" hint="eventos clave configurados en GA4" />
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">
                                {(data.events || []).length ? 'Conversiones por tipo' : 'Todavía no medís conversiones'}
                            </CardTitle>
                            <CardDescription>
                                {(data.events || []).length
                                    ? 'Eventos clave que registró este sitio en el período.'
                                    : 'Sin eventos clave configurados en GA4. Estas son las conversiones que conviene medir en este sitio y cómo activarlas.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-5">
                            {(data.events || []).length > 0 && (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Evento clave</TableHead>
                                            <TableHead className="text-right">Conversiones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.events.map((e: any) => (
                                            <TableRow key={e.event}>
                                                <TableCell className="font-medium">{e.event}</TableCell>
                                                <TableCell className="text-right tabular-nums">{formatNumber(e.keyEvents)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                            <SiteConversionsGuide
                                domain={site?.domain || ''}
                                existingEvents={data.events || []}
                            />
                        </CardContent>
                    </Card>

                    {/* Qué canal convierte mejor (solo si hay conversiones cargadas). */}
                    {(data.channels || []).some((c: any) => (c.keyEvents || 0) > 0) && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Qué canal te trae los resultados</CardTitle>
                                <CardDescription>Conversiones y tasa por canal de tráfico.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Canal</TableHead>
                                            <TableHead className="text-right">Sesiones</TableHead>
                                            <TableHead className="text-right">Conversiones</TableHead>
                                            <TableHead className="text-right">Tasa</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {[...data.channels]
                                            .sort((a: any, b: any) => (b.keyEvents || 0) - (a.keyEvents || 0))
                                            .map((c: any) => (
                                                <TableRow key={c.channel}>
                                                    <TableCell className="font-medium">{c.channel}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{formatNumber(c.sessions)}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{formatNumber(c.keyEvents || 0)}</TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                        {c.sessions ? formatPct((c.keyEvents || 0) / c.sessions) : '—'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    <Section title="Contenido" hint="lo que más tracciona" />
                    <Card>
                        <CardHeader className="pb-0">
                            <Tabs defaultValue="ga-pages">
                                <TabsList>
                                    <TabsTrigger value="ga-pages">Páginas (GA4)</TabsTrigger>
                                    <TabsTrigger value="landings">Páginas de entrada</TabsTrigger>
                                    <TabsTrigger value="gsc-queries">Consultas (GSC)</TabsTrigger>
                                    <TabsTrigger value="gsc-pages">Páginas (GSC)</TabsTrigger>
                                </TabsList>
                                <TabsContent value="landings" className="mt-2">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Página de entrada</TableHead>
                                                <TableHead className="text-right">Sesiones</TableHead>
                                                <TableHead className="text-right">Conversiones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(data.landings || []).map((p: any) => (
                                                <TableRow key={p.path}>
                                                    <TableCell className="max-w-md truncate font-mono text-xs">{p.path}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{formatNumber(p.sessions)}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{formatNumber(p.keyEvents)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                                <TabsContent value="ga-pages" className="mt-2">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Página</TableHead>
                                                <TableHead className="text-right">Vistas</TableHead>
                                                <TableHead className="text-right">Sesiones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.gaPages.map((p: any) => (
                                                <TableRow key={p.path}>
                                                    <TableCell className="max-w-md truncate font-mono text-xs">{p.path}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{formatNumber(p.pageViews)}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{formatNumber(p.sessions)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                                <TabsContent value="gsc-queries" className="mt-2">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Consulta</TableHead>
                                                <TableHead className="text-right">Clicks</TableHead>
                                                <TableHead className="text-right">Impresiones</TableHead>
                                                <TableHead className="text-right">CTR</TableHead>
                                                <TableHead className="text-right">Posición</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.gscQueries.map((q: any) => (
                                                <TableRow key={q.query}>
                                                    <TableCell className="max-w-md truncate">{q.query}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{formatNumber(q.clicks)}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{formatNumber(q.impressions)}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{formatPct(q.ctr)}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{formatPosition(q.position)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                                <TabsContent value="gsc-pages" className="mt-2">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Página</TableHead>
                                                <TableHead className="text-right">Clicks</TableHead>
                                                <TableHead className="text-right">Impresiones</TableHead>
                                                <TableHead className="text-right">CTR</TableHead>
                                                <TableHead className="text-right">Posición</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.gscPages.map((p: any) => (
                                                <TableRow key={p.page}>
                                                    <TableCell className="max-w-md truncate font-mono text-xs">{p.page}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{formatNumber(p.clicks)}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{formatNumber(p.impressions)}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{formatPct(p.ctr)}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{formatPosition(p.position)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                            </Tabs>
                        </CardHeader>
                        <CardContent />
                    </Card>

                    {/* ── Qué hacer ──────────────────────────────────────── */}
                    <Section title="Qué hacer" />
                    <SiteAlerts siteId={siteId} />
                    <SiteActionPlan siteId={siteId} period={period} />

                    {(!site?.mapped?.ga4 || !site?.mapped?.gsc) && (
                        <p className="text-sm text-muted-foreground">
                            {!site?.mapped?.ga4 && <Badge variant="outline" className="mr-2">sin GA4</Badge>}
                            {!site?.mapped?.gsc && <Badge variant="outline" className="mr-2">sin Search Console</Badge>}
                            Completá el mapeo en <Link href="/settings" className="underline">Configuración</Link>.
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
