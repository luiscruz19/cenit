import { Suspense } from 'react';
import { HomeGate } from '@/components/home-gate';

export default function HomePage() {
    return (
        <Suspense>
            <HomeGate />
        </Suspense>
    );
}
