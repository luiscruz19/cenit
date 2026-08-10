'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import {
    BarChart3, Settings, LogOut, AlertTriangle, ShieldAlert, Search, Lightbulb, BookOpen,
    TrendingUp, Table2, Link2, Wrench, ChevronDown, Bell, FileText, LayoutDashboard,
} from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { cn } from '@/utils/shadcn';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Enlaces principales, siempre visibles. */
const LINKS = [
    { href: '/', label: 'Overview', icon: BarChart3, match: (p: string) => p === '/' || p.startsWith('/sites') },
    { href: '/salud', label: 'Salud', icon: ShieldAlert, match: (p: string) => p.startsWith('/salud') },
    { href: '/alertas', label: 'Alertas', icon: Bell, match: (p: string) => p.startsWith('/alertas') },
    { href: '/rankings', label: 'Rankings', icon: TrendingUp, match: (p: string) => p.startsWith('/rankings') },
    { href: '/oportunidades', label: 'Oportunidades', icon: Search, match: (p: string) => p.startsWith('/oportunidades') },
    { href: '/estrategias', label: 'Estrategias', icon: Lightbulb, match: (p: string) => p.startsWith('/estrategias') },
];

/** Herramientas puntuales, agrupadas para que la barra no se desborde. */
const TOOLS = [
    { href: '/reportes', label: 'Reportes', icon: FileText, hint: 'PDF y envíos programados' },
    { href: '/dashboards', label: 'Dashboards', icon: LayoutDashboard, hint: 'Tu propia vista de widgets' },
    { href: '/explorer', label: 'Explorer', icon: Table2, hint: 'Armá tu propia tabla' },
    { href: '/utm', label: 'UTM Builder', icon: Link2, hint: 'URLs etiquetadas para campañas' },
    { href: '/glosario', label: 'Glosario', icon: BookOpen, hint: 'Qué significa cada término' },
];

export function Nav() {
    const pathname = usePathname();
    const { data: me } = useSWR('/auth/me', fetcher, { revalidateOnFocus: false });
    const { data: health } = useSWR('/insights/health', fetcher, { revalidateOnFocus: false });
    const revoked = me?.googleStatus === 'revoked';
    const critical = health?.summary?.critical || 0;

    const toolsActive = TOOLS.some((t) => pathname.startsWith(t.href));

    const linkClass = (active: boolean) => cn(
        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground',
        active && 'bg-muted font-medium text-foreground'
    );

    return (
        <header className="sticky top-0 z-40 border-b bg-background">
            <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4 sm:px-6">
                <Link href="/" className="text-sm font-semibold tracking-tight">
                    Cenit
                </Link>
                <nav className="flex items-center gap-0.5">
                    {LINKS.map(({ href, label, icon: Icon, match }) => (
                        <Link key={href} href={href} className={linkClass(match(pathname))}>
                            <Icon className="h-4 w-4" />
                            <span className="hidden lg:inline">{label}</span>
                            {href === '/salud' && critical > 0 && (
                                <span className="ml-0.5 rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white tabular-nums">
                                    {critical}
                                </span>
                            )}
                        </Link>
                    ))}

                    <DropdownMenu>
                        <DropdownMenuTrigger className={linkClass(toolsActive)}>
                            <Wrench className="h-4 w-4" />
                            <span className="hidden lg:inline">Herramientas</span>
                            <ChevronDown className="h-3 w-3 opacity-60" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                            {TOOLS.map(({ href, label, icon: Icon, hint }) => (
                                <DropdownMenuItem key={href} asChild>
                                    <Link href={href} className="flex cursor-pointer items-start gap-2">
                                        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                                        <span className="flex flex-col">
                                            <span className="font-medium">{label}</span>
                                            <span className="text-xs text-muted-foreground">{hint}</span>
                                        </span>
                                    </Link>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Link href="/settings" className={linkClass(pathname.startsWith('/settings'))}>
                        <Settings className="h-4 w-4" />
                        <span className="hidden lg:inline">Configuración</span>
                    </Link>
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
                        <span className="hidden text-xs text-muted-foreground xl:block">{me.user.email}</span>
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
