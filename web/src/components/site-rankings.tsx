'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowUp, ArrowDown, Minus, ArrowUpRight } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { formatNumber, formatPct, formatPosition } from '@/lib/format';
import { cn } from '@/utils/shadcn';
import { InfoTip } from '@/components/info-tip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

type Row = {
    query: string; clicks: number; impressions: number; ctr: number;
    position: number | null; delta: number | null; best: number | null; worst: number | null;
};

/** Positivo = subió puestos (en posición, bajar el número es mejorar). */
function Delta({ delta }: { delta: number | null }) {
    if (delta === null) return <span className="text-xs text-muted-foreground">nueva</span>;
    if (Math.abs(delta) < 0.5) return <Minus className="ml-auto h-3 w-3 text-muted-foreground" />;
    const up = delta > 0;
    return (
        <span className={cn(
            'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
            up ? 'text-emerald-600' : 'text-red-600'
        )}>
            {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1).replace('.', ',')}
        </span>
    );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-xl font-semibold tabular-nums">{value}</p>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
}

/** Rankings de ESTE sitio: distribución por tramo + las consultas que más traccionan. */
export function SiteRankings({ siteId, period }: { siteId: string; period: string }) {
    const { data, isLoading } = useSWR(
        `/insights/rankings?siteId=${siteId}&period=${period}&limit=15`,
        fetcher,
        { revalidateOnFocus: false }
    );

    const s = data?.summary;
    const items: Row[] = data?.items || [];

    if (isLoading) return <Skeleton className="h-72" />;

    return (
        <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
                <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                        Rankings
                        <InfoTip term="posicion" />
                    </CardTitle>
                    <CardDescription>
                        Posición de cada consulta, con el cambio contra el período anterior.
                    </CardDescription>
                </div>
                <Link
                    href={`/rankings?period=${period}`}
                    className="group inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                    Ver todos
                    <ArrowUpRight className="h-3 w-3 opacity-60" />
                </Link>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                {!s?.total ? (
                    <p className="text-sm text-muted-foreground">
                        Sin consultas con impresiones en este período.
                    </p>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                            <Tile label="Consultas" value={formatNumber(s.total)} />
                            <Tile label="Top 3" value={formatNumber(s.top3)}
                                hint={`${Math.round((s.top3 / s.total) * 100)}%`} />
                            <Tile label="Top 10" value={formatNumber(s.top10)}
                                hint={`${Math.round((s.top10 / s.total) * 100)}%`} />
                            <Tile label="Página 2" value={formatNumber(s.page2)} hint="posición 11–20" />
                            <Tile label="Posición media" value={formatPosition(s.avgPosition)}
                                hint={`${s.improved} ↑ · ${s.worsened} ↓`} />
                        </div>

                        <div className="overflow-x-auto rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Consulta</TableHead>
                                        <TableHead className="text-right">Posición</TableHead>
                                        <TableHead className="text-right">Cambio</TableHead>
                                        <TableHead className="text-right">Mejor / peor</TableHead>
                                        <TableHead className="text-right">Clicks</TableHead>
                                        <TableHead className="text-right">Impresiones</TableHead>
                                        <TableHead className="text-right">CTR</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((r) => (
                                        <TableRow key={r.query}>
                                            <TableCell className="max-w-[220px] truncate font-medium" title={r.query}>
                                                {r.query}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="outline" className="font-normal tabular-nums">
                                                    {formatPosition(r.position)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right"><Delta delta={r.delta} /></TableCell>
                                            <TableCell className="whitespace-nowrap text-right text-xs tabular-nums text-muted-foreground">
                                                {formatPosition(r.best)} / {formatPosition(r.worst)}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">{formatNumber(r.clicks)}</TableCell>
                                            <TableCell className="text-right tabular-nums">{formatNumber(r.impressions)}</TableCell>
                                            <TableCell className="text-right tabular-nums">{formatPct(r.ctr)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
