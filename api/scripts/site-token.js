/**
 * Tokens de acceso de un sitio a su resumen (GET /site-summary).
 *
 *   node scripts/site-token.js crear <dominio> "<para qué>"   muestra el token UNA vez
 *   node scripts/site-token.js listar
 *   node scripts/site-token.js revocar <id>
 *
 * Con --guardar-en <archivo> <VARIABLE>, «crear» no muestra el token: lo escribe en ese archivo
 * como VARIABLE=token (reemplaza la línea si ya existe). Sirve para cargarlo en un .env sin que
 * pase por la pantalla.
 */
import fs from 'node:fs';
import sequelize from '../db/sequelize.js';
import { Site, SiteToken } from '../models/index.js';
import { newToken, hashToken } from '../services/site-summary/site-summary.shape.js';

const [accion, ...args] = process.argv.slice(2);
const guardar = args.indexOf('--guardar-en');
const destino = guardar >= 0 ? { archivo: args[guardar + 1], variable: args[guardar + 2] } : null;
const posicionales = guardar >= 0 ? args.slice(0, guardar) : args;

const salir = async (codigo, mensaje) => {
    if (mensaje) { (codigo ? console.error : console.info)(mensaje); }
    await sequelize.close();
    process.exit(codigo);
};

await SiteToken.sync(); // solo crea la tabla si no existe

if (accion === 'crear') {
    const [dominio, nombre] = posicionales;
    if (!dominio || !nombre) { await salir(1, 'Uso: crear <dominio> "<para qué>" [--guardar-en <archivo> <VARIABLE>]'); }
    const site = await Site.findOne({ attributes: ['id', 'domain'], where: { domain: dominio } });
    if (!site) { await salir(1, `No hay un sitio con el dominio ${dominio}.`); }
    const token = newToken();
    const fila = await SiteToken.create({ site_id: site.id, name: nombre, token_hash: hashToken(token) });
    if (destino) {
        const actual = fs.existsSync(destino.archivo) ? fs.readFileSync(destino.archivo, 'utf8') : '';
        const linea = `${destino.variable}=${token}`;
        const patron = new RegExp(`^${destino.variable}=.*$`, 'm');
        // Archivo nuevo o vacío: solo la línea (sin una línea en blanco adelante).
        const resto = actual && !actual.endsWith('\n') ? `${actual}\n` : actual;
        fs.writeFileSync(destino.archivo, patron.test(actual) ? actual.replace(patron, linea) : `${resto}${linea}\n`);
        await salir(0, `Token #${fila.id} de ${dominio} guardado en ${destino.archivo} (${destino.variable}).`);
    }
    await salir(0, `Token #${fila.id} de ${dominio} («${nombre}»). Se muestra solo esta vez:\n${token}`);
} else if (accion === 'listar') {
    const filas = await SiteToken.findAll({ include: [{ model: Site, as: 'site', attributes: ['domain'] }], order: [['id', 'ASC']] });
    for (const t of filas) {
        console.info(`#${t.id}\t${t.site?.domain}\t${t.name}\tusado: ${t.last_used_at?.toISOString() ?? 'nunca'}\t${t.revoked_at ? 'REVOCADO' : 'activo'}`);
    }
    await salir(0, filas.length ? '' : 'No hay tokens.');
} else if (accion === 'revocar') {
    const fila = await SiteToken.findByPk(Number(posicionales[0]));
    if (!fila) { await salir(1, `No existe el token #${posicionales[0]}.`); }
    await fila.update({ revoked_at: new Date() });
    await salir(0, `Token #${fila.id} revocado.`);
} else {
    await salir(1, 'Uso: node scripts/site-token.js crear|listar|revocar …');
}
