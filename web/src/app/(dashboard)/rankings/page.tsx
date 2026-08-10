import { Suspense } from 'react';
import { RankingsClient } from '@/components/rankings-client';

export const metadata = { title: 'Rankings · Cenit' };

export default function RankingsPage() {
    return (
        <Suspense>
            <RankingsClient />
        </Suspense>
    );
}
