import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { deltaPct } from '@/lib/format';
import { cn } from '@/utils/shadcn';
import { InfoTip } from '@/components/info-tip';

type Props = {
    label: string;
    value: string;
    current?: number | null;
    previous?: number | null;
    /** Valor del mismo período un año atrás (YoY). Se muestra como segunda línea. */
    yoy?: number | null;
    /** Para métricas donde bajar es mejor (ej: posición media). */
    invert?: boolean;
    /** Slug del glosario para mostrar el tooltip de ayuda junto al label. */
    term?: string;
};

function Trend({ delta, invert, label }: { delta: number | null; invert: boolean; label: string }) {
    if (delta === null) return null;
    const improved = invert ? delta < 0 : delta > 0;
    const worsened = invert ? delta > 0 : delta < 0;
    const Icon = delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
    return (
        <span
            className={cn(
                'flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums',
                improved && 'bg-emerald-500/10 text-emerald-600',
                worsened && 'bg-red-500/10 text-red-600',
                !improved && !worsened && 'bg-muted text-muted-foreground'
            )}
            title={label}
        >
            <Icon className="h-3 w-3" />
            {`${delta > 0 ? '+' : ''}${(delta * 100).toFixed(1).replace('.', ',')}%`}
        </span>
    );
}

/** KPI con delta % vs el período anterior y, si hay, vs el mismo período del año pasado. */
export function KpiStat({ label, value, current, previous, yoy, invert = false, term }: Props) {
    const delta = deltaPct(current, previous);
    const yoyDelta = deltaPct(current, yoy);

    return (
        <Card>
            <CardContent className="p-4">
                <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {label}
                    {term && <InfoTip term={term} />}
                </p>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                    <span className="text-2xl font-semibold tabular-nums">{value}</span>
                    <Trend delta={delta} invert={invert} label="vs período anterior" />
                </div>
                {yoyDelta !== null && (
                    <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <span>vs. año anterior</span>
                        <Trend delta={yoyDelta} invert={invert} label="vs mismo período del año pasado" />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
