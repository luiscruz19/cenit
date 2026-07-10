import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginError } from './login-error';

/**
 * Login: un solo botón "Continuar con Google". El mismo consent autentica al
 * usuario (allowlist) y entrega el refresh token para el ETL.
 */
export default function LoginPage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Cenit</CardTitle>
                    <CardDescription>
                        Métricas GA4 + Search Console del portfolio
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <Suspense>
                        <LoginError />
                    </Suspense>
                    <a
                        href="/api/auth/google"
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                    >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                            <path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z" />
                        </svg>
                        Continuar con Google
                    </a>
                    <p className="text-center text-xs text-muted-foreground">
                        Solo cuentas habilitadas pueden acceder.
                    </p>
                </CardContent>
            </Card>
        </main>
    );
}
