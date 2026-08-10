import { validateEnv } from './config/validate-env.js';

// Antes de todo: si falta config crítica, cortar acá con un mensaje claro.
validateEnv();

const app = (await import('./www/app.js')).default;
await import('./db/connection.js');
await import('./jobs/index.js');
const CONFIG = (await import('./config/config.js')).default;

const PORT = CONFIG.PORT;

// Una excepción o promesa sin atrapar no debe tumbar el proceso en silencio: se loguea.
process.on('unhandledRejection', (reason) => {
    console.error('[fatal] unhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('[fatal] uncaughtException:', err);
});

app.listen(PORT, () => {
    console.info('');
    console.info('-'.repeat(80));
    console.info(`API de cenit corriendo en "http://localhost:${PORT}"`);
    console.info('-'.repeat(80));
    console.info('');
});
