'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Bell, ArrowUpRight } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const severityBadge = (severity: string) => {
    if (severity === 'critical') return <Badge variant="destructive">crítico</Badge>;
    if (severity === 'warning') {
        return <Badge variant="warning">atención</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground">info</Badge>;
};

/** Últimas alertas que se dispararon para ESTE sitio (reglas configuradas por el usuario). */
export function SiteAlerts({ siteId }: { siteId: string }) {
    const { data, isLoading } = useSWR(
        `/alerts/events?siteId=${siteId}&limit=8`,
        fetcher,
        { revalidateOnFocus: false }
    );

    const events = data?.events || [];

    if (isLoading) return <Skeleton className="h-40" />;

    return (
        <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
                <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                        Alertas de este sitio
                    </CardTitle>
                    <CardDescription>
                        Disparos de tus reglas. Es distinto de Salud, que diagnostica sola.
                    </CardDescription>
                </div>
                <Link
                    href="/alertas"
                    className="group inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                    Configurar
                    <ArrowUpRight className="h-3 w-3 opacity-60" />
                </Link>
            </CardHeader>
            <CardContent>
                {events.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Este sitio no disparó ninguna alerta. Si todavía no creaste reglas,
                        podés hacerlo desde <Link href="/alertas" className="underline">Alertas</Link>.
                    </p>
                ) : (
                    <ul className="flex flex-col gap-3">
                        {events.map((e: any) => (
                            <li key={e.id} className="flex flex-col gap-1 border-b pb-2 last:border-0 last:pb-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{e.rule?.name || 'Regla eliminada'}</span>
                                    {severityBadge(e.severity)}
                                    <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                                        {new Date(e.createdAt).toLocaleDateString('es-AR', {
                                            day: '2-digit', month: '2-digit',
                                        })}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">{e.message}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
