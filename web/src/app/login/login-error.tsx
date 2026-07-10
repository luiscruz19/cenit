'use client';

import { useSearchParams } from 'next/navigation';

const MESSAGES: Record<string, string> = {
    forbidden: 'Tu cuenta de Google no está habilitada para este dashboard.',
    needs_consent: 'Google no devolvió el permiso offline. Volvé a intentar el login.',
    cancelled: 'El login fue cancelado.',
    api_down: 'No se pudo contactar a la API. ¿Está levantado el proyecto?',
    config: 'Falta configurar las credenciales de Google en api/.env (ver README).',
    unknown: 'No se pudo completar el login. Probá de nuevo.',
};

export function LoginError() {
    const params = useSearchParams();
    const error = params.get('error');
    if (!error) return null;
    return (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
            {MESSAGES[error] || MESSAGES.unknown}
        </p>
    );
}
