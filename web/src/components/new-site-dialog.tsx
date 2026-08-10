'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { fetcher, postJson } from '@/lib/fetcher';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ClarityFields } from '@/components/clarity-fields';
import { btn, btnPrimary } from '@/lib/ui';

const NONE = '__none__';

type Discovery = {
    ga4Properties: { propertyId: string; displayName: string; host: string | null }[];
    gscSites: { siteUrl: string; host: string }[];
};


const emptyForm = { name: '', domain: '', ga4: NONE, gsc: NONE, clarityProject: '', clarityToken: '' };

/**
 * Alta de sitio reutilizable: nombre + dominio y, opcionalmente, mapeo a GA4/GSC
 * elegido desde discovery (se carga al abrir el diálogo). Llama a onCreated al terminar.
 */
export function NewSiteDialog({ onCreated }: { onCreated?: () => void }) {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [discovery, setDiscovery] = useState<Discovery | null>(null);
    const [loadingDisc, setLoadingDisc] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onOpenChange = (o: boolean) => {
        setOpen(o);
        if (!o) return;
        setForm(emptyForm);
        setError(null);
        if (!discovery && !loadingDisc) {
            setLoadingDisc(true);
            fetcher('/sites/discovery')
                .then((j) => setDiscovery(j as unknown as Discovery))
                .catch(() => { /* mapeo opcional: se puede completar después */ })
                .finally(() => setLoadingDisc(false));
        }
    };

    const submit = async () => {
        setSaving(true);
        setError(null);
        try {
            await postJson('/sites', {
                name: form.name.trim(),
                domain: form.domain.trim(),
                ga4_property_id: form.ga4 === NONE ? null : form.ga4,
                gsc_site_url: form.gsc === NONE ? null : form.gsc,
                clarity_project_id: form.clarityProject.trim() || null,
                ...(form.clarityToken.trim() ? { clarity_api_token: form.clarityToken.trim() } : {}),
            });
            setOpen(false);
            onCreated?.();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const placeholder = loadingDisc ? 'Buscando en Google…' : '— sin mapear —';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <button className={btn}>
                    <Plus className="h-4 w-4" />
                    Nuevo sitio
                </button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nuevo sitio</DialogTitle>
                    <DialogDescription>
                        Cargá el nombre y el dominio del cliente. Opcionalmente vinculá su propiedad
                        GA4 y su sitio de Search Console (podés hacerlo después desde el mapeo).
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-2">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="new-site-name">Nombre</Label>
                        <Input
                            id="new-site-name"
                            placeholder="Nombre del cliente"
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="new-site-domain">Dominio</Label>
                        <Input
                            id="new-site-domain"
                            placeholder="ejemplo.com.ar"
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
                        idPrefix="new"
                        projectId={form.clarityProject}
                        token={form.clarityToken}
                        onProject={(v) => setForm((f) => ({ ...f, clarityProject: v }))}
                        onToken={(v) => setForm((f) => ({ ...f, clarityToken: v }))}
                    />
                    {error && <p className="text-sm text-destructive">✗ {error}</p>}
                </div>
                <DialogFooter>
                    <button className={btnPrimary} onClick={submit}
                        disabled={saving || !form.name.trim() || !form.domain.trim()}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        Agregar sitio
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
