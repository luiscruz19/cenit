'use client';

import Link from 'next/link';
import { HelpCircle } from 'lucide-react';
import { getTerm } from '@/lib/glossary';
import { cn } from '@/utils/shadcn';
import {
    Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Ícono de ayuda (ⓘ) que muestra la definición corta de un término del glosario al
 * pasar el mouse. Lee de la fuente única (@/lib/glossary). Si el slug no existe, no
 * renderiza nada (evita romper si se referencia un término aún no definido).
 *
 * El TooltipProvider vive en el layout raíz: acá no se vuelve a montar uno por ícono.
 */
export function InfoTip({ term, className }: { term: string; className?: string }) {
    const entry = getTerm(term);
    if (!entry) return null;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Link
                    href={`/glosario#${entry.slug}`}
                    aria-label={`Qué es ${entry.term}`}
                    className={cn(
                        'inline-flex text-muted-foreground/60 transition-colors hover:text-foreground',
                        className
                    )}
                >
                    <HelpCircle className="h-3.5 w-3.5" />
                </Link>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
                <p className="font-medium">{entry.term}</p>
                <p className="mt-0.5 text-primary-foreground/80">{entry.short}</p>
            </TooltipContent>
        </Tooltip>
    );
}
