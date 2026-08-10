import { Suspense } from 'react';
import { DashboardsClient } from '@/components/dashboards-client';

export const metadata = { title: 'Dashboards · Cenit' };

export default function DashboardsPage() {
    return (
        <Suspense>
            <DashboardsClient />
        </Suspense>
    );
}
