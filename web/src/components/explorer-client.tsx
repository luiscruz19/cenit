'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';
import { Download, Search, ArrowUpDown } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { parsePeriod } from '@/lib/periods';
import {
    formatDate, formatDuration, formatNumber, formatPct, formatPosition,
} from '@/lib/format';
import { downloadCsv } from '@/lib/utm';
import { cn } from '@/utils/shadcn';
import { PeriodSelector } from '@/components/period-selector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { btn } from '@/lib/ui';

const ALL = '__all__';


type Field = { key: string; label: string; type: string };
type Dataset = { key: string; label: string; dimensions: Field[]; metrics: Field[] };
type Column = Field & { kind: 'dimension' | 'metric' };

/** Cada tipo se muestra como corresponde: los porcentajes como %, la duración en minutos… */
const renderCell = (value: unknown, type: string) => {
    if (value === null || value === undefined) return '—';
    switch (type) {
        case 'int': return formatNumber(value as number);
        case 'pct': return formatPct(value as number);
        case 'position': return formatPosition(value as number);
        case 'duration': return formatDuration(value as number);
        case 'date': return formatDate(String(value));
        default: return String(value);
    }
};

/** Valor plano para el CSV (sin formato de presentación, para que Excel lo lea como número). */
const csvValue = (value: unknown) =>
    value === null || value === undefined ? '' : String(value);

/** Chip de selección múltiple para dimensiones y métricas. */
function FieldChips({
    fields, selected, onToggle, empty,
}: {
    fields: Field[]; selected: string[]; onToggle: (key: string) => void; empty?: string;
}) {
    if (fields.length === 0) {
        return <p className="text-xs text-muted-foreground">{empty}</p>;
    }
    return (
        <div className="flex flex-wrap gap-1.5">
            {fields.map((f) => {
                const on = selected.includes(f.key);
                return (
                    <button
                        key={f.key}
                        onClick={() => onToggle(f.key)}
                        aria-pressed={on}
                        className={cn(
                            'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                            on
                                ? 'border-primary/30 bg-primary/10 text-foreground'
                                : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                    >
                        {f.label}
                    </button>
                );
            })}
        </div>
    );
}

export function ExplorerClient() {
    const searchParams = useSearchParams();
    const period = parsePeriod(searchParams.get('period'));

    const { data: schemaData } = useSWR('/metrics/explore/schema', fetcher, { revalidateOnFocus: false });
    const { data: sitesData } = useSWR('/sites', fetcher);
    const datasets: Dataset[] = schemaData?.datasets || [];
    const sites = (sitesData?.sites || []).filter((s: any) => s.is_active);

    const [dataset, setDataset] = useState('traffic');
    const [dims, setDims] = useState<string[]>(['site']);
    const [mets, setMets] = useState<string[]>([]);
    const [siteId, setSiteId] = useState(searchParams.get('site') || ALL);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<string | null>(null);
    const [desc, setDesc] = useState(true);

    const current = datasets.find((d) => d.key === dataset);

    // Al cambiar de dataset, reseteo la selección a algo válido para ese dataset.
    useEffect(() => {
        if (!current) return;
        setDims(current.dimensions.some((d) => d.key === 'site') ? ['site'] : []);
        setMets(current.metrics.slice(0, 2).map((m) => m.key));
        setSort(null);
        setSearch('');
    }, [dataset, current?.key]); // eslint-disable-line react-hooks/exhaustive-deps

    const toggle = (list: string[], set: (v: string[]) => void, key: string) =>
        set(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);

    const qs = useMemo(() => {
        const p = new URLSearchParams({ dataset, period, limit: '500' });
        if (dims.length) p.set('dimensions', dims.join(','));
        if (mets.length) p.set('metrics', mets.join(','));
        if (siteId !== ALL) p.set('siteId', siteId);
        if (search.trim()) p.set('search', search.trim());
        if (sort) p.set('sort', sort);
        p.set('desc', String(desc));
        return p.toString();
    }, [dataset, period, dims, mets, siteId, search, sort, desc]);

    const { data, isLoading, error, mutate } = useSWR(
        mets.length ? `/metrics/explore?${qs}` : null,
        fetcher,
        { keepPreviousData: true }
    );

    const columns: Column[] = data?.columns || [];
    const rows: Record<string, unknown>[] = data?.rows || [];

    // El dataset marca si hay una dimensión de texto (consulta, página, canal…) que buscar.
    const textDim = current?.dimensions.find(
        (d) => d.key !== 'site' && d.key !== 'date' && d.type === 'text'
    );

    const exportCsv = () => {
        if (!columns.length) return;
        const header = columns.map((c) => c.label).join(',');
        const lines = rows.map((row) =>
            columns
                .map((c) => {
                    const v = csvValue(row[c.key]);
                    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
                })
                .join(',')
        );
        downloadCsv(`cenit-${dataset}-${period}.csv`, [header, ...lines].join('\n'));
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Explorer</h1>
                    <p className="text-sm text-muted-foreground">
                        Armá tu propia tabla: elegí una fuente, cruzá dimensiones y métricas, y exportá.
                        {data?.range && <> {formatDate(data.range.from)} – {formatDate(data.range.to)}</>}
                    </p>
                </div>
                <PeriodSelector />
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Consulta</CardTitle>
                    <CardDescription>
                        Cada fuente tiene su propio grano, por eso se elige una a la vez: mezclar
                        consultas con canales en una misma tabla multiplicaría las filas y daría números inflados.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={dataset} onValueChange={setDataset}>
                            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {datasets.map((d) => (
                                    <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={siteId} onValueChange={setSiteId}>
                            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>Todos los sitios</SelectItem>
                                {sites.map((s: any) => (
                                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {textDim && (
                            <div className="relative w-full sm:w-56">
                                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={`Buscar ${textDim.label.toLowerCase()}…`}
                                    className="pl-8"
                                />
                            </div>
                        )}

                        <button className={cn(btn, 'ml-auto')} onClick={exportCsv} disabled={!rows.length}>
                            <Download className="h-4 w-4" />
                            Exportar CSV
                        </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-medium text-muted-foreground">
                                Dimensiones
                            </p>
                            <FieldChips
                                fields={current?.dimensions || []}
                                selected={dims}
                                onToggle={(k) => toggle(dims, setDims, k)}
                            />
                            {dims.length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                    Sin dimensiones: da una sola fila con el total del período.
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-medium text-muted-foreground">
                                Métricas
                            </p>
                            <FieldChips
                                fields={current?.metrics || []}
                                selected={mets}
                                onToggle={(k) => toggle(mets, setMets, k)}
                            />
                            {mets.length === 0 && (
                                <p className="text-xs text-destructive">Elegí al menos una métrica.</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {error && <ErrorState message={(error as Error).message} onRetry={() => mutate()} />}

            {isLoading && !data ? (
                <Skeleton className="h-96" />
            ) : mets.length === 0 ? null : (
                <div className="flex flex-col gap-2">
                    <div className="overflow-x-auto rounded-lg border bg-background">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {columns.map((c) => (
                                        <TableHead
                                            key={c.key}
                                            className={cn(
                                                'whitespace-nowrap',
                                                c.kind === 'metric' && 'cursor-pointer select-none text-right'
                                            )}
                                            onClick={() => {
                                                if (c.kind !== 'metric') return;
                                                if (sort === c.key) setDesc(!desc);
                                                else { setSort(c.key); setDesc(true); }
                                            }}
                                        >
                                            <span className={cn(
                                                'inline-flex items-center gap-1',
                                                c.kind === 'metric' && 'justify-end'
                                            )}>
                                                {c.label}
                                                {c.kind === 'metric' && (
                                                    <ArrowUpDown className={cn(
                                                        'h-3 w-3',
                                                        sort === c.key ? 'opacity-100' : 'opacity-30'
                                                    )} />
                                                )}
                                            </span>
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={columns.length || 1} className="py-10 text-center text-sm text-muted-foreground">
                                            Sin datos para esta combinación en el período elegido.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {rows.map((row, i) => (
                                    <TableRow key={i}>
                                        {columns.map((c) => (
                                            <TableCell
                                                key={c.key}
                                                className={cn(
                                                    c.kind === 'metric' && 'text-right tabular-nums',
                                                    c.type === 'text' && 'max-w-xs truncate'
                                                )}
                                                title={c.type === 'text' ? String(row[c.key] ?? '') : undefined}
                                            >
                                                {renderCell(row[c.key], c.type)}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {formatNumber(rows.length)} filas
                        {data?.truncated && ` · cortado en el límite de ${data.limit}: afiná los filtros para ver el resto`}
                    </p>
                </div>
            )}
        </div>
    );
}
