'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
    GLOSSARY, CATEGORY_LABELS, CATEGORY_ORDER, GLOSSARY_UPDATED_AT,
    type GlossaryTerm,
} from '@/lib/glossary';
import { formatDate } from '@/lib/format';
import { Input } from '@/components/ui/input';

const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * Un glosario es una lista de definiciones, así que se compone como tal: <dl>/<dt>/<dd>.
 * Estaba hecho como grilla de cards, que es el reflejo de template: contenido homogéneo
 * y comparable metido en cajas iguales, donde ninguna decide nada sobre jerarquía.
 * La lista de definiciones además es lo correcto semánticamente para un lector de pantalla.
 */
export function GlossaryClient() {
    const [q, setQ] = useState('');

    const filtered = useMemo(() => {
        const query = norm(q.trim());
        if (!query) return GLOSSARY;
        return GLOSSARY.filter((t) =>
            norm(t.term).includes(query) ||
            norm(t.short).includes(query) ||
            norm(t.long).includes(query)
        );
    }, [q]);

    const byCategory = useMemo(() => {
        const map = new Map<string, GlossaryTerm[]>();
        for (const t of filtered) {
            const arr = map.get(t.category) || [];
            arr.push(t);
            map.set(t.category, arr);
        }
        return map;
    }, [filtered]);

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Glosario</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Qué significa cada término del dashboard, en criollo.
                        Actualizado el {formatDate(GLOSSARY_UPDATED_AT)}.
                    </p>
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Buscar término…"
                        className="pl-8"
                    />
                </div>
            </div>

            {filtered.length === 0 && (
                <p className="border-t py-12 text-center text-sm text-muted-foreground">
                    No hay términos que coincidan con “{q}”.
                </p>
            )}

            {CATEGORY_ORDER.map((cat) => {
                const terms = byCategory.get(cat);
                if (!terms || terms.length === 0) return null;
                return (
                    <section key={cat} className="flex flex-col">
                        <h2 className="border-b border-foreground pb-2 text-lg font-semibold">
                            {CATEGORY_LABELS[cat]}
                        </h2>

                        <dl className="flex flex-col">
                            {terms.map((t) => (
                                <div
                                    key={t.slug}
                                    id={t.slug}
                                    className="scroll-mt-20 border-b py-5 last:border-0 sm:grid sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-8"
                                >
                                    <dt className="font-display text-base font-medium">
                                        {t.term}
                                    </dt>
                                    <dd className="mt-1 max-w-[68ch] text-sm leading-relaxed text-muted-foreground sm:mt-0">
                                        {t.long}
                                        {t.formula && (
                                            <span className="mt-2 block font-mono text-xs text-foreground">
                                                {t.formula}
                                            </span>
                                        )}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                );
            })}
        </div>
    );
}
