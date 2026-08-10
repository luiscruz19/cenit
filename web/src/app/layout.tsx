import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import '@/styles/globals.css';

/**
 * Tipografías self-hosteadas, a propósito.
 *
 * Se sacó `next/font/google` (Inter) por dos razones: el build depende de una descarga
 * externa que ya falló una vez, y sobre todo porque Inter es el default de todos —usarla
 * es no haber elegido.
 *
 * Cabinet Grotesk para títulos y cifras: geométrica, con carácter, y aguanta los números
 * grandes de los KPI. Switzer para el cuerpo: suiza y neutra, pero con más temperatura
 * que Inter y mejor en tamaños chicos, que es donde vive una herramienta de datos.
 */
const display = localFont({
    src: [
        { path: '../fonts/CabinetGrotesk-500.woff2', weight: '500', style: 'normal' },
        { path: '../fonts/CabinetGrotesk-700.woff2', weight: '700', style: 'normal' },
        { path: '../fonts/CabinetGrotesk-800.woff2', weight: '800', style: 'normal' },
    ],
    variable: '--font-display',
    display: 'swap',
});

const sans = localFont({
    src: [
        { path: '../fonts/Switzer-400.woff2', weight: '400', style: 'normal' },
        { path: '../fonts/Switzer-500.woff2', weight: '500', style: 'normal' },
        { path: '../fonts/Switzer-600.woff2', weight: '600', style: 'normal' },
    ],
    variable: '--font-sans',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'Cenit — métricas del portfolio',
    description: 'Dashboard GA4 + Search Console de los proyectos en producción',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es" className={`${display.variable} ${sans.variable}`}>
            <body className="font-sans antialiased">
                {/* Un solo TooltipProvider para toda la app, en vez de uno por tooltip. */}
                <TooltipProvider delayDuration={150}>
                    {children}
                </TooltipProvider>
                <Toaster />
            </body>
        </html>
    );
}
