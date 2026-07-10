import cron from 'node-cron';
import CONFIG from '../config/config.js';
import { runEtl, hasActiveRun } from '../services/etl/runner.service.js';

const { ETL, TZ } = CONFIG;

export async function runDailyEtl() {
    if (await hasActiveRun()) {
        console.warn('[cron][etl-daily] ya hay una corrida activa; se saltea');
        return;
    }
    console.info('[cron][etl-daily] disparando ETL diario (GA4 + GSC)');
    await runEtl({ triggerType: 'cron', source: 'all' });
}

export default function scheduleDailyEtl() {
    cron.schedule(ETL.CRON, runDailyEtl, { timezone: TZ });
}
