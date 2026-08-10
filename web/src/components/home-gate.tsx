'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { resolveCurrentSite } from '@/lib/current-site';
import { NewSiteDialog } from '@/components/new-site-dialog';
import { EmptyState } from '@/components/ui/states';
import { Skeleton } from '@/components/ui/skeleton';
import { LayoutGrid } from 'lucide-react';

/**
 * La app vive siempre dentro de un proyecto: no hay vista global. El home resuelve el
 * proyecto actual (URL → guardado → primero) y entra directo a su vista completa. Si todavía
 * no hay proyectos, muestra el onboarding para crear el primero.
 */
export function HomeGate() {
    const router = useRouter();
    const { data, isLoading, error, mutate } = useSWR('/sites', fetcher);
    const sites = (data?.sites || []).filter((s: any) => s.is_active);

    useEffect(() => {
        if (isLoading || error) return;
        const current = resolveCurrentSite(sites);
        if (current) router.replace(`/sites/${current}?period=28d`);
    }, [isLoading, error, sites, router]);

    if (!isLoading && !error && sites.length === 0) {
        return (
            <EmptyState
                icon={LayoutGrid}
                title="Todavía no hay proyectos"
                description="Agregá el primer proyecto con su dominio y su propiedad de Google Analytics y Search Console. En cuanto el ETL traiga datos, vas a ver su tablero completo."
                action={<NewSiteDialog onCreated={() => mutate()} />}
            />
        );
    }

    // Mientras resuelve y redirige.
    return (
        <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-64" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[86px]" />)}
            </div>
            <Skeleton className="h-80" />
        </div>
    );
}
