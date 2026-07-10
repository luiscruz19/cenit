'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { BarChart3, Settings, LogOut, AlertTriangle, ShieldAlert, Search, Lightbulb, BookOpen } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { cn } from '@/utils/shadcn';

const LINKS = [
    { href: '/', label: 'Overview', icon: BarChart3, match: (p: string) => p === '/' || p.startsWith('/sites') },
    { href: '/salud', label: 'Salud', icon: ShieldAlert, match: (p: string) => p.startsWith('/salud') },
    { href: '/oportunidades', label: 'Oportunidades', icon: Search, match: (p: string) => p.startsWith('/oportunidades') },
    { href: '/estrategias', label: 'Estrategias', icon: Lightbulb, match: (p: string) => p.startsWith('/estrategias') },
    { href: '/glosario', label: 'Glosario', icon: BookOpen, match: (p: string) => p.startsWith('/glosario') },
    { href: '/settings', label: 'Configuración', icon: Settings, match: (p: string) => p.startsWith('/settings') },
];

export function Nav() {
    const pathname = usePathname();
    const { data: me } = useSWR('/auth/me', fetcher, { revalidateOnFocus: false });
    const { data: health } = useSWR('/insights/health', fetcher, { revalidateOnFocus: false });
    const revoked = me?.googleStatus === 'revoked';
    const critical = health?.summary?.critical || 0;

    return (
        <header className="sticky top-0 z-40 border-b bg-background">
            <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-6 px-4 sm:px-6">
                <Link href="/" className="text-sm font-semibold tracking-tight">
                    Cenit
                </Link>
                <nav className="flex items-center gap-1">
                    {LINKS.map(({ href, label, icon: Icon, match }) => (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground',
                                match(pathname) && 'bg-muted font-medium text-foreground'
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                            {href === '/salud' && critical > 0 && (
                                <span className="ml-0.5 rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white tabular-nums">
                                    {critical}
                                </span>
                            )}
                        </Link>
                    ))}
                </nav>
                <div className="ml-auto flex items-center gap-3">
                    {revoked && (
                        <Link
                            href="/settings"
                            className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive"
                        >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Reconectar Google
                        </Link>
                    )}
                    {me?.user?.email && (
                        <span className="hidden text-xs text-muted-foreground sm:block">{me.user.email}</span>
                    )}
                    <form action="/api/auth/logout" method="POST">
                        <button
                            type="submit"
                            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                            title="Cerrar sesión"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </form>
                </div>
            </div>
        </header>
    );
}
