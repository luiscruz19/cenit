'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { TrendingUp, Search, MousePointerClick } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { formatNumber, formatPct, formatPosition } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

type Opp = {
    siteId: number; site: string; domain: string; query: string;
    clicks: number; impressions: number; position: number; ctr: number; estClicks: number;
};

function OppTable({ rows, hint }: { rows: Opp[]; hint: string }) {
    if (!rows.length) return <p className="p-4 text-sm text-muted-foreground">Sin oportunidades detectadas en este momento.</p>;
    return (
        <>
            <p className="px-1 pb-3 text-sm text-muted-foreground">{hint}</p>
            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Sitio</TableHead>
                            <TableHead>Consulta</TableHead>
                            <TableHead className="text-right">Posición</TableHead>
                            <TableHead className="text-right">Impresiones</TableHead>
                            <TableHead className="text-right">Clicks</TableHead>
                            <TableHead className="text-right">CTR</TableHead>
                            <TableHead className="text-right">Clicks a ganar</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((r, i) => (
                            <TableRow key={i}>
                                <TableCell>
                                    <Link href={`/sites/${r.siteId}`} className="text-xs font-medium hover:underline">{r.site}</Link>
                                </TableCell>
                                <TableCell className="max-w-xs truncate">{r.query}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatPosition(r.position)}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatNumber(r.impressions)}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatNumber(r.clicks)}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatPct(r.ctr)}</TableCell>
                                <TableCell className="text-right font-medium tabular-nums text-emerald-600">+{formatNumber(r.estClicks)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}

export function SeoClient() {
    const { data, isLoading, error } = useSWR('/insights/seo-opportunities', fetcher);

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-xl font-semibold tracking-tight">Oportunidades SEO</h1>
                <p className="text-sm text-muted-foreground">
                    Consultas de Search Console (últimos 90 días) donde una acción concreta puede ganar clicks sin más tráfico.
                </p>
            </div>

            {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{String((error as Error).message)}</p>}

            {isLoading ? (
                <><div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div><Skeleton className="h-96" /></>
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Card><CardContent className="flex items-center gap-3 p-4">
                            <div className="rounded-lg bg-emerald-500/10 p-2"><MousePointerClick className="h-5 w-5 text-emerald-600" /></div>
                            <div><p className="text-2xl font-semibold tabular-nums">+{formatNumber(data.totals.estClicksGain)}</p><p className="text-xs text-muted-foreground">Clicks/mes recuperables (est.)</p></div>
                        </CardContent></Card>
                        <Card><CardContent className="flex items-center gap-3 p-4">
                            <div className="rounded-lg bg-blue-500/10 p-2"><TrendingUp className="h-5 w-5 text-blue-600" /></div>
                            <div><p className="text-2xl font-semibold tabular-nums">{data.totals.page2Count}</p><p className="text-xs text-muted-foreground">Consultas en "página 2"</p></div>
                        </CardContent></Card>
                        <Card><CardContent className="flex items-center gap-3 p-4">
                            <div className="rounded-lg bg-amber-500/10 p-2"><Search className="h-5 w-5 text-amber-600" /></div>
                            <div><p className="text-2xl font-semibold tabular-nums">{data.totals.lowCtrCount}</p><p className="text-xs text-muted-foreground">Bien posicionadas, CTR bajo</p></div>
                        </CardContent></Card>
                    </div>

                    <Tabs defaultValue="page2">
                        <TabsList>
                            <TabsTrigger value="page2">Empujar a página 1</TabsTrigger>
                            <TabsTrigger value="lowctr">Mejorar título/descripción</TabsTrigger>
                        </TabsList>
                        <TabsContent value="page2" className="mt-4">
                            <OppTable rows={data.page2} hint="Consultas en posición 8–20 con impresiones suficientes: mejorar el contenido/enlazado de esas páginas para subirlas al top 5." />
                        </TabsContent>
                        <TabsContent value="lowctr" className="mt-4">
                            <OppTable rows={data.lowCtr} hint="Consultas ya en el top 10 pero con CTR pobre: reescribir el title y la meta description de la página para captar más clicks." />
                        </TabsContent>
                    </Tabs>
                </>
            )}
        </div>
    );
}
