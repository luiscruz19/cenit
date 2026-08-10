'use client';

import { formatNumber, formatPosition } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Row = { clicks: number; impressions: number; position: number | null };
type CountryRow = Row & { country: string };
type DeviceRow = Row & { device: string };

const DEVICE_LABEL: Record<string, string> = {
    DESKTOP: 'Escritorio', MOBILE: 'Celular', TABLET: 'Tablet',
};

/** Búsqueda de Google desglosada por país y por dispositivo (Search Console). */
export function SiteSearchBreakdown({
    countries, devices,
}: {
    countries: CountryRow[];
    devices: DeviceRow[];
}) {
    if ((!countries || countries.length === 0) && (!devices || devices.length === 0)) return null;

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Búsqueda por país</CardTitle>
                </CardHeader>
                <CardContent>
                    {countries.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sin datos en el período.</p>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {countries.slice(0, 6).map((c) => (
                                <li key={c.country} className="flex items-baseline justify-between gap-2 text-sm">
                                    <span className="uppercase">{c.country}</span>
                                    <span className="tabular-nums text-muted-foreground">
                                        {formatNumber(c.clicks)} clicks · pos. {formatPosition(c.position)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Búsqueda por dispositivo</CardTitle>
                </CardHeader>
                <CardContent>
                    {devices.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sin datos en el período.</p>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {devices.map((d) => (
                                <li key={d.device} className="flex items-baseline justify-between gap-2 text-sm">
                                    <span>{DEVICE_LABEL[d.device] || d.device}</span>
                                    <span className="tabular-nums text-muted-foreground">
                                        {formatNumber(d.clicks)} clicks · pos. {formatPosition(d.position)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
