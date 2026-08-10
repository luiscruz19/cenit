import { Suspense } from 'react';
import { ExplorerClient } from '@/components/explorer-client';

export const metadata = { title: 'Explorer · Cenit' };

export default function ExplorerPage() {
    return (
        <Suspense>
            <ExplorerClient />
        </Suspense>
    );
}
