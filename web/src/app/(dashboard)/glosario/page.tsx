import { Suspense } from 'react';
import { GlossaryClient } from '@/components/glossary-client';

export const metadata = { title: 'Glosario · Cenit' };

export default function GlosarioPage() {
    return (
        <Suspense>
            <GlossaryClient />
        </Suspense>
    );
}
