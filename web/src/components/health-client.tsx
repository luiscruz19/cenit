'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ShieldAlert, AlertTriangle, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { formatNumber, formatDate } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { cn } from '@/utils/shadcn';

type Reason = { code: string; label: string };
type Item = {
    id: number; name: string; domain: string;
    level: 'critical' | 'warning' | 'ok';
    reasons: Reason[];
    sessions28: number; sessions90: number;
    lastGaDate: string | null; lastGscDate: string | null;
};

const LEVELS = {
    critical: { label: 'Crítico', icon: ShieldAlert, cls: 'text-red-600', bg: 'bg-red-500/10', border: 'border-red-500/30' },
    warning: { label: 'Atención', icon: AlertTriangle, cls: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
    ok: { label: 'OK', icon: CheckCircle2, cls: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
} as const;

function SummaryCard({ level, count }: { level: keyof typeof LEVELS; count: number }) {
    const L = LEVELS[level];
    const Icon = L.icon;
    return (
        <Card>
            <CardContent className="flex items-center gap-3 p-4">
                <div className={cn('rounded-lg p-2', L.bg)}><Icon className={cn('h-5 w-5', L.cls)} /></div>
                <div>
                    <p className="text-2xl font-semibold tabular-nums">{count}</p>
                    <p className="text-xs text-muted-foreground">{L.label}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function SiteRow({ item }: { item: Item }) {
    const L = LEVELS[item.level];
    return (
        <Card className={cn('border-l-4', L.border)}>
            <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                        <Link href={`/sites/${item.id}`} className="group flex items-center gap-1 font-medium">
                            {item.name}
                            <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
                        </Link>
                        <p className="text-xs text-muted-foreground">{item.domain}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                        <p>{formatNumber(item.sessions90)} sesiones (90d)</p>
                        <p>GA4: {item.lastGaDate ? formatDate(item.lastGaDate) : '—'} · GSC: {item.lastGscDate ? formatDate(item.lastGscDate) : '—'}</p>
                    </div>
                </div>
                <ul className="mt-3 space-y-1.5">
                    {item.reasons.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                            <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', L.cls.replace('text-', 'bg-'))} />
                            {r.label}
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}

export function HealthClient() {
    const siteId = useSearchParams().get('site');
    const { data, isLoading, error, mutate } = useSWR('/insights/health', fetcher);
    // Siempre por proyecto: si viene ?site=, se muestra solo ese; si no, todo el portfolio.
    const allItems: Item[] = data?.items || [];
    const items: Item[] = siteId ? allItems.filter((i) => String(i.id) === siteId) : allItems;
    const problems = items.filter((i) => i.level !== 'ok');
    const healthy = items.filter((i) => i.level === 'ok');
    // Resumen calculado sobre lo que se muestra (así respeta el filtro por proyecto).
    const summary = {
        critical: items.filter((i) => i.level === 'critical').length,
        warning: items.filter((i) => i.level === 'warning').length,
        ok: healthy.length,
    };
    const scopedName = siteId ? (items[0]?.name || null) : null;

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-xl font-semibold tracking-tight">Salud{scopedName ? ` · ${scopedName}` : " del portfolio"}</h1>
                <p className="text-sm text-muted-foreground">
                    Alertas automáticas: tag sin instalar, tráfico caído a cero, sin acceso a Search Console, caídas fuertes y tráfico de baja calidad.
                </p>
            </div>

            {error && <ErrorState message={(error as Error).message} onRetry={() => mutate()} />}

            {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <SummaryCard level="critical" count={summary.critical} />
                        <SummaryCard level="warning" count={summary.warning} />
                        <SummaryCard level="ok" count={summary.ok} />
                    </div>

                    {problems.length > 0 && (
                        <div className="flex flex-col gap-3">
                            <h2 className="text-sm font-semibold text-muted-foreground">Requieren atención ({problems.length})</h2>
                            {problems.map((item) => <SiteRow key={item.id} item={item} />)}
                        </div>
                    )}

                    {healthy.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <h2 className="text-sm font-semibold text-muted-foreground">Sin alertas ({healthy.length})</h2>
                            <div className="flex flex-wrap gap-2">
                                {healthy.map((item) => (
                                    <Link key={item.id} href={`/sites/${item.id}`}>
                                        <Badge variant="outline" className="gap-1 py-1 font-normal hover:bg-muted">
                                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                            {item.name}
                                        </Badge>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
