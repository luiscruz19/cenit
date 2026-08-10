import cron from 'node-cron';
import CONFIG from '../config/config.js';
import { runEtl, hasActiveRun } from '../services/etl/runner.service.js';
import { notifyEtlResult } from '../services/etl/etl-notify.service.js';

const { ETL, TZ } = CONFIG;

export async function runDailyEtl() {
    if (await hasActiveRun()) {
        console.warn('[cron][etl-daily] ya hay una corrida activa; se saltea');
        return;
    }
    console.info('[cron][etl-daily] disparando ETL diario (GA4 + GSC + Clarity)');
    // background:false para esperar el final y poder avisar si algo salió mal.
    const run = await runEtl({ triggerType: 'cron', source: 'all', background: false });
    try {
        const result = await notifyEtlResult(run.id);
        if (result.notified) console.info(`[cron][etl-daily] aviso de problemas enviado (corrida #${run.id})`);
    } catch (error) {
        console.error('[cron][etl-daily] no se pudo enviar el aviso:', error.message);
    }
}

export default function scheduleDailyEtl() {
    cron.schedule(ETL.CRON, runDailyEtl, { timezone: TZ });
}
