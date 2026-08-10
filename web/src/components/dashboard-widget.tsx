'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import {
    formatCompact, formatDuration, formatNumber, formatPct, formatPosition,
} from '@/lib/format';
import { cn } from '@/utils/shadcn';
import { TimeSeriesChart } from '@/components/charts/time-series-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export type Widget = {
    id: string;
    title: string;
    type: 'kpi' | 'line' | 'table';
    dataset: string;
    metrics: string[];
    dimension: string | null;
    siteId: number | null;
    period: string | null;
    width: 1 | 2;
};

const CHART_COLORS = [
    'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))',
];

const render = (value: unknown, type: string, compact = false) => {
    if (value === null || value === undefined) return '—';
    switch (type) {
        case 'int': return compact ? formatCompact(value as number) : formatNumber(value as number);
        case 'pct': return formatPct(value as number);
        case 'position': return formatPosition(value as number);
        case 'duration': return formatDuration(value as number);
        default: return String(value);
    }
};

/**
 * Renderiza un widget pidiendo los datos al mismo endpoint que usa el Explorer.
 * No hay una segunda vía de cálculo: lo que muestra un widget es exactamente lo que
 * daría la misma consulta en el Explorer.
 */
export function DashboardWidget({
    widget, fallbackPeriod, actions,
}: {
    widget: Widget;
    fallbackPeriod: string;
    actions?: React.ReactNode;
}) {
    const period = widget.period || fallbackPeriod;

    const qs = new URLSearchParams({
        dataset: widget.dataset,
        period,
        metrics: widget.metrics.join(','),
        limit: widget.type === 'table' ? '10' : '400',
    });
    // El KPI no lleva dimensión: una sola fila con el total del período.
    if (widget.type !== 'kpi' && widget.dimension) qs.set('dimensions', widget.dimension);
    if (widget.siteId) qs.set('siteId', String(widget.siteId));
    // La serie temporal se ordena por fecha ascendente; el resto, por la métrica.
    if (widget.type === 'line' && widget.dimension === 'date') {
        qs.set('sort', widget.metrics[0]);
        qs.set('desc', 'false');
    }

    const { data, isLoading, error } = useSWR(
        widget.metrics.length ? `/metrics/explore?${qs}` : null,
        fetcher
    );

    const columns = data?.columns || [];
    const rows = data?.rows || [];
    const metricCols = columns.filter((c: any) => c.kind === 'metric');

    const body = () => {
        if (error) {
            return (
                <p className="text-sm text-destructive">
                    {String((error as Error).message)}
                </p>
            );
        }
        if (isLoading) return <Skeleton className="h-24" />;
        if (!rows.length) {
            return <p className="text-sm text-muted-foreground">Sin datos en el período.</p>;
        }

        if (widget.type === 'kpi') {
            const col = metricCols[0];
            return (
                <p className="text-3xl font-semibold tabular-nums">
                    {render(rows[0]?.[col?.key], col?.type, true)}
                </p>
            );
        }

        if (widget.type === 'line') {
            // TimeSeriesChart espera un campo `date` y series con clave/color.
            const sorted = [...rows].sort((a: any, b: any) =>
                String(a.date).localeCompare(String(b.date))
            );
            return (
                <TimeSeriesChart
                    data={sorted}
                    height={200}
                    series={metricCols.map((c: any, i: number) => ({
                        key: c.key,
                        label: c.label,
                        color: CHART_COLORS[i % CHART_COLORS.length],
                    }))}
                />
            );
        }

        return (
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {columns.map((c: any) => (
                                <TableHead
                                    key={c.key}
                                    className={cn('whitespace-nowrap', c.kind === 'metric' && 'text-right')}
                                >
                                    {c.label}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row: any, i: number) => (
                            <TableRow key={i}>
                                {columns.map((c: any) => (
                                    <TableCell
                                        key={c.key}
                                        className={cn(
                                            c.kind === 'metric' && 'text-right tabular-nums',
                                            c.type === 'text' && 'max-w-[220px] truncate'
                                        )}
                                        title={c.type === 'text' ? String(row[c.key] ?? '') : undefined}
                                    >
                                        {render(row[c.key], c.type)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        );
    };

    return (
        <Card className={cn(widget.width === 2 && 'md:col-span-2')}>
            <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
                <div>
                    <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {widget.period ? `período ${widget.period}` : 'período del dashboard'}
                        {widget.siteId ? ' · un sitio' : ' · todos los sitios'}
                    </p>
                </div>
                {actions}
            </CardHeader>
            <CardContent>{body()}</CardContent>
        </Card>
    );
}
