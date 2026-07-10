'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
    GLOSSARY, CATEGORY_LABELS, CATEGORY_ORDER, GLOSSARY_UPDATED_AT,
    type GlossaryTerm,
} from '@/lib/glossary';
import { formatDate } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

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
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Glosario</h1>
                    <p className="text-sm text-muted-foreground">
                        Qué significa cada término del dashboard, en criollo. Actualizado el {formatDate(GLOSSARY_UPDATED_AT)}.
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
                <p className="rounded-md border bg-background px-3 py-8 text-center text-sm text-muted-foreground">
                    No hay términos que coincidan con “{q}”.
                </p>
            )}

            {CATEGORY_ORDER.map((cat) => {
                const terms = byCategory.get(cat);
                if (!terms || terms.length === 0) return null;
                return (
                    <section key={cat} className="flex flex-col gap-3">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            {CATEGORY_LABELS[cat]}
                        </h2>
                        <div className="grid gap-3 md:grid-cols-2">
                            {terms.map((t) => (
                                <Card key={t.slug} id={t.slug} className="scroll-mt-20">
                                    <CardContent className="p-4">
                                        <h3 className="font-medium">{t.term}</h3>
                                        <p className="mt-1.5 text-sm text-muted-foreground">{t.long}</p>
                                        {t.formula && (
                                            <p className="mt-2 inline-block rounded bg-muted px-2 py-1 font-mono text-xs">
                                                {t.formula}
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
