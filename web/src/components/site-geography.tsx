'use client';

import { Globe } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Row = { country: string; sessions: number };

/** De dónde entra la gente al sitio. Lista de países con barra de participación. */
export function SiteGeography({ countries }: { countries: Row[] }) {
    const rows = (countries || []).filter((c) => c.country && c.country !== '(not set)');
    const total = rows.reduce((a, c) => a + c.sessions, 0);

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    De dónde entran
                </CardTitle>
            </CardHeader>
            <CardContent>
                {rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin datos de país en el período.</p>
                ) : (
                    <ul className="flex flex-col gap-2.5">
                        {rows.slice(0, 8).map((c) => {
                            const share = total ? Math.round((c.sessions / total) * 100) : 0;
                            return (
                                <li key={c.country} className="flex flex-col gap-1">
                                    <div className="flex items-baseline justify-between gap-2 text-sm">
                                        <span className="truncate">{c.country}</span>
                                        <span className="shrink-0 tabular-nums text-muted-foreground">
                                            {formatNumber(c.sessions)} · {share}%
                                        </span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                        <div className="h-full rounded-full bg-primary/70" style={{ width: `${share}%` }} />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
