'use client';

import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import { btn } from '@/lib/ui';
import { cn } from '@/utils/shadcn';

/**
 * Estados compartidos: vacío y error. Los estados son parte del trabajo, no un extra —
 * una pantalla en blanco o un error crudo es lo que hace sentir "sin terminar" a un
 * producto. Se usan en todas las pantallas que cargan datos.
 */

export function EmptyState({
    title, description, icon: Icon = Inbox, action, className,
}: {
    title: string;
    description?: string;
    icon?: typeof Inbox;
    action?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn(
            'flex flex-col items-center gap-3 rounded-lg border border-dashed bg-muted/20 px-6 py-14 text-center',
            className
        )}>
            <Icon className="h-8 w-8 text-muted-foreground/70" />
            <div>
                <p className="font-medium">{title}</p>
                {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
            </div>
            {action}
        </div>
    );
}

export function ErrorState({
    message, onRetry, className,
}: {
    message?: string;
    onRetry?: () => void;
    className?: string;
}) {
    return (
        <div className={cn(
            'flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/[0.04] px-6 py-12 text-center',
            className
        )}>
            <AlertTriangle className="h-7 w-7 text-destructive" />
            <div>
                <p className="font-medium">No se pudieron cargar los datos</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    {message || 'Hubo un problema al conectar con el servidor.'}
                </p>
            </div>
            {onRetry && (
                <button className={btn} onClick={onRetry}>
                    <RefreshCw className="h-4 w-4" />
                    Reintentar
                </button>
            )}
        </div>
    );
}
