'use client';

import { Line, LineChart, ResponsiveContainer } from 'recharts';

/** Mini serie de la tabla del overview (sin ejes ni tooltip). */
export function Sparkline({ values, color = 'hsl(var(--chart-1))' }: { values: number[]; color?: string }) {
    if (!values.length) return <div className="h-8 w-28" />;
    const data = values.map((v, i) => ({ i, v }));
    return (
        <div className="h-8 w-28">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                    <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
