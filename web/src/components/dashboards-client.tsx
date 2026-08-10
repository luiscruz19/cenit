'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import {
    Loader2, Plus, Trash2, Pencil, LayoutDashboard, ArrowLeft, ArrowRight, Save, X,
} from 'lucide-react';
import { fetcher, postJson, putJson, deleteJson } from '@/lib/fetcher';
import { cn } from '@/utils/shadcn';
import { DashboardWidget, type Widget } from '@/components/dashboard-widget';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { btn, btnPrimary, btnDestructive } from '@/lib/ui';
import { toast } from 'sonner';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ALL = '__all__';
const INHERIT = '__inherit__';


type Field = { key: string; label: string; type: string };
type Dataset = { key: string; label: string; dimensions: Field[]; metrics: Field[] };
type Dash = { id: number; name: string; period: string; widgets: Widget[] };

const WIDGET_TYPES = [
    { key: 'kpi', label: 'Número', hint: 'Un solo valor grande' },
    { key: 'line', label: 'Serie temporal', hint: 'Evolución en el tiempo' },
    { key: 'table', label: 'Tabla', hint: 'Top N por dimensión' },
] as const;

const newWidget = (): Widget => ({
    id: `w${Date.now()}${Math.floor(Math.random() * 1000)}`,
    title: '',
    type: 'kpi',
    dataset: 'traffic',
    metrics: ['sessions'],
    dimension: null,
    siteId: null,
    period: null,
    width: 1,
});

export function DashboardsClient() {
    const { data: schemaData } = useSWR('/metrics/explore/schema', fetcher, { revalidateOnFocus: false });
    const { data: dashData, mutate } = useSWR('/dashboards', fetcher);
    const { data: sitesData } = useSWR('/sites', fetcher);

    const datasets: Dataset[] = schemaData?.datasets || [];
    const dashboards: Dash[] = dashData?.dashboards || [];
    const sites = (sitesData?.sites || []).filter((s: any) => s.is_active);

    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<Dash | null>(null);
    const [widgetDialog, setWidgetDialog] = useState<Widget | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Dash | null>(null);

    // Selecciona el primer dashboard cuando cargan.
    useEffect(() => {
        if (selectedId === null && dashboards.length > 0) setSelectedId(dashboards[0].id);
    }, [dashboards, selectedId]);

    const selected = dashboards.find((d) => d.id === selectedId) || null;
    const view = editing ? draft : selected;

    const act = async (key: string, fn: () => Promise<unknown>, done?: string) => {
        setBusy(key);
        try {
            await fn();
            if (done) toast.success(done);
        } catch (e) {
            toast.error((e as Error).message);
        } finally {
            setBusy(null);
        }
    };

    const createDashboard = () => act('create', async () => {
        const res: any = await postJson('/dashboards', {
            name: 'Nuevo dashboard',
            period: '28d',
            widgets: [],
        });
        await mutate();
        setSelectedId(res.dashboard.id);
        setDraft(res.dashboard);
        setEditing(true);
    });

    const saveDraft = () => act('save', async () => {
        if (!draft) return;
        await putJson(`/dashboards/${draft.id}`, {
            name: draft.name,
            period: draft.period,
            widgets: draft.widgets,
        });
        await mutate();
        setEditing(false);
        setDraft(null);
    }, '✓ Dashboard guardado');

    const removeDashboard = () => act('delete', async () => {
        await deleteJson(`/dashboards/${deleteTarget!.id}`);
        setDeleteTarget(null);
        setSelectedId(null);
        setEditing(false);
        setDraft(null);
        await mutate();
    }, '✓ Dashboard eliminado');

    const startEdit = () => {
        if (!selected) return;
        setDraft(JSON.parse(JSON.stringify(selected)));
        setEditing(true);
    };

    const cancelEdit = () => {
        setEditing(false);
        setDraft(null);
    };

    const upsertWidget = (widget: Widget) => {
        if (!draft) return;
        const exists = draft.widgets.some((w) => w.id === widget.id);
        setDraft({
            ...draft,
            widgets: exists
                ? draft.widgets.map((w) => (w.id === widget.id ? widget : w))
                : [...draft.widgets, widget],
        });
        setWidgetDialog(null);
    };

    const removeWidget = (id: string) => {
        if (!draft) return;
        setDraft({ ...draft, widgets: draft.widgets.filter((w) => w.id !== id) });
    };

    const moveWidget = (id: string, delta: number) => {
        if (!draft) return;
        const i = draft.widgets.findIndex((w) => w.id === id);
        const j = i + delta;
        if (i < 0 || j < 0 || j >= draft.widgets.length) return;
        const widgets = [...draft.widgets];
        [widgets[i], widgets[j]] = [widgets[j], widgets[i]];
        setDraft({ ...draft, widgets });
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Dashboards</h1>
                    <p className="text-sm text-muted-foreground">
                        Armá la vista que necesitás. Cada widget consulta lo mismo que el Explorer.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {dashboards.length > 0 && !editing && (
                        <Select
                            value={selectedId ? String(selectedId) : ''}
                            onValueChange={(v) => setSelectedId(Number(v))}
                        >
                            <SelectTrigger className="w-52"><SelectValue placeholder="Elegí uno…" /></SelectTrigger>
                            <SelectContent>
                                {dashboards.map((d) => (
                                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {editing ? (
                        <>
                            <button className={btn} onClick={cancelEdit} disabled={busy !== null}>
                                <X className="h-4 w-4" />
                                Cancelar
                            </button>
                            <button className={btnPrimary} onClick={saveDraft} disabled={busy !== null}>
                                {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Guardar
                            </button>
                        </>
                    ) : (
                        <>
                            {selected && (
                                <button className={btn} onClick={startEdit}>
                                    <Pencil className="h-4 w-4" />
                                    Editar
                                </button>
                            )}
                            <button className={btnPrimary} onClick={createDashboard} disabled={busy !== null}>
                                {busy === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                Nuevo
                            </button>
                        </>
                    )}
                </div>
            </div>

            {dashData && dashboards.length === 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                        <LayoutDashboard className="h-8 w-8 text-muted-foreground" />
                        <div>
                            <p className="font-medium">Todavía no hay dashboards.</p>
                            <p className="text-sm text-muted-foreground">
                                Creá uno y agregale widgets: números, series temporales o tablas.
                            </p>
                        </div>
                        <button className={btnPrimary} onClick={createDashboard} disabled={busy !== null}>
                            <Plus className="h-4 w-4" />
                            Crear el primero
                        </button>
                    </CardContent>
                </Card>
            )}

            {/* ── Barra de edición ────────────────────────────────────────── */}
            {editing && draft && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Ajustes del dashboard</CardTitle>
                        <CardDescription>
                            El período de acá lo heredan todos los widgets que no tengan uno propio.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-end gap-3">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="dash-name">Nombre</Label>
                            <Input
                                id="dash-name"
                                className="w-64"
                                value={draft.name}
                                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Período</Label>
                            <Select value={draft.period} onValueChange={(v) => setDraft({ ...draft, period: v })}>
                                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="7d">7 días</SelectItem>
                                    <SelectItem value="28d">28 días</SelectItem>
                                    <SelectItem value="90d">90 días</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <button className={btn} onClick={() => setWidgetDialog(newWidget())}>
                            <Plus className="h-4 w-4" />
                            Agregar widget
                        </button>
                        <button
                            className="ml-auto inline-flex h-9 items-center gap-2 rounded-md border border-destructive/30 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(draft)}
                        >
                            <Trash2 className="h-4 w-4" />
                            Eliminar dashboard
                        </button>
                    </CardContent>
                </Card>
            )}

            {/* ── Grilla de widgets ───────────────────────────────────────── */}
            {view && (
                view.widgets.length === 0 ? (
                    <Card>
                        <CardContent className="py-16 text-center text-sm text-muted-foreground">
                            {editing
                                ? 'Sin widgets todavía. Agregá el primero con “Agregar widget”.'
                                : 'Este dashboard no tiene widgets. Entrá a “Editar” para agregarlos.'}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {view.widgets.map((w, i) => (
                            <DashboardWidget
                                key={w.id}
                                widget={w}
                                fallbackPeriod={view.period}
                                actions={editing ? (
                                    <div className="flex items-center gap-0.5">
                                        <button
                                            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
                                            onClick={() => moveWidget(w.id, -1)}
                                            disabled={i === 0}
                                            title="Mover antes"
                                        >
                                            <ArrowLeft className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
                                            onClick={() => moveWidget(w.id, 1)}
                                            disabled={i === view.widgets.length - 1}
                                            title="Mover después"
                                        >
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                                            onClick={() => setWidgetDialog(w)}
                                            title="Configurar"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() => removeWidget(w.id)}
                                            title="Quitar"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ) : undefined}
                            />
                        ))}
                    </div>
                )
            )}

            {widgetDialog && (
                <WidgetDialog
                    widget={widgetDialog}
                    datasets={datasets}
                    sites={sites}
                    onClose={() => setWidgetDialog(null)}
                    onSave={upsertWidget}
                />
            )}

            <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar dashboard</AlertDialogTitle>
                        <AlertDialogDescription>{deleteTarget && <>¿Seguro que querés eliminar <span className="font-medium text-foreground">{deleteTarget.name}</span> y todos sus widgets?</>}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={busy !== null}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className={btnDestructive}
                            onClick={(e) => { e.preventDefault(); removeDashboard(); }}
                            disabled={busy !== null}
                        >
                            {busy === 'delete' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

/** Configuración de un widget. Las opciones se derivan del catálogo del Explorer. */
function WidgetDialog({
    widget, datasets, sites, onClose, onSave,
}: {
    widget: Widget;
    datasets: Dataset[];
    sites: any[];
    onClose: () => void;
    onSave: (w: Widget) => void;
}) {
    const [w, setW] = useState<Widget>(widget);
    const ds = datasets.find((d) => d.key === w.dataset);

    // Máximo de métricas según el tipo: un número muestra una sola.
    const maxMetrics = w.type === 'kpi' ? 1 : w.type === 'line' ? 2 : 4;

    // Al cambiar de fuente o de tipo, reajusto métricas y dimensión a algo válido.
    useEffect(() => {
        if (!ds) return;
        setW((prev) => {
            const validMetrics = prev.metrics.filter((m) => ds.metrics.some((x) => x.key === m));
            const metrics = (validMetrics.length ? validMetrics : ds.metrics.slice(0, 1).map((m) => m.key))
                .slice(0, prev.type === 'kpi' ? 1 : prev.type === 'line' ? 2 : 4);

            let dimension = prev.dimension;
            if (prev.type === 'kpi') dimension = null;
            else if (prev.type === 'line') dimension = 'date';
            else if (prev.type === 'table') {
                const textDim = ds.dimensions.find((d) => d.type === 'text' && d.key !== 'site');
                const valid = dimension && ds.dimensions.some((d) => d.key === dimension) && dimension !== 'date';
                if (!valid) dimension = textDim?.key || 'site';
            }
            return { ...prev, metrics, dimension };
        });
    }, [w.dataset, w.type, ds?.key]); // eslint-disable-line react-hooks/exhaustive-deps

    const toggleMetric = (key: string) => {
        setW((prev) => {
            if (prev.metrics.includes(key)) {
                const next = prev.metrics.filter((m) => m !== key);
                return { ...prev, metrics: next.length ? next : prev.metrics };
            }
            if (prev.metrics.length >= maxMetrics) {
                // Al llegar al máximo, la nueva métrica reemplaza a la última.
                return { ...prev, metrics: [...prev.metrics.slice(0, maxMetrics - 1), key] };
            }
            return { ...prev, metrics: [...prev.metrics, key] };
        });
    };

    const title = w.title.trim() || (ds && w.metrics.length
        ? `${ds.metrics.find((m) => m.key === w.metrics[0])?.label} · ${ds.label}`
        : 'Widget');

    // Las tablas pueden agrupar por cualquier dimensión que no sea la fecha.
    const tableDims = (ds?.dimensions || []).filter((d) => d.key !== 'date');

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Configurar widget</DialogTitle>
                    <DialogDescription>
                        Los datos salen del mismo catálogo que el Explorer.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto py-2 pr-1">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="w-title">Título</Label>
                        <Input
                            id="w-title"
                            value={w.title}
                            onChange={(e) => setW({ ...w, title: e.target.value })}
                            placeholder={title}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label>Tipo</Label>
                        <div className="flex gap-1.5">
                            {WIDGET_TYPES.map((t) => (
                                <button
                                    key={t.key}
                                    type="button"
                                    title={t.hint}
                                    onClick={() => setW({ ...w, type: t.key })}
                                    className={cn(
                                        'flex-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
                                        w.type === t.key
                                            ? 'border-primary/30 bg-primary/10 text-foreground'
                                            : 'bg-background text-muted-foreground hover:bg-muted'
                                    )}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                            <Label>Fuente</Label>
                            <Select value={w.dataset} onValueChange={(v) => setW({ ...w, dataset: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {datasets.map((d) => (
                                        <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Ancho</Label>
                            <Select
                                value={String(w.width)}
                                onValueChange={(v) => setW({ ...w, width: Number(v) as 1 | 2 })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Media columna</SelectItem>
                                    <SelectItem value="2">Ancho completo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label>
                            Métricas
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                                (hasta {maxMetrics})
                            </span>
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                            {(ds?.metrics || []).map((m) => (
                                <button
                                    key={m.key}
                                    type="button"
                                    onClick={() => toggleMetric(m.key)}
                                    className={cn(
                                        'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                                        w.metrics.includes(m.key)
                                            ? 'border-primary/30 bg-primary/10 text-foreground'
                                            : 'bg-background text-muted-foreground hover:bg-muted'
                                    )}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {w.type === 'table' && (
                        <div className="flex flex-col gap-1.5">
                            <Label>Agrupar por</Label>
                            <Select
                                value={w.dimension || ''}
                                onValueChange={(v) => setW({ ...w, dimension: v })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {tableDims.map((d) => (
                                        <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {w.type === 'line' && (
                        <p className="text-xs text-muted-foreground">
                            La serie temporal siempre se agrupa por fecha.
                        </p>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                            <Label>Sitio</Label>
                            <Select
                                value={w.siteId ? String(w.siteId) : ALL}
                                onValueChange={(v) => setW({ ...w, siteId: v === ALL ? null : Number(v) })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>Todos los sitios</SelectItem>
                                    {sites.map((s: any) => (
                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Período</Label>
                            <Select
                                value={w.period || INHERIT}
                                onValueChange={(v) => setW({ ...w, period: v === INHERIT ? null : v })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={INHERIT}>El del dashboard</SelectItem>
                                    <SelectItem value="7d">7 días</SelectItem>
                                    <SelectItem value="28d">28 días</SelectItem>
                                    <SelectItem value="90d">90 días</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <button className={btn} onClick={onClose}>Cancelar</button>
                    <button
                        className={btnPrimary}
                        onClick={() => onSave({ ...w, title: w.title.trim() || title })}
                        disabled={w.metrics.length === 0}
                    >
                        Guardar widget
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
