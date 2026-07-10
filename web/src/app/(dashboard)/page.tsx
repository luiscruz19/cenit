import { Suspense } from 'react';
import { OverviewClient } from '@/components/overview-client';

export default function OverviewPage() {
    return (
        <Suspense>
            <OverviewClient />
        </Suspense>
    );
}
