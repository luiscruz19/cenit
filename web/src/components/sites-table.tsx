'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpDown, ArrowUpRight } from 'lucide-react';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sparkline } from '@/components/charts/sparkline';
import { formatNumber, formatPosition, deltaPct } from '@/lib/format';
import { cn } from '@/utils/shadcn';

export type OverviewSite = {
    id: number;
    name: string;
    domain: string;
    mapped: { ga4: boolean; gsc: boolean };
    ga: { sessions: number; users: number } | null;
    gaPrev: { sessions: number; users: number } | null;
    gaYoy: { sessions: number; users: number } | null;
    gsc: { clicks: number; impressions: number; position: number } | null;
    gscPrev: { clicks: number; impressions: number; position: number } | null;
    gscYoy: { clicks: number; impressions: number } | null;
    spark: { dates: string[]; sessions: number[]; clicks: number[] };
};

type SortKey = 'name' | 'sessions' | 'users' | 'clicks' | 'impressions' | 'position';

const getValue = (site: OverviewSite, key: SortKey): number | string => {
    switch (key) {
        case 'name': return site.name.toLowerCase();
        case 'sessions': return site.ga?.sessions ?? -1;
        case 'users': return site.ga?.users ?? -1;
        case 'clicks': return site.gsc?.clicks ?? -1;
        case 'impressions': return site.gsc?.impressions ?? -1;
        case 'position': return site.gsc?.position || Number.MAX_SAFE_INTEGER;
    }
};

function Delta({ current, previous, invert = false }: { current?: number | null; previous?: number | null; invert?: boolean }) {
    const delta = deltaPct(current, previous);
    if (delta === null) return null;
    const improved = invert ? delta < 0 : delta > 0;
    return (
        <span className={cn(
            'ml-1.5 text-xs tabular-nums',
            improved ? 'text-emerald-600' : delta === 0 ? 'text-muted-foreground' : 'text-red-600'
        )}>
            {`${delta > 0 ? '+' : ''}${(delta * 100).toFixed(0)}%`}
        </span>
    );
}

export function SitesTable({ sites, period }: { sites: OverviewSite[]; period: string }) {
    const [sortKey, setSortKey] = useState<SortKey>('sessions');
    const [asc, setAsc] = useState(false);

    const sorted = useMemo(() => {
        const copy = [...sites];
        copy.sort((a, b) => {
            const va = getValue(a, sortKey);
            const vb = getValue(b, sortKey);
            const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number);
            return asc ? cmp : -cmp;
        });
        return copy;
    }, [sites, sortKey, asc]);

    const header = (key: SortKey, label: string, align: 'left' | 'right' = 'right') => (
        <TableHead
            className={cn('cursor-pointer select-none whitespace-nowrap', align === 'right' && 'text-right')}
            onClick={() => {
                if (sortKey === key) setAsc(!asc);
                else { setSortKey(key); setAsc(key === 'name' || key === 'position'); }
            }}
        >
            <span className="inline-flex items-center gap-1">
                {label}
                <ArrowUpDown className={cn('h-3 w-3', sortKey === key ? 'opacity-100' : 'opacity-30')} />
            </span>
        </TableHead>
    );

    return (
        <div className="rounded-lg border bg-background">
            <Table>
                <TableHeader>
                    <TableRow>
                        {header('name', 'Sitio', 'left')}
                        {header('sessions', 'Sesiones')}
                        {header('users', 'Usuarios')}
                        {header('clicks', 'Clicks')}
                        {header('impressions', 'Impresiones')}
                        {header('position', 'Posición')}
                        <TableHead className="text-right">Tendencia</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sorted.map((site) => (
                        <TableRow key={site.id} className="group">
                            <TableCell>
                                <Link href={`/sites/${site.id}?period=${period}`} className="flex flex-col">
                                    <span className="flex items-center gap-1 font-medium">
                                        {site.name}
                                        <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
                                    </span>
                                    <span className="text-xs text-muted-foreground">{site.domain}</span>
                                </Link>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                                {site.mapped.ga4 ? (
                                    <>
                                        {formatNumber(site.ga?.sessions ?? 0)}
                                        <Delta current={site.ga?.sessions} previous={site.gaPrev?.sessions} />
                                    </>
                                ) : <Badge variant="outline" className="font-normal text-muted-foreground">sin GA4</Badge>}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                                {site.mapped.ga4 ? formatNumber(site.ga?.users ?? 0) : '—'}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                                {site.mapped.gsc ? (
                                    <>
                                        {formatNumber(site.gsc?.clicks ?? 0)}
                                        <Delta current={site.gsc?.clicks} previous={site.gscPrev?.clicks} />
                                    </>
                                ) : <Badge variant="outline" className="font-normal text-muted-foreground">sin GSC</Badge>}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                                {site.mapped.gsc ? formatNumber(site.gsc?.impressions ?? 0) : '—'}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                                {site.mapped.gsc ? (
                                    <>
                                        {formatPosition(site.gsc?.position)}
                                        <Delta current={site.gsc?.position} previous={site.gscPrev?.position} invert />
                                    </>
                                ) : '—'}
                            </TableCell>
                            <TableCell className="flex justify-end">
                                <Sparkline values={site.spark.sessions} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
