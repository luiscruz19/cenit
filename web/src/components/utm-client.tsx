'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import QRCode from 'qrcode';
import {
    Copy, Check, Download, Plus, Trash2, AlertTriangle, QrCode,
} from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import {
    UTM_KEYS, UTM_LABELS, PRESETS, EMPTY_UTM, buildUrl, detectExisting, isValidUrl,
    missingRequired, toCsv, downloadCsv,
    type UtmKey, type UtmValues,
} from '@/lib/utm';
import { cn } from '@/utils/shadcn';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { btn, btnPrimary } from '@/lib/ui';


function CopyButton({ text, className }: { text: string; className?: string }) {
    const [done, setDone] = useState(false);
    return (
        <button
            className={cn(btn, className)}
            disabled={!text}
            onClick={async () => {
                await navigator.clipboard.writeText(text);
                setDone(true);
                setTimeout(() => setDone(false), 1500);
            }}
        >
            {done ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {done ? 'Copiado' : 'Copiar'}
        </button>
    );
}

/** QR de la URL final, dibujado en canvas y descargable como PNG. */
function QrPanel({ url }: { url: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current || !url) return;
        QRCode.toCanvas(canvasRef.current, url, { width: 176, margin: 1 }, () => { /* noop */ });
    }, [url]);

    const download = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = 'utm-qr.png';
        link.click();
    };

    if (!url) return null;

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="rounded-md border bg-white p-2">
                <canvas ref={canvasRef} />
            </div>
            <button className={btn} onClick={download}>
                <Download className="h-4 w-4" />
                Descargar QR
            </button>
        </div>
    );
}

export function UtmClient() {
    const { data: sitesData } = useSWR('/sites', fetcher);
    const sites = (sitesData?.sites || []).filter((s: any) => s.is_active);

    const [baseUrl, setBaseUrl] = useState('');
    const [utm, setUtm] = useState<UtmValues>(EMPTY_UTM);
    const [rows, setRows] = useState<UtmValues[]>([{ ...EMPTY_UTM }]);
    const [bulkBase, setBulkBase] = useState('');

    const existing = useMemo(() => detectExisting(baseUrl), [baseUrl]);
    const existingKeys = Object.keys(existing) as UtmKey[];
    const finalUrl = useMemo(() => buildUrl(baseUrl, utm), [baseUrl, utm]);
    const missing = missingRequired(utm);
    const urlInvalid = baseUrl.trim().length > 0 && !isValidUrl(baseUrl);

    const applyPreset = (id: string) => {
        const preset = PRESETS.find((p) => p.id === id);
        if (!preset) return;
        setUtm((u) => ({ ...u, ...preset.values }));
    };

    const bulkRows = rows
        .map((r) => ({ utm: r, url: buildUrl(bulkBase, r) }))
        .filter((r) => r.url && missingRequired(r.utm).length === 0);

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-xl font-semibold tracking-tight">UTM Builder</h1>
                <p className="text-sm text-muted-foreground">
                    Armá URLs etiquetadas para que el tráfico de campañas llegue identificado a GA4.
                </p>
            </div>

            <Tabs defaultValue="single">
                <TabsList>
                    <TabsTrigger value="single">Una URL</TabsTrigger>
                    <TabsTrigger value="bulk">Varias a la vez</TabsTrigger>
                </TabsList>

                {/* ── Una URL ────────────────────────────────────────────── */}
                <TabsContent value="single" className="mt-4">
                    <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Parámetros</CardTitle>
                                <CardDescription>
                                    Source, medium y campaign son obligatorios. Todo se normaliza a minúsculas
                                    y sin acentos: para Google, <code className="text-xs">Verano</code> y{' '}
                                    <code className="text-xs">verano</code> son campañas distintas.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="base-url">URL de destino</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="base-url"
                                            value={baseUrl}
                                            onChange={(e) => setBaseUrl(e.target.value)}
                                            placeholder="https://ejemplo.com.ar/landing"
                                            className={cn(urlInvalid && 'border-destructive')}
                                        />
                                        {sites.length > 0 && (
                                            <Select onValueChange={(v) => setBaseUrl(`https://${v}/`)}>
                                                <SelectTrigger className="w-44 shrink-0">
                                                    <SelectValue placeholder="Un sitio…" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {sites.map((s: any) => (
                                                        <SelectItem key={s.id} value={s.domain}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                    {urlInvalid && (
                                        <p className="text-xs text-destructive">
                                            No es una URL válida. Tiene que empezar con http:// o https://
                                        </p>
                                    )}
                                </div>

                                {existingKeys.length > 0 && (
                                    <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                        <div className="text-sm">
                                            <p className="font-medium">Esta URL ya trae UTMs.</p>
                                            <p className="text-muted-foreground">
                                                {existingKeys.map((k) => `utm_${k}`).join(', ')} — los que cargues acá
                                                los reemplazan, no se duplican.
                                            </p>
                                            <button
                                                className="mt-1.5 text-xs font-medium underline"
                                                onClick={() => setUtm((u) => ({ ...u, ...existing }))}
                                            >
                                                Cargarlos en el formulario
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground">Convención:</span>
                                    {PRESETS.map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => applyPreset(p.id)}
                                            className="rounded-md border bg-background px-2 py-1 text-xs font-medium transition-colors hover:bg-muted"
                                            title={p.pattern}
                                        >
                                            {p.name}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    {UTM_KEYS.map((key) => (
                                        <div key={key} className="flex flex-col gap-1.5">
                                            <Label htmlFor={`utm-${key}`} className="flex items-center gap-1.5">
                                                utm_{key}
                                                {missing.includes(key) && (
                                                    <Badge variant="outline" className="h-4 px-1 text-[10px] font-normal text-muted-foreground">
                                                        requerido
                                                    </Badge>
                                                )}
                                            </Label>
                                            <Input
                                                id={`utm-${key}`}
                                                value={utm[key]}
                                                onChange={(e) => setUtm((u) => ({ ...u, [key]: e.target.value }))}
                                                placeholder={UTM_LABELS[key].placeholder}
                                            />
                                            <p className="text-xs text-muted-foreground">{UTM_LABELS[key].hint}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="lg:w-72">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <QrCode className="h-4 w-4" />
                                    Código QR
                                </CardTitle>
                                <CardDescription>Para llevar la campaña a piezas impresas.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {finalUrl && missing.length === 0 ? (
                                    <QrPanel url={finalUrl} />
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Completá la URL y los campos obligatorios.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="mt-4">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">URL final</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            <div className="break-all rounded-md border bg-muted/40 p-3 font-mono text-sm">
                                {finalUrl || <span className="text-muted-foreground">Completá la URL de destino…</span>}
                            </div>
                            <div className="flex items-center gap-2">
                                <CopyButton text={missing.length === 0 ? finalUrl : ''} />
                                {missing.length > 0 && finalUrl && (
                                    <span className="text-xs text-muted-foreground">
                                        Falta completar: {missing.map((k) => `utm_${k}`).join(', ')}
                                    </span>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Varias a la vez ────────────────────────────────────── */}
                <TabsContent value="bulk" className="mt-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Generación masiva</CardTitle>
                            <CardDescription>
                                Una URL de destino y muchas combinaciones. Exportás todo en CSV.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="bulk-url">URL de destino</Label>
                                <Input
                                    id="bulk-url"
                                    value={bulkBase}
                                    onChange={(e) => setBulkBase(e.target.value)}
                                    placeholder="https://ejemplo.com.ar/landing"
                                />
                            </div>

                            <div className="rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {UTM_KEYS.map((k) => (
                                                <TableHead key={k} className="text-xs">utm_{k}</TableHead>
                                            ))}
                                            <TableHead className="w-10"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rows.map((row, i) => (
                                            <TableRow key={i}>
                                                {UTM_KEYS.map((k) => (
                                                    <TableCell key={k} className="p-1.5">
                                                        <Input
                                                            value={row[k]}
                                                            onChange={(e) => setRows((rs) =>
                                                                rs.map((r, j) => (j === i ? { ...r, [k]: e.target.value } : r))
                                                            )}
                                                            placeholder={UTM_LABELS[k].placeholder}
                                                            className="h-8 text-sm"
                                                        />
                                                    </TableCell>
                                                ))}
                                                <TableCell className="p-1.5 text-right">
                                                    <button
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                                                        onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                                                        disabled={rows.length === 1}
                                                        title="Quitar fila"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <button className={btn} onClick={() => setRows((rs) => [...rs, { ...EMPTY_UTM }])}>
                                    <Plus className="h-4 w-4" />
                                    Agregar fila
                                </button>
                                <button
                                    className={btnPrimary}
                                    disabled={bulkRows.length === 0}
                                    onClick={() => downloadCsv('utm-urls.csv', toCsv(bulkRows))}
                                >
                                    <Download className="h-4 w-4" />
                                    Exportar CSV ({bulkRows.length})
                                </button>
                                {bulkBase && bulkRows.length === 0 && (
                                    <span className="text-xs text-muted-foreground">
                                        Cada fila necesita source, medium y campaign.
                                    </span>
                                )}
                            </div>

                            {bulkRows.length > 0 && (
                                <div className="flex flex-col gap-1.5">
                                    <p className="text-xs font-medium text-muted-foreground">
                                        {bulkRows.length} {bulkRows.length === 1 ? 'URL lista' : 'URLs listas'}
                                    </p>
                                    <div className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-md border bg-muted/40 p-3">
                                        {bulkRows.map((r, i) => (
                                            <code key={i} className="break-all text-xs">{r.url}</code>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
