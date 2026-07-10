import { Suspense } from 'react';
import { SiteDetailClient } from '@/components/site-detail-client';

export default function SiteDetailPage({ params }: { params: { id: string } }) {
    return (
        <Suspense>
            <SiteDetailClient siteId={params.id} />
        </Suspense>
    );
}
