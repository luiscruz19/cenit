'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { parsePeriod } from '@/lib/periods';
import {
    formatCompact, formatDate, formatDuration, formatNumber, formatPct, formatPosition,
} from '@/lib/format';
import { PeriodSelector } from '@/components/period-selector';
import { KpiStat } from '@/components/kpi-stat';
import { TimeSeriesChart } from '@/components/charts/time-series-chart';
import { MonthlyTrendChart } from '@/components/charts/monthly-trend-chart';
import { ChannelBarChart } from '@/components/charts/channel-bar-chart';
import { DeviceDonut } from '@/components/charts/device-donut';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function SiteDetailClient({ siteId }: { siteId: string }) {
    const period = parsePeriod(useSearchParams().get('period'));
    const { data, isLoading, error } = useSWR(`/metrics/sites/${siteId}?period=${period}`, fetcher);
    const { data: monthlyData } = useSWR(`/insights/monthly/${siteId}`, fetcher);

    if (error) {
        return (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {String((error as Error).message)}
            </p>
        );
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
                            {range && <> · {formatDate(range.from)} – {formatDate(range.to)}</>}
                        </p>
                    </div>
                </div>
                <PeriodSelector />
            </div>

            {isLoading || !data ? (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[86px]" />)}
                    </div>
                    <Skeleton className="h-80" />
                </>
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        <KpiStat label="Sesiones" value={formatCompact(kpis.ga?.sessions)}
                            current={kpis.ga?.sessions} previous={kpis.gaPrev?.sessions} yoy={kpis.gaYoy?.sessions} />
                        <KpiStat label="Usuarios" value={formatCompact(kpis.ga?.users)}
                            current={kpis.ga?.users} previous={kpis.gaPrev?.users} yoy={kpis.gaYoy?.users} />
                        <KpiStat label="Interacción" value={formatPct(kpis.ga?.engagementRate)}
                            current={kpis.ga?.engagementRate} previous={kpis.gaPrev?.engagementRate} />
                        <KpiStat label="Duración media" value={formatDuration(kpis.ga?.avgSessionDuration)}
                            current={kpis.ga?.avgSessionDuration} previous={kpis.gaPrev?.avgSessionDuration} />
                        <KpiStat label="Clicks" value={formatCompact(kpis.gsc?.clicks)}
                            current={kpis.gsc?.clicks} previous={kpis.gscPrev?.clicks} yoy={kpis.gscYoy?.clicks} />
                        <KpiStat label="Posición media" value={formatPosition(kpis.gsc?.position)}
                            current={kpis.gsc?.position} previous={kpis.gscPrev?.position} invert />
                    </div>

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

                    <div className="grid gap-4 lg:grid-cols-2">
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
                    </div>

                    <Card>
                        <CardHeader className="pb-0">
                            <Tabs defaultValue="ga-pages">
                                <TabsList>
                                    <TabsTrigger value="ga-pages">Páginas (GA4)</TabsTrigger>
                                    <TabsTrigger value="gsc-queries">Consultas (GSC)</TabsTrigger>
                                    <TabsTrigger value="gsc-pages">Páginas (GSC)</TabsTrigger>
                                </TabsList>
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
