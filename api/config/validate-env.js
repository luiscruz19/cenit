import CONFIG from './config.js';

/**
 * Valida la configuración crítica al arrancar. Si falta algo sin lo cual la app no puede
 * funcionar de forma segura, corta con un mensaje claro en vez de fallar tarde y confuso
 * (un 500 en el primer login, un token cifrado con clave vacía, etc.).
 *
 * Se llama una vez en index.js, antes de escuchar.
 */
const checks = [
    { ok: () => CONFIG.SECRET_KEY && !['change-me', 'token'].includes(CONFIG.SECRET_KEY),
      msg: 'SECRET_KEY no está seteada (o quedó en un placeholder inseguro). Es la clave que firma los JWT.' },
    { ok: () => CONFIG.TOKEN_ENCRYPTION_KEY && CONFIG.TOKEN_ENCRYPTION_KEY.length >= 32,
      msg: 'TOKEN_ENCRYPTION_KEY falta o es corta (hex de 32 bytes). Cifra los tokens de Google y Clarity.' },
    { ok: () => CONFIG.DATABASE && CONFIG.DATABASE.NAME && CONFIG.DATABASE.HOST,
      msg: 'Config de base de datos incompleta (DB_NAME / DB_HOST).' },
    { ok: () => CONFIG.GOOGLE && CONFIG.GOOGLE.CLIENT_ID && CONFIG.GOOGLE.CLIENT_SECRET,
      msg: 'Credenciales de Google OAuth incompletas (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).' },
    { ok: () => CONFIG.ALLOWED_EMAILS && CONFIG.ALLOWED_EMAILS.length > 0,
      msg: 'ALLOWED_EMAILS está vacío: nadie podría iniciar sesión.' },
];

/** Avisos que no cortan el arranque, pero conviene ver (funcionalidad degradada). */
const warnings = [
    { ok: () => Boolean(CONFIG.MAIL && CONFIG.MAIL.HOST),
      msg: 'SMTP no configurado: alertas y reportes no se enviarán por email.' },
];

export const validateEnv = () => {
    const failed = checks.filter((c) => !c.ok()).map((c) => c.msg);
    if (failed.length > 0) {
        console.error('\n✗ Configuración inválida. La API no puede arrancar:\n');
        for (const m of failed) console.error(`  · ${m}`);
        console.error('\nRevisá api/.env (o el entorno del contenedor) y volvé a levantar.\n');
        process.exit(1);
    }
    for (const w of warnings) {
        if (!w.ok()) console.warn(`⚠ ${w.msg}`);
    }
    console.info('✓ Configuración validada.');
};

export default validateEnv;
