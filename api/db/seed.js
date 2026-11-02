import fs from 'node:fs';
import sequelize from './sequelize.js';
import '../models/index.js';
import Site from '../models/Site.js';

/**
 * Seed idempotente: asegura los sitios del portfolio (nombre + dominio canónico).
 * La lista vive en db/sites.local.json, que no se versiona: son datos de clientes y el repo es público.
 * El mapeo a GA4/GSC se completa después desde la pantalla de settings (discovery).
 * Uso (dentro del contenedor): node db/seed.js   ·   o `make seed`.
 */

const SITES_FILE = new URL('./sites.local.json', import.meta.url);

const loadSites = () => {
    if (!fs.existsSync(SITES_FILE)) {
        throw new Error('Falta db/sites.local.json: copiá db/sites.example.json y completalo.');
    }
    return JSON.parse(fs.readFileSync(SITES_FILE, 'utf8'));
};

(async () => {
    try {
        const SITES = loadSites();
        await sequelize.authenticate();
        await sequelize.sync();

        let created = 0;
        for (const site of SITES) {
            const [, wasCreated] = await Site.findOrCreate({
                where: { domain: site.domain },
                defaults: site,
            });
            if (wasCreated) created++;
        }

        console.info(`✓ Sitios asegurados: ${SITES.length} (${created} nuevos)`);
        console.info('Seed completado.');
        process.exit(0);
    } catch (error) {
        console.error('Error en el seed:', error.message);
        process.exit(1);
    }
})();
