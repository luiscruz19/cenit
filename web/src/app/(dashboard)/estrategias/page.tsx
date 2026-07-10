import { Suspense } from 'react';
import { StrategiesClient } from '@/components/strategies-client';

export const metadata = { title: 'Estrategias · Cenit' };

export default function EstrategiasPage() {
    return (
        <Suspense>
            <StrategiesClient />
        </Suspense>
    );
}
