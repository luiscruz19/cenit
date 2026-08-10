import { Suspense } from 'react';
import { HealthClient } from '@/components/health-client';

export default function SaludPage() {
    return (
        <Suspense>
            <HealthClient />
        </Suspense>
    );
}
