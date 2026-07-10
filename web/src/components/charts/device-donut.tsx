'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatNumber } from '@/lib/format';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];
const LABELS: Record<string, string> = { desktop: 'Escritorio', mobile: 'Móvil', tablet: 'Tablet' };

type Row = { device: string; sessions: number };

/** Donut de sesiones por dispositivo, con leyenda propia al costado. */
export function DeviceDonut({ data }: { data: Row[] }) {
    const total = data.reduce((acc, d) => acc + d.sessions, 0);
    return (
        <div className="flex items-center gap-4">
            <div className="h-40 w-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={data} dataKey="sessions" nameKey="device" innerRadius={42} outerRadius={64}
                            paddingAngle={2} isAnimationActive={false}>
                            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip
                            formatter={(value: number, name: string) => [formatNumber(value), LABELS[name] || name]}
                            contentStyle={{ borderRadius: 8, borderColor: 'hsl(var(--border))', fontSize: 12 }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <ul className="flex flex-col gap-1.5 text-sm">
                {data.map((d, i) => (
                    <li key={d.device} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground">{LABELS[d.device] || d.device}</span>
                        <span className="tabular-nums font-medium">
                            {total ? `${Math.round((d.sessions / total) * 100)}%` : '—'}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
