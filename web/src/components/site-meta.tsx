'use client';

import useSWR from 'swr';
import { Trophy } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { formatDate, formatNumber } from '@/lib/format';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

/** Fila de dato de la ficha. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-3 border-b py-1.5 last:border-0">
            <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
            <span className="truncate text-right text-sm">{children}</span>
        </div>
    );
}

/** Posición del sitio dentro del portfolio para una métrica. */
function Rank({ label, position, total, value }: {
    label: string; position: number | null; total: number; value: string;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="flex items-baseline gap-1.5">
                <span className="text-sm font-medium tabular-nums">{value}</span>
                {position !== null && (
                    <Badge variant="outline" className="font-normal tabular-nums">
                        #{position} de {total}
                    </Badge>
                )}
            </span>
        </div>
    );
}

/**
 * Ficha técnica del sitio + cómo se ubica dentro del portfolio.
 * Reusa las claves SWR de /sites y del overview, así que no dispara requests nuevos
 * si esas pantallas ya se visitaron.
 */
export function SiteMeta({ siteId, period }: { siteId: string; period: string }) {
    const { data: sitesData } = useSWR('/sites', fetcher);
    const { data: overview } = useSWR(`/metrics/overview?period=${period}`, fetcher);

    const site = (sitesData?.sites || []).find((s: any) => String(s.id) === String(siteId));
    const sites = overview?.sites || [];

    // Posición del sitio entre los que tienen datos, por sesiones y por clicks.
    const rankBy = (pick: (s: any) => number | undefined | null) => {
        const ranked = sites
            .filter((s: any) => (pick(s) || 0) > 0)
            .sort((a: any, b: any) => (pick(b) || 0) - (pick(a) || 0));
        const i = ranked.findIndex((s: any) => String(s.id) === String(siteId));
        return { position: i >= 0 ? i + 1 : null, total: ranked.length };
    };

    const sessionsRank = rankBy((s) => s.ga?.sessions);
    const clicksRank = rankBy((s) => s.gsc?.clicks);
    const me = sites.find((s: any) => String(s.id) === String(siteId));

    if (!sitesData) return <Skeleton className="h-48" />;

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Ficha del sitio</CardTitle>
                    <CardDescription>Cómo está conectado y hasta cuándo llegan los datos.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col">
                    <Row label="Dominio">
                        <a
                            href={`https://${site?.domain}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-xs underline-offset-2 hover:underline"
                        >
                            {site?.domain || '—'}
                        </a>
                    </Row>
                    <Row label="Propiedad GA4">
                        {site?.ga4_property_id
                            ? <Badge variant="secondary" className="font-mono text-xs">{site.ga4_property_id}</Badge>
                            : <Badge variant="outline" className="text-muted-foreground">sin mapear</Badge>}
                    </Row>
                    <Row label="Search Console">
                        {site?.gsc_site_url
                            ? <Badge variant="secondary" className="max-w-[220px] truncate font-mono text-xs">{site.gsc_site_url}</Badge>
                            : <Badge variant="outline" className="text-muted-foreground">sin mapear</Badge>}
                    </Row>
                    <Row label="Últimos datos GA4">
                        {site?.last_ga_date
                            ? <span className="tabular-nums">{formatDate(site.last_ga_date)}</span>
                            : <span className="text-muted-foreground">—</span>}
                    </Row>
                    <Row label="Últimos datos GSC">
                        {site?.last_gsc_date
                            ? <span className="tabular-nums">{formatDate(site.last_gsc_date)}</span>
                            : <span className="text-muted-foreground">—</span>}
                    </Row>
                    <Row label="Estado">
                        {site?.is_active
                            ? <Badge variant="success">activo</Badge>
                            : <Badge variant="outline" className="text-muted-foreground">inactivo</Badge>}
                    </Row>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                        Dentro del portfolio
                    </CardTitle>
                    <CardDescription>Dónde se ubica este sitio frente a los demás.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    {!overview ? (
                        <Skeleton className="h-20" />
                    ) : (
                        <>
                            <Rank
                                label="Por sesiones"
                                position={sessionsRank.position}
                                total={sessionsRank.total}
                                value={formatNumber(me?.ga?.sessions ?? 0)}
                            />
                            <Rank
                                label="Por clicks de búsqueda"
                                position={clicksRank.position}
                                total={clicksRank.total}
                                value={formatNumber(me?.gsc?.clicks ?? 0)}
                            />
                            <p className="pt-1 text-xs text-muted-foreground">
                                Sobre los sitios activos que tienen datos en este período.
                            </p>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
