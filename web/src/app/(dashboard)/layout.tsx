import { Suspense } from 'react';
import { Nav } from '@/components/nav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-muted/30">
            {/* El Nav usa useSearchParams (para el proyecto activo): necesita un límite de
                Suspense o Next falla el prerender de todas las páginas del layout. */}
            <Suspense fallback={<div className="h-14 border-b bg-background" />}>
                <Nav />
            </Suspense>
            <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">{children}</main>
        </div>
    );
}
