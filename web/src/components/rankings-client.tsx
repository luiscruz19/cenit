'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';
import { Search, ArrowUp, ArrowDown, Minus, LineChart } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { parsePeriod } from '@/lib/periods';
import { formatDate, formatNumber, formatPct, formatPosition } from '@/lib/format';
import { cn } from '@/utils/shadcn';
import { PeriodSelector } from '@/components/period-selector';
import { PositionChart } from '@/components/charts/position-chart';
import { InfoTip } from '@/components/info-tip';
import { ErrorState } from '@/components/ui/states';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const ALL = '__all__';

const BUCKETS = [
    { value: 'all', label: 'Todas' },
    { value: 'top3', label: 'Top 3' },
    { value: 'top10', label: 'Top 10' },
    { value: 'page2', label: 'Página 2' },
    { value: 'rest', label: 'Más allá de 20' },
] as const;

type Row = {
    siteId: number; site: string; query: string;
    clicks: number; impressions: number; ctr: number;
    position: number | null; prevPosition: number | null; delta: number | null;
    best: number | null; worst: number | null;
};

/** Delta de posición: positivo = subió puestos (mejoró). */
function PositionDelta({ delta }: { delta: number | null }) {
    if (delta === null) return <span className="text-xs text-muted-foreground">nueva</span>;
    if (Math.abs(delta) < 0.5) {
        return (
            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                <Minus className="h-3 w-3" />
            </span>
        );
    }
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

function Stat({ label, value, hint, term }: { label: string; value: string; hint?: string; term?: string }) {
    return (
        <Card>
            <CardContent className="p-4">
                <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    {label}
                    {term && <InfoTip term={term} />}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
                {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
            </CardContent>
        </Card>
    );
}

export function RankingsClient() {
    const searchParams = useSearchParams();
    const period = parsePeriod(searchParams.get('period'));
    // Arranca filtrado al proyecto activo si se llegó con ?site= desde el selector del nav.
    const [siteId, setSiteId] = useState<string>(searchParams.get('site') || ALL);
    const [bucket, setBucket] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [detail, setDetail] = useState<Row | null>(null);

    const { data: sitesData } = useSWR('/sites', fetcher);
    const sites = (sitesData?.sites || []).filter((s: any) => s.is_active && s.gsc_site_url);

    const qs = new URLSearchParams({ period, limit: '200' });
    if (siteId !== ALL) qs.set('siteId', siteId);
    if (bucket !== 'all') qs.set('bucket', bucket);
    if (search.trim()) qs.set('search', search.trim());

    const { data, isLoading, error, mutate } = useSWR(`/insights/rankings?${qs}`, fetcher, {
        keepPreviousData: true,
    });

    // El histórico se pide solo cuando abrís una consulta.
    const { data: history } = useSWR(
        detail ? `/insights/rankings/history?siteId=${detail.siteId}&query=${encodeURIComponent(detail.query)}&period=90d` : null,
        fetcher
    );

    const s = data?.summary;
    const items: Row[] = data?.items || [];
    const range = data?.range;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Rankings</h1>
                    <p className="text-sm text-muted-foreground">
                        Posición de cada consulta en Google, día por día.
                        {range && <> {formatDate(range.from)} – {formatDate(range.to)} · vs período anterior</>}
                    </p>
                </div>
                <PeriodSelector />
            </div>

            {error && <ErrorState message={(error as Error).message} onRetry={() => mutate()} />}

            {isLoading && !data ? (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[86px]" />)}
                    </div>
                    <Skeleton className="h-96" />
                </>
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        <Stat label="Consultas" value={formatNumber(s?.total)} term="query"
                            hint={`${formatNumber(s?.impressions)} impresiones`} />
                        <Stat label="Top 3" value={formatNumber(s?.top3)}
                            hint={s?.total ? `${Math.round((s.top3 / s.total) * 100)}% del total` : undefined} />
                        <Stat label="Top 10" value={formatNumber(s?.top10)}
                            hint={s?.total ? `${Math.round((s.top10 / s.total) * 100)}% del total` : undefined} />
                        <Stat label="Página 2" value={formatNumber(s?.page2)} term="posicion"
                            hint="posición 11–20: a un empujón del top" />
                        <Stat label="Posición media" value={formatPosition(s?.avgPosition)} term="posicion"
                            hint={`${formatNumber(s?.improved)} mejoraron · ${formatNumber(s?.worsened)} cayeron`} />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative w-full sm:w-64">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar consulta…"
                                className="pl-8"
                            />
                        </div>

                        <Select value={siteId} onValueChange={setSiteId}>
                            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>Todos los sitios</SelectItem>
                                {sites.map((site: any) => (
                                    <SelectItem key={site.id} value={String(site.id)}>{site.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex rounded-md border bg-background p-0.5">
                            {BUCKETS.map((b) => (
                                <button
                                    key={b.value}
                                    onClick={() => setBucket(b.value)}
                                    className={cn(
                                        'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                                        bucket === b.value
                                            ? 'bg-muted text-foreground'
                                            : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    {b.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-lg border bg-background">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Consulta</TableHead>
                                    {siteId === ALL && <TableHead>Sitio</TableHead>}
                                    <TableHead className="text-right">Posición</TableHead>
                                    <TableHead className="text-right">Cambio</TableHead>
                                    <TableHead className="text-right">Mejor / peor</TableHead>
                                    <TableHead className="text-right">Clicks</TableHead>
                                    <TableHead className="text-right">Impresiones</TableHead>
                                    <TableHead className="text-right">CTR</TableHead>
                                    <TableHead className="w-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                                            No hay consultas con impresiones en este período y filtro.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {items.map((r) => (
                                    <TableRow key={`${r.siteId}-${r.query}`}>
                                        <TableCell className="max-w-xs truncate font-medium" title={r.query}>
                                            {r.query}
                                        </TableCell>
                                        {siteId === ALL && (
                                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                                {r.site}
                                            </TableCell>
                                        )}
                                        <TableCell className="text-right">
                                            <Badge variant="outline" className="tabular-nums font-normal">
                                                {formatPosition(r.position)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <PositionDelta delta={r.delta} />
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-right text-xs tabular-nums text-muted-foreground">
                                            {formatPosition(r.best)} / {formatPosition(r.worst)}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">{formatNumber(r.clicks)}</TableCell>
                                        <TableCell className="text-right tabular-nums">{formatNumber(r.impressions)}</TableCell>
                                        <TableCell className="text-right tabular-nums">{formatPct(r.ctr)}</TableCell>
                                        <TableCell className="text-right">
                                            <button
                                                onClick={() => setDetail(r)}
                                                title="Ver histórico diario"
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                            >
                                                <LineChart className="h-4 w-4" />
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </>
            )}

            <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="truncate">{detail?.query}</DialogTitle>
                        <DialogDescription>
                            {detail?.site} · posición diaria de los últimos 90 días. Las bandas marcan
                            el top 3, el top 10 y la página 2.
                        </DialogDescription>
                    </DialogHeader>
                    {history?.series?.length ? (
                        <PositionChart data={history.series} />
                    ) : (
                        <Skeleton className="h-[240px]" />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
