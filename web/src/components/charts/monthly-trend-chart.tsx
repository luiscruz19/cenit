'use client';

import {
    Bar, ComposedChart, Line, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts';
import { formatNumber } from '@/lib/format';

type Row = { ym: string; sessions: number | null; clicks: number | null };

const monthLabel = (ym: string) => {
    const [y, m] = ym.split('-');
    return `${m}/${y.slice(2)}`;
};

/** Tendencia larga (16 meses): sesiones (barras, GA4) + clicks de búsqueda (línea, GSC). */
export function MonthlyTrendChart({ data }: { data: Row[] }) {
    return (
        <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="ym" tickFormatter={monthLabel} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => formatNumber(v)} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => formatNumber(v)} />
                <Tooltip
                    labelFormatter={monthLabel}
                    formatter={(value: number, name: string) => [formatNumber(value), name === 'sessions' ? 'Sesiones (GA4)' : 'Clicks (GSC)']}
                    contentStyle={{ borderRadius: 8, borderColor: 'hsl(var(--border))', fontSize: 12 }}
                />
                <Legend formatter={(v) => (v === 'sessions' ? 'Sesiones (GA4)' : 'Clicks (GSC)')} wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="sessions" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                <Line yAxisId="right" type="monotone" dataKey="clicks" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
            </ComposedChart>
        </ResponsiveContainer>
    );
}
