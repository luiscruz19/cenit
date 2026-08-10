import dotenv from 'dotenv';

dotenv.config();

const CONFIG = {
    PORT: process.env.API_PORT || 80,
    SECRET_KEY: process.env.SECRET_KEY || 'token',
    DATABASE: {
        HOST: process.env.DB_HOST || 'localhost',
        USER: process.env.DB_USER || 'root',
        PASSWORD: process.env.DB_ROOT_PASSWORD || '',
        NAME: process.env.DB_NAME || 'CENIT',
        PORT: process.env.DB_PORT || 3306,
        DIALECT: process.env.DB_DIALECT || 'mysql'
    },
    GOOGLE: {
        CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
        CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
        REDIRECT_URI: process.env.OAUTH_REDIRECT_URI || 'http://localhost:4100/api/auth/callback',
        // openid/email/profile para identificar al usuario; los readonly para las APIs de datos.
        SCOPES: [
            'openid',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/analytics.readonly',
            'https://www.googleapis.com/auth/webmasters.readonly',
        ],
    },
    // Emails habilitados a entrar al dashboard (normalizados a minúsculas).
    ALLOWED_EMAILS: (process.env.ALLOWED_EMAILS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    // 32 bytes en hex para AES-256-GCM (cifrado del refresh token de Google).
    TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY || '',
    ETL: {
        CRON: process.env.ETL_CRON || '0 5 * * *',
        GSC_LAG_DAYS: parseInt(process.env.GSC_LAG_DAYS, 10) || 3,
        TOP_N: parseInt(process.env.TOP_N, 10) || 20,
        BACKFILL_MONTHS: parseInt(process.env.BACKFILL_MONTHS, 10) || 16,
        CONCURRENCY: parseInt(process.env.ETL_CONCURRENCY, 10) || 3,
    },
    // SMTP para alertas y envíos de reportes. Sin esto, las alertas se registran igual
    // pero no se notifican (el sistema degrada, no falla).
    MAIL: {
        HOST: process.env.SMTP_HOST || '',
        PORT: parseInt(process.env.SMTP_PORT, 10) || 587,
        USER: process.env.SMTP_USER || '',
        PASS: process.env.SMTP_PASS || '',
        FROM: process.env.SMTP_FROM || 'Cenit <no-reply@localhost>',
    },
    ALERTS: {
        // Corre después del ETL diario: primero entran los datos, después se evalúan.
        CRON: process.env.ALERTS_CRON || '30 5 * * *',
    },
    REPORTS: {
        // Cada hora en punto: el job revisa qué reportes caen en esta hora.
        CRON: process.env.REPORTS_CRON || '0 * * * *',
    },
    PERF: {
        // PageSpeed diario, en su propia hora (es lento).
        CRON: process.env.PERF_CRON || '15 6 * * *',
    },
    // API key de PageSpeed Insights (opcional pero recomendada para correr los 21 sitios
    // sin toparse con el límite anónimo). Si falta, se usa el token de Google.
    PAGESPEED_API_KEY: process.env.PAGESPEED_API_KEY || '',
    // URL pública del dashboard, para los links de los emails.
    APP_URL: process.env.APP_URL || 'http://localhost:4100',
    TZ: process.env.TZ || 'America/Argentina/Buenos_Aires',
};

export default CONFIG;
