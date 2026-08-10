import { Suspense } from 'react';
import { UtmClient } from '@/components/utm-client';

export const metadata = { title: 'UTM Builder · Cenit' };

export default function UtmPage() {
    return (
        <Suspense>
            <UtmClient />
        </Suspense>
    );
}
