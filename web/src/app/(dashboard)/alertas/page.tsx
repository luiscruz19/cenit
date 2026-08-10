import { Suspense } from 'react';
import { AlertsClient } from '@/components/alerts-client';

export const metadata = { title: 'Alertas · Cenit' };

export default function AlertasPage() {
    return (
        <Suspense>
            <AlertsClient />
        </Suspense>
    );
}
