'use client';

import {
    CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { formatDateShort, formatPosition } from '@/lib/format';

type Point = { date: string; position: number | null };

/**
 * Serie diaria de posición de una consulta. El eje Y va invertido a propósito: en
 * posición, bajar es mejor, así que arriba queda el puesto 1. Las bandas marcan
 * el top 3, el top 10 y la página 2.
 */
export function PositionChart({ data, height = 240 }: { data: Point[]; height?: number }) {
    const positions = data.map((d) => d.position).filter((p): p is number => p !== null);
    const worst = positions.length ? Math.max(...positions) : 20;
    // Deja un poco de aire abajo, pero nunca menos que la página 2 para que las bandas se vean.
    const maxY = Math.max(Math.ceil(worst + 2), 12);

    return (
        <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <ReferenceArea y1={0} y2={3} fill="hsl(142 71% 45%)" fillOpacity={0.07} />
                <ReferenceArea y1={3} y2={10} fill="hsl(142 71% 45%)" fillOpacity={0.03} />
                <ReferenceArea y1={10} y2={20} fill="hsl(38 92% 50%)" fillOpacity={0.05} />
                <XAxis
                    dataKey="date"
                    tickFormatter={formatDateShort}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                />
                <YAxis
                    reversed
                    domain={[1, maxY]}
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                />
                <Tooltip
                    labelFormatter={(label: string) => formatDateShort(label)}
                    formatter={(value: number) => [formatPosition(value), 'Posición']}
                    contentStyle={{ borderRadius: 8, borderColor: 'hsl(var(--border))', fontSize: 12 }}
                />
                <Line
                    type="monotone"
                    dataKey="position"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
