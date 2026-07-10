import sequelize from './sequelize.js';
import '../models/index.js';
import Site from '../models/Site.js';

/**
 * Seed idempotente: asegura los sitios del portfolio (nombre + dominio canónico).
 * El mapeo a GA4/GSC se completa después desde la pantalla de settings (discovery).
 * Uso (dentro del contenedor): node db/seed.js   ·   o `make seed`.
 */

const SITES = [
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
];

(async () => {
    try {
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
