'use client';

import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';
import { fetcher } from '@/lib/fetcher';
import { parsePeriod } from '@/lib/periods';
import { formatCompact, formatDate } from '@/lib/format';
import { PeriodSelector } from '@/components/period-selector';
import { NewSiteDialog } from '@/components/new-site-dialog';
import { KpiStat } from '@/components/kpi-stat';
import { SitesTable, type OverviewSite } from '@/components/sites-table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { LayoutGrid } from 'lucide-react';

const sum = (sites: OverviewSite[], pick: (s: OverviewSite) => number | undefined | null) =>
    sites.reduce((acc, s) => acc + (pick(s) || 0), 0);

export function OverviewClient() {
    const period = parsePeriod(useSearchParams().get('period'));
    const { data, isLoading, error, mutate } = useSWR(`/metrics/overview?period=${period}`, fetcher);

    const sites: OverviewSite[] = data?.sites || [];
    const range = data?.range;

    const totals = {
        sessions: sum(sites, (s) => s.ga?.sessions),
        sessionsPrev: sum(sites, (s) => s.gaPrev?.sessions),
        sessionsYoy: sum(sites, (s) => s.gaYoy?.sessions),
        users: sum(sites, (s) => s.ga?.users),
        usersPrev: sum(sites, (s) => s.gaPrev?.users),
        usersYoy: sum(sites, (s) => s.gaYoy?.users),
        clicks: sum(sites, (s) => s.gsc?.clicks),
        clicksPrev: sum(sites, (s) => s.gscPrev?.clicks),
        clicksYoy: sum(sites, (s) => s.gscYoy?.clicks),
        impressions: sum(sites, (s) => s.gsc?.impressions),
        impressionsPrev: sum(sites, (s) => s.gscPrev?.impressions),
        impressionsYoy: sum(sites, (s) => s.gscYoy?.impressions),
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Overview del portfolio</h1>
                    {range && (
                        <p className="text-sm text-muted-foreground">
                            {formatDate(range.from)} – {formatDate(range.to)} · vs período anterior
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <NewSiteDialog onCreated={() => mutate()} />
                    <PeriodSelector />
                </div>
            </div>

            {error && <ErrorState message={(error as Error).message} onRetry={() => mutate()} />}

            {isLoading && (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[86px]" />)}
                    </div>
                    <Skeleton className="h-96" />
                </>
            )}

            {/* Primeros pasos: sin sitios cargados, el overview hace de onboarding. */}
            {!isLoading && !error && sites.length === 0 && (
                <EmptyState
                    icon={LayoutGrid}
                    title="Todavía no hay sitios para mostrar"
                    description="Agregá el primer sitio con su dominio y su propiedad de Google Analytics y Search Console. En cuanto el ETL traiga datos, vas a ver acá el resumen de todo el portfolio."
                    action={<NewSiteDialog onCreated={() => mutate()} />}
                />
            )}

            {!isLoading && !error && sites.length > 0 && (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <KpiStat label="Sesiones (GA4)" value={formatCompact(totals.sessions)} term="sesiones"
                            current={totals.sessions} previous={totals.sessionsPrev} yoy={totals.sessionsYoy} />
                        <KpiStat label="Usuarios (GA4)" value={formatCompact(totals.users)} term="usuarios"
                            current={totals.users} previous={totals.usersPrev} yoy={totals.usersYoy} />
                        <KpiStat label="Clicks (Búsqueda)" value={formatCompact(totals.clicks)} term="clicks"
                            current={totals.clicks} previous={totals.clicksPrev} yoy={totals.clicksYoy} />
                        <KpiStat label="Impresiones (Búsqueda)" value={formatCompact(totals.impressions)} term="impresiones"
                            current={totals.impressions} previous={totals.impressionsPrev} yoy={totals.impressionsYoy} />
                    </div>
                    <SitesTable sites={sites} period={period} />
                </>
            )}
        </div>
    );
}
