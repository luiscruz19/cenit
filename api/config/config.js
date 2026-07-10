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
    TZ: process.env.TZ || 'America/Argentina/Buenos_Aires',
};

export default CONFIG;
