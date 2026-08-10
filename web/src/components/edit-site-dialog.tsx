'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { fetcher, putJson } from '@/lib/fetcher';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ClarityFields } from '@/components/clarity-fields';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { btn, btnPrimary } from '@/lib/ui';

const NONE = '__none__';

type Discovery = {
    ga4Properties: { propertyId: string; displayName: string; host: string | null }[];
    gscSites: { siteUrl: string; host: string }[];
};

export type EditableSite = {
    id: number;
    name: string;
    domain: string;
    ga4_property_id: string | null;
    gsc_site_url: string | null;
    clarity_project_id: string | null;
    clarity_connected: boolean;
    is_active: boolean;
};


/**
 * Edición de un sitio existente: nombre, dominio, mapeo GA4/GSC y estado activo/inactivo
 * (para reactivar sitios que fueron desactivados al eliminarlos con datos cargados).
 * Controlado: se abre cuando `site` no es null.
 */
export function EditSiteDialog({
    site, onOpenChange, onSaved,
}: {
    site: EditableSite | null;
    onOpenChange: (open: boolean) => void;
    onSaved?: (message: string) => void;
}) {
    const [form, setForm] = useState({
        name: '', domain: '', ga4: NONE, gsc: NONE, isActive: true,
        clarityProject: '', clarityToken: '',
    });
    const [discovery, setDiscovery] = useState<Discovery | null>(null);
    const [loadingDisc, setLoadingDisc] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Precarga el formulario cada vez que se abre para un sitio distinto.
    useEffect(() => {
        if (!site) return;
        setForm({
            name: site.name,
            domain: site.domain,
            ga4: site.ga4_property_id || NONE,
            gsc: site.gsc_site_url || NONE,
            isActive: site.is_active,
            clarityProject: site.clarity_project_id || '',
            clarityToken: '', // nunca precargamos el token; vacío = no tocar.
        });
        setError(null);
        if (!discovery && !loadingDisc) {
            setLoadingDisc(true);
            fetcher('/sites/discovery')
                .then((j) => setDiscovery(j as unknown as Discovery))
                .catch(() => { /* mapeo opcional */ })
                .finally(() => setLoadingDisc(false));
        }
    }, [site]); // eslint-disable-line react-hooks/exhaustive-deps

    const submit = async () => {
        if (!site) return;
        setSaving(true);
        setError(null);
        try {
            await putJson(`/sites/${site.id}`, {
                name: form.name.trim(),
                domain: form.domain.trim(),
                ga4_property_id: form.ga4 === NONE ? null : form.ga4,
                gsc_site_url: form.gsc === NONE ? null : form.gsc,
                clarity_project_id: form.clarityProject.trim() || null,
                // Solo se manda si escribieron algo: vacío = dejar el token como está.
                ...(form.clarityToken.trim() ? { clarity_api_token: form.clarityToken.trim() } : {}),
                is_active: form.isActive,
            });
            onOpenChange(false);
            onSaved?.('✓ Sitio actualizado');
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const placeholder = loadingDisc ? 'Buscando en Google…' : '— sin mapear —';

    return (
        <Dialog open={!!site} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar sitio</DialogTitle>
                    <DialogDescription>
                        Actualizá el nombre, el dominio o el mapeo a GA4/Search Console.
                        Podés reactivar un sitio desactivado desde el estado.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-2">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="edit-site-name">Nombre</Label>
                        <Input
                            id="edit-site-name"
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="edit-site-domain">Dominio</Label>
                        <Input
                            id="edit-site-domain"
                            value={form.domain}
                            onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">
                            Se normaliza automáticamente (sin https:// ni www).
                        </p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label>Propiedad GA4</Label>
                        <Select
                            value={form.ga4}
                            onValueChange={(v) => setForm((f) => ({ ...f, ga4: v }))}
                            disabled={!discovery}
                        >
                            <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NONE}>— sin mapear —</SelectItem>
                                {discovery?.ga4Properties.map((p) => (
                                    <SelectItem key={p.propertyId} value={p.propertyId}>
                                        {p.displayName} {p.host ? `(${p.host})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label>Search Console</Label>
                        <Select
                            value={form.gsc}
                            onValueChange={(v) => setForm((f) => ({ ...f, gsc: v }))}
                            disabled={!discovery}
                        >
                            <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NONE}>— sin mapear —</SelectItem>
                                {discovery?.gscSites.map((s) => (
                                    <SelectItem key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <ClarityFields
                        idPrefix="edit"
                        projectId={form.clarityProject}
                        token={form.clarityToken}
                        connected={site?.clarity_connected}
                        onProject={(v) => setForm((f) => ({ ...f, clarityProject: v }))}
                        onToken={(v) => setForm((f) => ({ ...f, clarityToken: v }))}
                    />
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="edit-site-active">Estado</Label>
                        <div className="flex items-center gap-2.5">
                            <Switch
                                id="edit-site-active"
                                checked={form.isActive}
                                onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
                            />
                            <span className="text-sm font-medium">
                                {form.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Un sitio inactivo no aparece en el overview ni recibe datos nuevos del ETL, pero conserva su histórico.
                        </p>
                    </div>
                    {error && <p className="text-sm text-destructive">✗ {error}</p>}
                </div>
                <DialogFooter>
                    <button className={btn} onClick={() => onOpenChange(false)} disabled={saving}>
                        Cancelar
                    </button>
                    <button className={btnPrimary} onClick={submit}
                        disabled={saving || !form.name.trim() || !form.domain.trim()}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        Guardar cambios
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
