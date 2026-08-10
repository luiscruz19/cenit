'use client';

import { Clock } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Cell = { dow: number; hour: number; sessions: number };

// dow del backend: 0=domingo … 6=sábado. Se muestra de lunes a domingo.
const DAYS = [
    { dow: 1, label: 'Lun' }, { dow: 2, label: 'Mar' }, { dow: 3, label: 'Mié' },
    { dow: 4, label: 'Jue' }, { dow: 5, label: 'Vie' }, { dow: 6, label: 'Sáb' },
    { dow: 0, label: 'Dom' },
];

/** Mapa de calor de sesiones por día de la semana y hora. Cuándo conviene postear o lanzar. */
export function SiteHours({ hours }: { hours: Cell[] }) {
    if (!hours || hours.length === 0) return null;

    const map = new Map<string, number>();
    let max = 0;
    for (const c of hours) {
        map.set(`${c.dow}-${c.hour}`, c.sessions);
        if (c.sessions > max) max = c.sessions;
    }
    if (max === 0) return null;

    // Pico: el momento con más sesiones.
    const peak = hours.reduce((a, c) => (c.sessions > a.sessions ? c : a), hours[0]);
    const peakDay = DAYS.find((d) => d.dow === peak.dow)?.label || '';

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Cuándo entra la gente
                </CardTitle>
                <CardDescription>
                    Sesiones por día y hora. El pico es los <span className="font-medium">{peakDay}</span> alrededor
                    de las <span className="font-medium">{String(peak.hour).padStart(2, '0')}:00</span> — buen momento para postear o lanzar campañas.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <div className="min-w-[560px]">
                        {/* Encabezado de horas */}
                        <div className="mb-1 flex gap-[2px] pl-8">
                            {Array.from({ length: 24 }).map((_, h) => (
                                <div key={h} className="w-[18px] text-center text-[9px] tabular-nums text-muted-foreground">
                                    {h % 6 === 0 ? h : ''}
                                </div>
                            ))}
                        </div>
                        {DAYS.map((d) => (
                            <div key={d.dow} className="mb-[2px] flex items-center gap-[2px]">
                                <div className="w-8 pr-1 text-right text-[10px] text-muted-foreground">{d.label}</div>
                                {Array.from({ length: 24 }).map((_, h) => {
                                    const v = map.get(`${d.dow}-${h}`) || 0;
                                    const intensity = v / max;
                                    return (
                                        <div
                                            key={h}
                                            className="h-[18px] w-[18px] rounded-[3px]"
                                            style={{
                                                backgroundColor: v === 0
                                                    ? 'hsl(var(--muted))'
                                                    : `hsl(var(--primary) / ${0.12 + intensity * 0.88})`,
                                            }}
                                            title={`${d.label} ${String(h).padStart(2, '0')}:00 · ${formatNumber(v)} sesiones`}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
