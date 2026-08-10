'use client';

import { CheckCircle2, Zap, Wrench } from 'lucide-react';
import { recommendFor, type Conversion } from '@/lib/conversions';
import { Badge } from '@/components/ui/badge';

/**
 * Guía por proyecto: qué conversiones conviene medir y cómo configurarlas en GA4. Marca las
 * que el sitio YA está midiendo (para no repetir el trabajo) y explica el paso a paso de las
 * que faltan. Se adapta al tipo de sitio (tienda vs. servicios) por el dominio.
 */
export function SiteConversionsGuide({
    domain, existingEvents,
}: {
    domain: string;
    existingEvents: { event: string; keyEvents: number }[];
}) {
    const configured = new Set((existingEvents || []).map((e) => e.event));
    const recommended = recommendFor(domain);

    return (
        <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
                Recomendadas para este tipo de sitio. Las que ya estás midiendo aparecen marcadas;
                para las que faltan, el paso a paso en Google Analytics.
            </p>
            <div className="flex flex-col divide-y rounded-md border">
                {recommended.map((c: Conversion) => {
                    const done = configured.has(c.event);
                    return (
                        <div key={c.id} className="flex flex-col gap-1.5 p-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">{c.label}</span>
                                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{c.event}</code>
                                {done ? (
                                    <Badge variant="success" className="gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> ya se mide
                                    </Badge>
                                ) : c.auto ? (
                                    <Badge variant="secondary" className="gap-1">
                                        <Zap className="h-3 w-3" /> GA4 lo captura solo
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="gap-1 text-muted-foreground">
                                        <Wrench className="h-3 w-3" /> necesita Tag Manager
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground">{c.whatFor}</p>
                            {!done && (
                                <p className="mt-0.5 text-sm">
                                    <span className="font-medium">Cómo: </span>
                                    <span className="text-muted-foreground">{c.how}</span>
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
