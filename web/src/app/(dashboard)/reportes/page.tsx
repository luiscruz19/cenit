import { Suspense } from 'react';
import { ReportsClient } from '@/components/reports-client';

export const metadata = { title: 'Reportes · Cenit' };

export default function ReportesPage() {
    return (
        <Suspense>
            <ReportsClient />
        </Suspense>
    );
}
