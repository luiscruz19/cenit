'use client';

import useSWR from 'swr';
import {
    MousePointerClick, MousePointer, Undo2, Bug, ExternalLink, Clock,
} from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { formatDuration, formatNumber } from '@/lib/format';
import { cn } from '@/utils/shadcn';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type Summary = {
    sessions: number; users: number;
    deadClickPct: number | null; rageClickPct: number | null; quickbackPct: number | null;
    excessiveScrollPct: number | null; scriptErrorPct: number | null;
    pagesPerSession: number | null; avgScrollDepth: number | null; avgActiveTime: number | null;
};

const pct = (v: number | null) => (v === null ? '—' : `${v.toFixed(1).replace('.', ',')}%`);

/**
 * Umbrales de color: los valores de referencia son criterio, no dato duro de Clarity.
 * Sirven para que un número salte a la vista, no como veredicto.
 */
function Friction({
    icon: Icon, label, value, hint, warnAt, badAt,
}: {
    icon: typeof MousePointerClick; label: string; value: number | null; hint: string;
    warnAt: number; badAt: number;
}) {
    const tone = value === null ? 'muted'
        : value >= badAt ? 'bad'
            : value >= warnAt ? 'warn'
                : 'ok';
    return (
        <div className="rounded-sm border bg-muted/30 p-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {label}
            </p>
            <p className={cn(
                'mt-1 text-xl font-semibold tabular-nums',
                tone === 'bad' && 'text-destructive',
                tone === 'warn' && 'text-amber-600',
            )}>
                {pct(value)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        </div>
    );
}

/**
 * Fricción y comportamiento del sitio, de Microsoft Clarity. Degrada en tres estados:
 * sin token conectado, conectado pero sin historia todavía (la API no permite backfill),
 * y con datos. Las métricas de fricción son "% de sesiones que la tuvieron", que es lo que
 * muestra el panel de Clarity y lo comparable entre sitios de distinto tamaño.
 */
export function SiteClarity({ siteId, period }: { siteId: string; period: string }) {
    const { data, isLoading } = useSWR(
        `/insights/clarity?siteId=${siteId}&period=${period}`,
        fetcher,
        { revalidateOnFocus: false }
    );

    if (isLoading) return <Skeleton className="h-48" />;
    if (!data) return null;

    const s: Summary | undefined = data.summary;
    const panelUrl = data.clarityProjectId
        ? `https://clarity.microsoft.com/projects/view/${data.clarityProjectId}/dashboard`
        : 'https://clarity.microsoft.com/';

    return (
        <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
                <div>
                    <CardTitle className="text-base">Fricción y comportamiento</CardTitle>
                    <CardDescription>
                        De Microsoft Clarity: dónde la gente se frustra o se va. Es lo que GA4 y la
                        búsqueda no ven. Cada número es el % de sesiones que tuvo esa fricción.
                    </CardDescription>
                </div>
                {data.connected && (
                    <a
                        href={panelUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                        Grabaciones y heatmaps
                        <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>
                )}
            </CardHeader>

            <CardContent>
                {!data.connected ? (
                    <div className="flex flex-col items-start gap-2 text-sm">
                        <Badge variant="outline" className="text-muted-foreground">sin conectar</Badge>
                        <p className="text-muted-foreground">
                            Conectá el token de la Data Export API de Clarity en la edición del sitio.
                            Lo generás en Clarity → Settings → Data Export. Los datos empiezan a juntarse
                            desde ese día: la API no permite traer historia hacia atrás.
                        </p>
                    </div>
                ) : !data.hasData ? (
                    <div className="flex flex-col items-start gap-2 text-sm">
                        <Badge variant="warning">juntando datos</Badge>
                        <p className="text-muted-foreground">
                            Clarity está conectado, pero todavía no hay días cargados en este período.
                            El ETL trae una ventana de ~24&nbsp;h por día; el histórico se arma hacia
                            adelante. Mientras tanto, las grabaciones ya están en el panel de Clarity.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <Friction icon={MousePointerClick} label="Rage clicks" value={s!.rageClickPct}
                                hint="clicks de frustración" warnAt={3} badAt={8} />
                            <Friction icon={MousePointer} label="Dead clicks" value={s!.deadClickPct}
                                hint="clicks que no hacen nada" warnAt={10} badAt={25} />
                            <Friction icon={Undo2} label="Quickback" value={s!.quickbackPct}
                                hint="entró y se volvió enseguida" warnAt={20} badAt={35} />
                            <Friction icon={Bug} label="Errores de script" value={s!.scriptErrorPct}
                                hint="sesiones con fallos JS" warnAt={5} badAt={15} />
                        </div>

                        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t pt-3 text-sm text-muted-foreground">
                            {s!.avgScrollDepth !== null && (
                                <span>Scroll promedio: <span className="font-medium text-foreground tabular-nums">{Math.round(s!.avgScrollDepth)}%</span></span>
                            )}
                            {s!.avgActiveTime !== null && (
                                <span className="inline-flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    Tiempo activo: <span className="font-medium text-foreground tabular-nums">{formatDuration(s!.avgActiveTime)}</span>
                                </span>
                            )}
                            {s!.pagesPerSession !== null && (
                                <span>Páginas/sesión: <span className="font-medium text-foreground tabular-nums">{s!.pagesPerSession.toFixed(1).replace('.', ',')}</span></span>
                            )}
                            <span>Sesiones (Clarity): <span className="font-medium text-foreground tabular-nums">{formatNumber(s!.sessions)}</span></span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
