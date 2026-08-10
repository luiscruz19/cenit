'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Loader2, RefreshCw, Search, AlertTriangle, CheckCircle2, XCircle, Trash2, Pencil } from 'lucide-react';
import { fetcher, postJson, deleteJson } from '@/lib/fetcher';
import { formatDate, formatNumber } from '@/lib/format';
import { NewSiteDialog } from '@/components/new-site-dialog';
import { EditSiteDialog, type EditableSite } from '@/components/edit-site-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
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

const NONE = '__none__';

type Discovery = {
    ga4Properties: { propertyId: string; displayName: string; host: string | null }[];
    gscSites: { siteUrl: string; host: string }[];
    suggestions: { siteId: number; ga4PropertyId: string | null; gscSiteUrl: string | null }[];
};


export function SettingsClient() {
    const { data: sitesData, mutate: mutateSites } = useSWR('/sites', fetcher);
    const { data: runsData, mutate: mutateRuns } = useSWR('/etl/runs?limit=10', fetcher, { refreshInterval: 10000 });
    const { data: meData } = useSWR('/auth/me', fetcher);

    const [discovery, setDiscovery] = useState<Discovery | null>(null);
    const [pending, setPending] = useState<Record<number, { ga4?: string | null; gsc?: string | null }>>({});
    const [busy, setBusy] = useState<string | null>(null);

    const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
    const [editTarget, setEditTarget] = useState<EditableSite | null>(null);

    const sites = sitesData?.sites || [];
    const runs = runsData?.runs || [];
    const revoked = meData?.googleStatus === 'revoked';

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

    const loadDiscovery = () => act('discovery', async () => {
        const json = await fetcher('/sites/discovery');
        setDiscovery(json as unknown as Discovery);
    });

    const removeSite = () => act('delete', async () => {
        const res: any = await deleteJson(`/sites/${deleteTarget.id}`);
        setDeleteTarget(null);
        await mutateSites();
        toast.success(res?.message || '✓ Sitio eliminado');
    });

    const applySuggestions = () => {
        if (!discovery) return;
        const next = { ...pending };
        for (const s of discovery.suggestions) {
            const site = sites.find((x: any) => x.id === s.siteId);
            if (!site) continue;
            next[s.siteId] = {
                ga4: site.ga4_property_id || s.ga4PropertyId || null,
                gsc: site.gsc_site_url || s.gscSiteUrl || null,
            };
        }
        setPending(next);
    };

    const saveMapping = () => act('save', async () => {
        const mappings = Object.entries(pending).map(([siteId, v]) => ({
            siteId: Number(siteId),
            ...(v.ga4 !== undefined ? { ga4PropertyId: v.ga4 } : {}),
            ...(v.gsc !== undefined ? { gscSiteUrl: v.gsc } : {}),
        }));
        if (!mappings.length) return;
        await postJson('/sites/mapping', { mappings });
        setPending({});
        await mutateSites();
    }, '✓ Mapeo guardado');

    const runNow = () => act('run', async () => {
        await postJson('/etl/run', {});
        await mutateRuns();
    }, '✓ ETL disparado');

    const backfill = () => act('backfill', async () => {
        await postJson('/etl/backfill', {});
        await mutateRuns();
    }, '✓ Backfill iniciado (ver corridas abajo)');

    const currentValue = (site: any, kind: 'ga4' | 'gsc') => {
        const p = pending[site.id];
        if (p && p[kind] !== undefined) return p[kind];
        return kind === 'ga4' ? site.ga4_property_id : site.gsc_site_url;
    };

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-xl font-semibold tracking-tight">Configuración</h1>
                <p className="text-sm text-muted-foreground">Mapeo de propiedades, cuenta de Google y corridas del ETL.</p>
            </div>

            {revoked && (
                <Card className="border-destructive/40">
                    <CardContent className="flex items-center gap-3 p-4">
                        <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
                        <div className="flex-1 text-sm">
                            <p className="font-medium">El acceso a Google fue revocado o expiró.</p>
                            <p className="text-muted-foreground">El ETL no puede correr. Volvé a iniciar sesión para reconectar la cuenta.</p>
                        </div>
                        <a href="/api/auth/google" className={btnPrimary}>Reconectar Google</a>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader className="flex-row items-start justify-between space-y-0">
                    <div>
                        <CardTitle className="text-base">Mapeo de sitios</CardTitle>
                        <CardDescription>
                            Vinculá cada proyecto con su propiedad GA4 y su sitio de Search Console.
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <NewSiteDialog onCreated={() => { toast.success('Sitio agregado'); mutateSites(); }} />
                        <button className={btn} onClick={loadDiscovery} disabled={busy !== null}>
                            {busy === 'discovery' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            Buscar en Google
                        </button>
                        {discovery && (
                            <button className={btn} onClick={applySuggestions}>Aplicar sugerencias</button>
                        )}
                        <button className={btnPrimary} onClick={saveMapping}
                            disabled={busy !== null || Object.keys(pending).length === 0}>
                            {busy === 'save' && <Loader2 className="h-4 w-4 animate-spin" />}
                            Guardar cambios
                        </button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Sitio</TableHead>
                                <TableHead>Propiedad GA4</TableHead>
                                <TableHead>Search Console</TableHead>
                                <TableHead className="text-right">Últimos datos</TableHead>
                                <TableHead className="w-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sites.map((site: any) => (
                                <TableRow key={site.id}>
                                    <TableCell>
                                        <p className="flex items-center gap-2 font-medium">
                                            {site.name}
                                            {!site.is_active && (
                                                <Badge variant="outline" className="font-normal text-muted-foreground">inactivo</Badge>
                                            )}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{site.domain}</p>
                                    </TableCell>
                                    <TableCell>
                                        {discovery ? (
                                            <Select
                                                value={currentValue(site, 'ga4') || NONE}
                                                onValueChange={(v) => setPending((prev) => ({
                                                    ...prev,
                                                    [site.id]: { ...prev[site.id], ga4: v === NONE ? null : v },
                                                }))}
                                            >
                                                <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={NONE}>— sin mapear —</SelectItem>
                                                    {discovery.ga4Properties.map((p) => (
                                                        <SelectItem key={p.propertyId} value={p.propertyId}>
                                                            {p.displayName} {p.host ? `(${p.host})` : ''}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : site.ga4_property_id
                                            ? <Badge variant="secondary">{site.ga4_property_id}</Badge>
                                            : <Badge variant="outline" className="text-muted-foreground">sin mapear</Badge>}
                                    </TableCell>
                                    <TableCell>
                                        {discovery ? (
                                            <Select
                                                value={currentValue(site, 'gsc') || NONE}
                                                onValueChange={(v) => setPending((prev) => ({
                                                    ...prev,
                                                    [site.id]: { ...prev[site.id], gsc: v === NONE ? null : v },
                                                }))}
                                            >
                                                <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={NONE}>— sin mapear —</SelectItem>
                                                    {discovery.gscSites.map((s) => (
                                                        <SelectItem key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : site.gsc_site_url
                                            ? <Badge variant="secondary">{site.gsc_site_url}</Badge>
                                            : <Badge variant="outline" className="text-muted-foreground">sin mapear</Badge>}
                                    </TableCell>
                                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                                        {site.last_ga_date ? `GA4 ${formatDate(site.last_ga_date)}` : 'GA4 —'}
                                        <br />
                                        {site.last_gsc_date ? `GSC ${formatDate(site.last_gsc_date)}` : 'GSC —'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                                                onClick={() => setEditTarget(site as EditableSite)}
                                                disabled={busy !== null}
                                                title="Editar sitio"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                                                onClick={() => setDeleteTarget(site)}
                                                disabled={busy !== null}
                                                title="Eliminar sitio"
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
                <CardHeader className="flex-row items-start justify-between space-y-0">
                    <div>
                        <CardTitle className="text-base">ETL</CardTitle>
                        <CardDescription>
                            Corrida diaria automática a las 05:00 (ART). Los datos de Search Console llegan con ~3 días de retraso.
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <button className={btn} onClick={runNow} disabled={busy !== null}>
                            {busy === 'run' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            Correr ahora
                        </button>
                        <Dialog>
                            <DialogTrigger asChild>
                                <button className={btn} disabled={busy !== null}>Backfill histórico</button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Backfill histórico</DialogTitle>
                                    <DialogDescription>
                                        Trae hasta 16 meses de historia de GA4 y Search Console para todos los sitios
                                        mapeados, en bloques de 30 días. Puede tardar varios minutos; el progreso se ve
                                        en la lista de corridas.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <button className={btnPrimary} onClick={backfill} disabled={busy !== null}>
                                        {busy === 'backfill' && <Loader2 className="h-4 w-4 animate-spin" />}
                                        Iniciar backfill
                                    </button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Corrida</TableHead>
                                <TableHead>Rango</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Filas</TableHead>
                                <TableHead className="text-right">Sitios OK / con error</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {runs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                                        Sin corridas todavía. Mapeá los sitios y corré el backfill.
                                    </TableCell>
                                </TableRow>
                            )}
                            {runs.map((run: any) => (
                                <TableRow key={run.id}>
                                    <TableCell>
                                        <span className="font-medium">#{run.id}</span>
                                        <span className="ml-2 text-xs text-muted-foreground">
                                            {run.trigger_type} · {run.source}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-xs tabular-nums">
                                        {run.date_from && run.date_to ? `${formatDate(run.date_from)} – ${formatDate(run.date_to)}` : '—'}
                                        {run.stats?.chunksTotal ? ` · chunk ${run.stats.chunksDone}/${run.stats.chunksTotal}` : ''}
                                    </TableCell>
                                    <TableCell>
                                        {run.status === 'running' && <Badge variant="secondary"><Loader2 className="mr-1 h-3 w-3 animate-spin" />corriendo</Badge>}
                                        {run.status === 'success' && <Badge variant="success"><CheckCircle2 className="mr-1 h-3 w-3" />ok</Badge>}
                                        {run.status === 'partial' && <Badge variant="secondary"><AlertTriangle className="mr-1 h-3 w-3" />parcial</Badge>}
                                        {run.status === 'error' && <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />error</Badge>}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">{formatNumber(run.stats?.rowsUpserted ?? 0)}</TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {run.stats?.sitesOk ?? '—'} / {run.stats?.sitesFailed?.length ?? 0}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <EditSiteDialog
                site={editTarget}
                onOpenChange={(o) => !o && setEditTarget(null)}
                onSaved={(msg) => { toast.success(msg); setEditTarget(null); mutateSites(); }}
            />

            <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar sitio</AlertDialogTitle>
                        <AlertDialogDescription>{deleteTarget && (
                                <>¿Seguro que querés eliminar <span className="font-medium text-foreground">{deleteTarget.name}</span> ({deleteTarget.domain})? Si ya tiene métricas cargadas, se desactivará en lugar de borrarse para no perder el histórico.</>
                            )}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={busy !== null}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className={btnDestructive}
                            onClick={(e) => { e.preventDefault(); removeSite(); }}
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
