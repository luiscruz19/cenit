'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PERIODS, parsePeriod } from '@/lib/periods';

/** Selector de período global: escribe ?period= en la URL (compartible). */
export function PeriodSelector() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const period = parsePeriod(searchParams.get('period'));

    const onChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('period', value);
        router.replace(`${pathname}?${params.toString()}`);
    };

    return (
        <Tabs value={period} onValueChange={onChange}>
            <TabsList>
                {PERIODS.map((p) => (
                    <TabsTrigger key={p.value} value={p.value}>
                        {p.label}
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    );
}
