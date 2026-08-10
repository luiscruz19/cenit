'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import {
    Loader2, Plus, Trash2, Pencil, Download, Send, FileText, AlertTriangle, CheckCircle2, XCircle,
} from 'lucide-react';
import { fetcher, postJson, putJson, deleteJson } from '@/lib/fetcher';
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

const PORTFOLIO = '__portfolio__';


const SECTIONS = [
    { key: 'kpis', label: 'KPIs', hint: 'Sesiones, usuarios, clicks…' },
    { key: 'health', label: 'Problemas', hint: 'Alertas de salud' },
    { key: 'opportunities', label: 'Oportunidades', hint: 'SEO con clicks ganables' },
    { key: 'rankings', label: 'Rankings', hint: 'Posiciones y cambios' },
    { key: 'topPages', label: 'Top páginas', hint: 'Lo que más tracciona' },
];

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

type Report = {
    id: number; name: string; siteId: number | null; siteName: string | null;
    period: string; sections: Record<string, boolean>;
    scheduleFrequency: 'none' | 'weekly' | 'monthly';
    scheduleDay: number; scheduleHour: number;
    recipients: string; isActive: boolean; lastSentAt: string | null;
};

const EMPTY = {
    name: '', siteId: PORTFOLIO, period: '28d',
    sections: { kpis: true, health: true, opportunities: true, rankings: true, topPages: true } as Record<string, boolean>,
    scheduleFrequency: 'none', scheduleDay: '1', scheduleHour: '8', recipients: '',
};

const scheduleLabel = (r: Report) => {
    if (r.scheduleFrequency === 'none') return 'Manual';
    const hour = `${String(r.scheduleHour).padStart(2, '0')}:00`;
    if (r.scheduleFrequency === 'weekly') return `${DAYS[r.scheduleDay] || '—'} a las ${hour}`;
    return `Día ${r.scheduleDay} de cada mes a las ${hour}`;
};

export function ReportsClient() {
    const { data, mutate } = useSWR('/reports', fetcher);
    const { data: sendsData, mutate: mutateSends } = useSWR('/reports/sends?limit=30', fetcher);
    const { data: sitesData } = useSWR('/sites', fetcher);

    const reports: Report[] = data?.reports || [];
    const mailConfigured = data?.mailConfigured;
    const sends = sendsData?.sends || [];
    const sites = (sitesData?.sites || []).filter((s: any) => s.is_active);

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Report | null>(null);
    const [form, setForm] = useState(EMPTY);
    const [busy, setBusy] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);

    useEffect(() => {
        if (!open) return;
        setForm(editing ? {
            name: editing.name,
            siteId: editing.siteId ? String(editing.siteId) : PORTFOLIO,
            period: editing.period,
            sections: { ...EMPTY.sections, ...(editing.sections || {}) },
            scheduleFrequency: editing.scheduleFrequency,
            scheduleDay: String(editing.scheduleDay),
            scheduleHour: String(editing.scheduleHour),
            recipients: editing.recipients,
        } : EMPTY);
    }, [open, editing]);

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

    const save = () => act('save', async () => {
        const payload = {
            name: form.name.trim(),
            siteId: form.siteId === PORTFOLIO ? null : Number(form.siteId),
            period: form.period,
            sections: form.sections,
            scheduleFrequency: form.scheduleFrequency,
            scheduleDay: Number(form.scheduleDay),
            scheduleHour: Number(form.scheduleHour),
            recipients: form.recipients.trim(),
        };
        if (editing) await putJson(`/reports/${editing.id}`, payload);
        else await postJson('/reports', payload);
        setOpen(false);
        setEditing(null);
        await mutate();
    }, editing ? '✓ Reporte actualizado' : '✓ Reporte creado');

    const remove = () => act('delete', async () => {
        await deleteJson(`/reports/${deleteTarget!.id}`);
        setDeleteTarget(null);
        await mutate();
    }, '✓ Reporte eliminado');

    const sendNow = (report: Report) => act(`send-${report.id}`, async () => {
        await postJson(`/reports/${report.id}/send`, {});
        await Promise.all([mutate(), mutateSends()]);
    }, '✓ Reporte enviado');

    // El PDF baja directo del proxy: es binario, no pasa por el fetcher de JSON.
    const downloadPdf = (report: Report) => {
        window.open(`/api/proxy/reports/${report.id}/pdf`, '_blank');
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Reportes</h1>
                    <p className="text-sm text-muted-foreground">
                        Un PDF con lo que importa, y que se manda solo cuando toca.
                    </p>
                </div>
                <button className={btnPrimary} onClick={() => { setEditing(null); setOpen(true); }} disabled={busy !== null}>
                    <Plus className="h-4 w-4" />
                    Nuevo reporte
                </button>
            </div>

            {data && !mailConfigured && (
                <Card className="border-amber-500/40">
                    <CardContent className="flex items-center gap-3 p-4">
                        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                        <div className="flex-1 text-sm">
                            <p className="font-medium">No hay SMTP configurado.</p>
                            <p className="text-muted-foreground">
                                Podés descargar los PDF igual, pero no se pueden enviar por email hasta
                                configurar SMTP_HOST, SMTP_USER y SMTP_PASS en la API.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Reportes</CardTitle>
                    <CardDescription>
                        El PDF se arma en el momento desde los datos del ETL: siempre coincide con el dashboard.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Reporte</TableHead>
                                <TableHead>Alcance</TableHead>
                                <TableHead>Programación</TableHead>
                                <TableHead>Destinatarios</TableHead>
                                <TableHead className="w-32"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reports.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                                        Todavía no hay reportes. Creá el primero con “Nuevo reporte”.
                                    </TableCell>
                                </TableRow>
                            )}
                            {reports.map((r) => (
                                <TableRow key={r.id} className={cn(!r.isActive && 'opacity-50')}>
                                    <TableCell>
                                        <p className="font-medium">{r.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            período {r.period}
                                            {r.lastSentAt && ` · último envío ${new Date(r.lastSentAt).toLocaleDateString('es-AR')}`}
                                        </p>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {r.siteName || <Badge variant="secondary">Portfolio</Badge>}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {scheduleLabel(r)}
                                    </TableCell>
                                    <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">
                                        {r.recipients || '—'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                onClick={() => downloadPdf(r)}
                                                title="Descargar PDF"
                                            >
                                                <Download className="h-4 w-4" />
                                            </button>
                                            <button
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                                                onClick={() => sendNow(r)}
                                                disabled={busy !== null || !r.recipients || !mailConfigured}
                                                title={r.recipients ? 'Enviar ahora' : 'Sin destinatarios'}
                                            >
                                                {busy === `send-${r.id}`
                                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                                    : <Send className="h-4 w-4" />}
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
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Historial de envíos</CardTitle>
                    <CardDescription>Últimos 30 envíos, programados y manuales.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Cuándo</TableHead>
                                <TableHead>Reporte</TableHead>
                                <TableHead>Origen</TableHead>
                                <TableHead>Destinatarios</TableHead>
                                <TableHead className="text-right">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sends.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                                        Sin envíos todavía.
                                    </TableCell>
                                </TableRow>
                            )}
                            {sends.map((s: any) => {
                                const report = reports.find((r) => r.id === s.reportId);
                                return (
                                    <TableRow key={s.id}>
                                        <TableCell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                                            {new Date(s.createdAt).toLocaleString('es-AR', {
                                                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                                            })}
                                        </TableCell>
                                        <TableCell className="text-sm font-medium">
                                            {report?.name || `#${s.reportId}`}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {s.triggerType === 'manual' ? 'manual' : 'programado'}
                                        </TableCell>
                                        <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground">
                                            {s.recipients || '—'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {s.status === 'sent' ? (
                                                <Badge variant="success">
                                                    <CheckCircle2 className="mr-1 h-3 w-3" />enviado
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive" title={s.error || ''}>
                                                    <XCircle className="mr-1 h-3 w-3" />falló
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* ── Alta / edición ─────────────────────────────────────────── */}
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {editing ? 'Editar reporte' : 'Nuevo reporte'}
                        </DialogTitle>
                        <DialogDescription>
                            Elegí el alcance, qué bloques entran al PDF y cuándo se manda.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto py-2 pr-1">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="report-name">Nombre</Label>
                            <Input
                                id="report-name"
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                placeholder="Reporte mensual · Mi sitio"
                            />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="flex flex-col gap-1.5">
                                <Label>Alcance</Label>
                                <Select value={form.siteId} onValueChange={(v) => setForm((f) => ({ ...f, siteId: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={PORTFOLIO}>Portfolio completo</SelectItem>
                                        {sites.map((s: any) => (
                                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Período</Label>
                                <Select value={form.period} onValueChange={(v) => setForm((f) => ({ ...f, period: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="7d">7 días</SelectItem>
                                        <SelectItem value="28d">28 días</SelectItem>
                                        <SelectItem value="90d">90 días</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label>Qué incluye</Label>
                            <div className="flex flex-wrap gap-1.5">
                                {SECTIONS.map((s) => {
                                    const on = form.sections[s.key] !== false;
                                    return (
                                        <button
                                            key={s.key}
                                            type="button"
                                            aria-pressed={on}
                                            title={s.hint}
                                            onClick={() => setForm((f) => ({
                                                ...f,
                                                sections: { ...f.sections, [s.key]: !on },
                                            }))}
                                            className={cn(
                                                'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                                                on
                                                    ? 'border-primary/30 bg-primary/10 text-foreground'
                                                    : 'bg-background text-muted-foreground hover:bg-muted'
                                            )}
                                        >
                                            {s.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="flex flex-col gap-1.5">
                                <Label>Frecuencia</Label>
                                <Select
                                    value={form.scheduleFrequency}
                                    onValueChange={(v) => setForm((f) => ({ ...f, scheduleFrequency: v }))}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Solo manual</SelectItem>
                                        <SelectItem value="weekly">Semanal</SelectItem>
                                        <SelectItem value="monthly">Mensual</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {form.scheduleFrequency === 'weekly' && (
                                <div className="flex flex-col gap-1.5">
                                    <Label>Día</Label>
                                    <Select
                                        value={form.scheduleDay}
                                        onValueChange={(v) => setForm((f) => ({ ...f, scheduleDay: v }))}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {DAYS.map((d, i) => (
                                                <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {form.scheduleFrequency === 'monthly' && (
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="report-day">Día del mes</Label>
                                    <Input
                                        id="report-day"
                                        type="number"
                                        min={1}
                                        max={28}
                                        value={form.scheduleDay}
                                        onChange={(e) => setForm((f) => ({ ...f, scheduleDay: e.target.value }))}
                                    />
                                </div>
                            )}

                            {form.scheduleFrequency !== 'none' && (
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="report-hour">Hora</Label>
                                    <Input
                                        id="report-hour"
                                        type="number"
                                        min={0}
                                        max={23}
                                        value={form.scheduleHour}
                                        onChange={(e) => setForm((f) => ({ ...f, scheduleHour: e.target.value }))}
                                    />
                                </div>
                            )}
                        </div>

                        {form.scheduleFrequency === 'monthly' && (
                            <p className="text-xs text-muted-foreground">
                                El día máximo es 28, para que el envío exista también en febrero.
                            </p>
                        )}

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="report-recipients">Destinatarios</Label>
                            <Input
                                id="report-recipients"
                                value={form.recipients}
                                onChange={(e) => setForm((f) => ({ ...f, recipients: e.target.value }))}
                                placeholder="cliente@ejemplo.com, equipo@ejemplo.com"
                            />
                            <p className="text-xs text-muted-foreground">
                                Separados por coma. Sin destinatarios, el reporte solo se puede descargar.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <button className={btn} onClick={() => setOpen(false)} disabled={busy !== null}>
                            Cancelar
                        </button>
                        <button className={btnPrimary} onClick={save} disabled={busy !== null || !form.name.trim()}>
                            {busy === 'save' && <Loader2 className="h-4 w-4 animate-spin" />}
                            {editing ? 'Guardar cambios' : 'Crear reporte'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Confirmar borrado ──────────────────────────────────────── */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar reporte</AlertDialogTitle>
                        <AlertDialogDescription>{deleteTarget && (
                                <>¿Seguro que querés eliminar <span className="font-medium text-foreground">{deleteTarget.name}</span>?
                                    Deja de enviarse; el historial se conserva.</>
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
