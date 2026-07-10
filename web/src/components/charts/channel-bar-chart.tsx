'use client';

import {
    Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { formatNumber } from '@/lib/format';

type Row = { channel: string; sessions: number; prevSessions: number };

/** Sesiones por canal: período actual vs anterior (barras horizontales). */
export function ChannelBarChart({ data }: { data: Row[] }) {
    const height = Math.max(160, data.length * 44);
    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={(v: number) => formatNumber(v)} />
                <YAxis type="category" dataKey="channel" width={110} tick={{ fontSize: 11 }}
                    tickLine={false} axisLine={false} />
                <Tooltip
                    formatter={(value: number, name: string) => [
                        formatNumber(value),
                        name === 'sessions' ? 'Período actual' : 'Período anterior',
                    ]}
                    contentStyle={{ borderRadius: 8, borderColor: 'hsl(var(--border))', fontSize: 12 }}
                />
                <Bar dataKey="sessions" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} barSize={12} isAnimationActive={false} />
                <Bar dataKey="prevSessions" fill="hsl(var(--muted-foreground) / 0.35)" radius={[0, 4, 4, 0]} barSize={12} isAnimationActive={false} />
            </BarChart>
        </ResponsiveContainer>
    );
}
