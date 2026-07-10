'use client';

import {
    Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { formatDateShort, formatNumber } from '@/lib/format';

type Serie = { key: string; label: string; color: string };

type Props = {
    data: Record<string, unknown>[];
    series: Serie[];
    height?: number;
};

/** Serie temporal diaria (área) para GA4 o GSC. */
export function TimeSeriesChart({ data, series, height = 280 }: Props) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                    {series.map((s) => (
                        <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={s.color} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
                        </linearGradient>
                    ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                    dataKey="date"
                    tickFormatter={formatDateShort}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={48}
                    tickFormatter={(v: number) => formatNumber(v)} />
                <Tooltip
                    labelFormatter={(label: string) => formatDateShort(label)}
                    formatter={(value: number, name: string) => [
                        formatNumber(value),
                        series.find((s) => s.key === name)?.label || name,
                    ]}
                    contentStyle={{ borderRadius: 8, borderColor: 'hsl(var(--border))', fontSize: 12 }}
                />
                {series.map((s) => (
                    <Area
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        stroke={s.color}
                        strokeWidth={2}
                        fill={`url(#fill-${s.key})`}
                        connectNulls
                        isAnimationActive={false}
                    />
                ))}
            </AreaChart>
        </ResponsiveContainer>
    );
}
