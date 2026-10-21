'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import {
    Loader2, Plus, Trash2, Pencil, Play, Bell, BellOff, AlertTriangle, CheckCircle2, Mail,
} from 'lucide-react';
import { fetcher, postJson, putJson, deleteJson } from '@/lib/fetcher';
import { resolveCurrentSite } from '@/lib/current-site';
import { cn } from '@/utils/shadcn';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { btn, btnPrimary, btnDestructive } from '@/lib/ui';
import { toast } from 'sonner';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Rule = {
    id: number; name: string; siteId: number | null; siteName: string | null;
    metric: string; metricLabel: string; operator: string; threshold: number;
    windowDays: number; severity: string; cooldownHours: number;
    notifyEmails: string; isActive: boolean;
};

type Field = { key: string; label: string; type?: string; needsPrevious?: boolean };

const EMPTY = {
    name: '', siteId: '', metric: 'sessions', operator: 'drop_pct',
    threshold: '30', windowDays: '7', severity: 'warning', cooldownHours: '24',
    notifyEmails: '',
};

const severityBadge = (severity: string) => {
    if (severity === 'critical') return <Badge variant="destructive">crítico</Badge>;
    if (severity === 'warning') {
        return <Badge variant="warning">atención</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground">info</Badge>;
};

export function AlertsClient() {
    const searchParams = useSearchParams();
    const { data: schema } = useSWR('/alerts/schema', fetcher, { revalidateOnFocus: false });
    const { data: rulesData, mutate: mutateRules } = useSWR('/alerts/rules', fetcher);
    const { data: sitesData } = useSWR('/sites', fetcher);

    const metrics: Field[] = schema?.metrics || [];
    const operators: Field[] = schema?.operators || [];
    const mailConfigured = schema?.mailConfigured;
    const sites = (sitesData?.sites || []).filter((s: any) => s.is_active);

    // La pantalla vive dentro del proyecto activo: URL (?site=) → guardado → primero.
    const [siteId, setSiteId] = useState<string>('');
    useEffect(() => {
        if (!siteId && sites.length) {
            setSiteId(resolveCurrentSite(sites, searchParams.get('site')) || '');
        }
    }, [sites, siteId, searchParams]);
    const siteName = sites.find((s: any) => String(s.id) === siteId)?.name || null;

    // El historial se pide ya filtrado por sitio (el límite no recorta otros proyectos).
    const { data: eventsData, mutate: mutateEvents } = useSWR(
        siteId ? `/alerts/events?limit=50&siteId=${siteId}` : null, fetcher,
    );

    // Solo las reglas de este proyecto.
    const rules: Rule[] = (rulesData?.rules || []).filter(
        (r: Rule) => !siteId || String(r.siteId) === siteId,
    );
    const events = eventsData?.events || [];

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Rule | null>(null);
    const [form, setForm] = useState(EMPTY);
    const [busy, setBusy] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Rule | null>(null);

    // Al abrir para editar, precargo el formulario con la regla.
    useEffect(() => {
        if (!open) return;
        setForm(editing ? {
            name: editing.name,
            siteId: editing.siteId ? String(editing.siteId) : siteId,
            metric: editing.metric,
            operator: editing.operator,
            threshold: String(editing.threshold),
            windowDays: String(editing.windowDays),
            severity: editing.severity,
            cooldownHours: String(editing.cooldownHours),
            notifyEmails: editing.notifyEmails,
        } : { ...EMPTY, siteId });
    }, [open, editing, siteId]);

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

    const payload = () => ({
        name: form.name.trim(),
        siteId: form.siteId ? Number(form.siteId) : null,
        metric: form.metric,
        operator: form.operator,
        threshold: Number(form.threshold),
        windowDays: Number(form.windowDays),
        severity: form.severity,
        cooldownHours: Number(form.cooldownHours),
        notifyEmails: form.notifyEmails.trim(),
    });

    const save = () => act('save', async () => {
        if (editing) await putJson(`/alerts/rules/${editing.id}`, payload());
        else await postJson('/alerts/rules', payload());
        setOpen(false);
        setEditing(null);
        await mutateRules();
    }, editing ? '✓ Regla actualizada' : '✓ Regla creada');

    const remove = () => act('delete', async () => {
        await deleteJson(`/alerts/rules/${deleteTarget!.id}`);
        setDeleteTarget(null);
        await mutateRules();
    }, '✓ Regla eliminada');

    const toggleActive = (rule: Rule) => act(`toggle-${rule.id}`, async () => {
        await putJson(`/alerts/rules/${rule.id}`, { isActive: !rule.isActive });
        await mutateRules();
    });

    const runNow = () => act('run', async () => {
        const res: any = await postJson('/alerts/run', {});
        const s = res.summary;
        await Promise.all([mutateEvents(), mutateRules()]);
        toast.success(
            `✓ ${s.rulesEvaluated} reglas evaluadas · ${s.triggered} disparos · `
            + `${s.notified} notificadas · ${s.skippedCooldown} en cooldown`
        );
    });

    const testMail = () => act('mail', async () => {
        const res: any = await postJson('/alerts/test-mail', {});
        toast.success(`${res.message}`);
    });

    const selectedMetric = metrics.find((m) => m.key === form.metric);
    const selectedOperator = operators.find((o) => o.key === form.operator);
    const isPct = selectedOperator?.needsPrevious;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">
                        Alertas{siteName && <span className="text-muted-foreground"> · {siteName}</span>}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Tus propios umbrales para este proyecto. Se evalúan solas todos los días después del ETL.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button className={btn} onClick={runNow} disabled={busy !== null}>
                        {busy === 'run' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        Evaluar ahora
                    </button>
                    <button className={btnPrimary} onClick={() => { setEditing(null); setOpen(true); }} disabled={busy !== null}>
                        <Plus className="h-4 w-4" />
                        Nueva regla
                    </button>
                </div>
            </div>

            {schema && !mailConfigured && (
                <Card className="border-amber-500/40">
                    <CardContent className="flex items-center gap-3 p-4">
                        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                        <div className="flex-1 text-sm">
                            <p className="font-medium">No hay SMTP configurado.</p>
                            <p className="text-muted-foreground">
                                Las alertas se van a registrar en el historial igual, pero no se van a enviar
                                por email. Configurá SMTP_HOST, SMTP_USER y SMTP_PASS en el entorno de la API.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {schema && mailConfigured && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    SMTP configurado.
                    <button className="font-medium underline" onClick={testMail} disabled={busy !== null}>
                        Probar conexión
                    </button>
                </div>
            )}

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Reglas</CardTitle>
                    <CardDescription>
                        Umbrales de este proyecto. El cooldown evita que la misma alerta se repita todos los días.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Regla</TableHead>
                                <TableHead>Condición</TableHead>
                                <TableHead>Severidad</TableHead>
                                <TableHead>Notifica a</TableHead>
                                <TableHead className="w-24"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rules.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                                        Todavía no hay reglas para este proyecto. Creá la primera con “Nueva regla”.
                                    </TableCell>
                                </TableRow>
                            )}
                            {rules.map((r) => {
                                const op = operators.find((o) => o.key === r.operator);
                                return (
                                    <TableRow key={r.id} className={cn(!r.isActive && 'opacity-50')}>
                                        <TableCell>
                                            <p className="font-medium">{r.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                ventana de {r.windowDays} días · cooldown {r.cooldownHours} h
                                            </p>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            <span className="font-medium">{r.metricLabel}</span>{' '}
                                            <span className="text-muted-foreground">{op?.label || r.operator}</span>{' '}
                                            <span className="font-medium tabular-nums">
                                                {r.threshold}{op?.needsPrevious ? '%' : ''}
                                            </span>
                                        </TableCell>
                                        <TableCell>{severityBadge(r.severity)}</TableCell>
                                        <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground">
                                            {r.notifyEmails || '—'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                    onClick={() => toggleActive(r)}
                                                    disabled={busy !== null}
                                                    title={r.isActive ? 'Desactivar' : 'Activar'}
                                                >
                                                    {r.isActive ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                                                </button>
                                                <button
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                    onClick={() => { setEditing(r); setOpen(true); }}
                                                    disabled={busy !== null}
                                                    title="Editar"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                                    onClick={() => setDeleteTarget(r)}
                                                    disabled={busy !== null}
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Historial de disparos</CardTitle>
                    <CardDescription>Últimos 50 eventos, más recientes primero.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Cuándo</TableHead>
                                <TableHead>Qué pasó</TableHead>
                                <TableHead>Severidad</TableHead>
                                <TableHead className="text-right">Email</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {events.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                                        Sin disparos todavía. Si acabás de crear una regla, probá “Evaluar ahora”.
                                    </TableCell>
                                </TableRow>
                            )}
                            {events.map((e: any) => (
                                <TableRow key={e.id}>
                                    <TableCell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                                        {new Date(e.createdAt).toLocaleString('es-AR', {
                                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                                        })}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{e.message}</TableCell>
                                    <TableCell>{severityBadge(e.severity)}</TableCell>
                                    <TableCell className="text-right">
                                        {e.notified
                                            ? <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-600" />
                                            : (
                                                <span className="text-xs text-muted-foreground" title={e.notifyError || ''}>
                                                    {e.notifyError ? 'falló' : 'no enviado'}
                                                </span>
                                            )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* ── Alta / edición de regla ─────────────────────────────────── */}
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Editar regla' : 'Nueva regla'}</DialogTitle>
                        <DialogDescription>
                            Se evalúa sobre la ventana elegida, anclada al último día con datos completos.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-4 py-2">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="rule-name">Nombre</Label>
                            <Input
                                id="rule-name"
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                placeholder="Caída fuerte de tráfico"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label>Proyecto</Label>
                            <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
                                {siteName || '—'}
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="flex flex-col gap-1.5">
                                <Label>Métrica</Label>
                                <Select value={form.metric} onValueChange={(v) => setForm((f) => ({ ...f, metric: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {metrics.map((m) => (
                                            <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Condición</Label>
                                <Select value={form.operator} onValueChange={(v) => setForm((f) => ({ ...f, operator: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {operators.map((o) => (
                                            <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="rule-threshold">Umbral{isPct ? ' (%)' : ''}</Label>
                                <Input
                                    id="rule-threshold"
                                    type="number"
                                    value={form.threshold}
                                    onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))}
                                />
                            </div>
                        </div>

                        {selectedMetric?.type === 'pct' && !isPct && (
                            <p className="text-xs text-muted-foreground">
                                Ojo: {selectedMetric.label} es un porcentaje que va de 0 a 1.
                                Para “menor al 30%”, el umbral es <code className="text-xs">0.3</code>.
                            </p>
                        )}
                        {selectedMetric?.key === 'position' && (
                            <p className="text-xs text-muted-foreground">
                                En posición, subir el número es empeorar: para detectar que caés del top 10,
                                usá “es mayor que” con umbral <code className="text-xs">10</code>.
                            </p>
                        )}

                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="rule-window">Ventana (días)</Label>
                                <Input
                                    id="rule-window"
                                    type="number"
                                    value={form.windowDays}
                                    onChange={(e) => setForm((f) => ({ ...f, windowDays: e.target.value }))}
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Severidad</Label>
                                <Select value={form.severity} onValueChange={(v) => setForm((f) => ({ ...f, severity: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="info">Info</SelectItem>
                                        <SelectItem value="warning">Atención</SelectItem>
                                        <SelectItem value="critical">Crítico</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="rule-cooldown">Cooldown (h)</Label>
                                <Input
                                    id="rule-cooldown"
                                    type="number"
                                    value={form.cooldownHours}
                                    onChange={(e) => setForm((f) => ({ ...f, cooldownHours: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="rule-emails">Notificar a</Label>
                            <Input
                                id="rule-emails"
                                value={form.notifyEmails}
                                onChange={(e) => setForm((f) => ({ ...f, notifyEmails: e.target.value }))}
                                placeholder="alguien@ejemplo.com, otro@ejemplo.com"
                            />
                            <p className="text-xs text-muted-foreground">
                                Separados por coma. Si lo dejás vacío, la alerta solo queda en el historial.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <button className={btn} onClick={() => setOpen(false)} disabled={busy !== null}>
                            Cancelar
                        </button>
                        <button
                            className={btnPrimary}
                            onClick={save}
                            disabled={busy !== null || !form.name.trim() || form.threshold === ''}
                        >
                            {busy === 'save' && <Loader2 className="h-4 w-4 animate-spin" />}
                            {editing ? 'Guardar cambios' : 'Crear regla'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Confirmar borrado ───────────────────────────────────────── */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar regla</AlertDialogTitle>
                        <AlertDialogDescription>{deleteTarget && (
                                <>¿Seguro que querés eliminar <span className="font-medium text-foreground">{deleteTarget.name}</span>?
                                    El historial de disparos que ya generó se conserva.</>
                            )}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={busy !== null}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className={btnDestructive}
                            onClick={(e) => { e.preventDefault(); remove(); }}
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
