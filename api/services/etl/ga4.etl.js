import { runReports } from '../google/ga4.service.js';
import GaDailyMetric from '../../models/GaDailyMetric.js';
import GaDailyChannel from '../../models/GaDailyChannel.js';
import GaDailyPage from '../../models/GaDailyPage.js';
import GaDailyDevice from '../../models/GaDailyDevice.js';
import GaDailyCountry from '../../models/GaDailyCountry.js';
import GaDailyEvent from '../../models/GaDailyEvent.js';
import GaDailyLanding from '../../models/GaDailyLanding.js';

/**
 * ETL GA4 de un sitio para un rango [from, to]. Upserts sobre los índices únicos
 * (bulkCreate + updateOnDuplicate): re-correr el rango es idempotente.
 * Devuelve { rows, apiCalls }.
 */
export const runGa4ForSite = async (authClient, site, { from, to, topN }) => {
    const parsed = await runReports(authClient, site.ga4_property_id, { from, to, topN });
    let rows = 0;

    const totals = parsed.totals.map(({ date, mets }) => ({
        site_id: site.id,
        date,
        sessions: mets[0],
        total_users: mets[1],
        new_users: mets[2],
        page_views: mets[3],
        engaged_sessions: mets[4],
        engagement_rate: mets[5],
        avg_session_duration: mets[6],
        key_events: mets[7],
    }));
    if (totals.length) {
        await GaDailyMetric.bulkCreate(totals, {
            updateOnDuplicate: ['sessions', 'total_users', 'new_users', 'page_views',
                'engaged_sessions', 'engagement_rate', 'avg_session_duration', 'key_events', 'updatedAt'],
        });
        rows += totals.length;
    }

    const channels = parsed.channels.map(({ date, dims, mets }) => ({
        site_id: site.id,
        date,
        channel: (dims[0] || 'Unassigned').slice(0, 50),
        sessions: mets[0],
        total_users: mets[1],
        key_events: mets[2],
    }));
    if (channels.length) {
        await GaDailyChannel.bulkCreate(channels, {
            updateOnDuplicate: ['sessions', 'total_users', 'key_events', 'updatedAt'],
        });
        rows += channels.length;
    }

    const pages = parsed.pages.map(({ date, dims, mets }) => ({
        site_id: site.id,
        date,
        page_path: (dims[0] || '/').slice(0, 500),
        page_views: mets[0],
        sessions: mets[1],
    }));
    if (pages.length) {
        await GaDailyPage.bulkCreate(pages, {
            updateOnDuplicate: ['page_views', 'sessions', 'updatedAt'],
        });
        rows += pages.length;
    }

    const devices = parsed.devices.map(({ date, dims, mets }) => ({
        site_id: site.id,
        date,
        device_category: (dims[0] || 'unknown').slice(0, 20),
        sessions: mets[0],
        total_users: mets[1],
    }));
    if (devices.length) {
        await GaDailyDevice.bulkCreate(devices, {
            updateOnDuplicate: ['sessions', 'total_users', 'updatedAt'],
        });
        rows += devices.length;
    }

    const countries = (parsed.countries || []).map(({ date, dims, mets }) => ({
        site_id: site.id,
        date,
        country: (dims[0] || '(not set)').slice(0, 80),
        sessions: mets[0],
        total_users: mets[1],
    }));
    if (countries.length) {
        await GaDailyCountry.bulkCreate(countries, {
            updateOnDuplicate: ['sessions', 'total_users', 'updatedAt'],
        });
        rows += countries.length;
    }

    const events = (parsed.events || []).map(({ date, dims, mets }) => ({
        site_id: site.id,
        date,
        event_name: (dims[0] || '(unknown)').slice(0, 120),
        key_events: mets[0],
        event_count: mets[1],
    }));
    if (events.length) {
        await GaDailyEvent.bulkCreate(events, {
            updateOnDuplicate: ['key_events', 'event_count', 'updatedAt'],
        });
        rows += events.length;
    }

    const landings = (parsed.landings || []).map(({ date, dims, mets }) => ({
        site_id: site.id,
        date,
        landing_page: (dims[0] || '(not set)').slice(0, 500),
        sessions: mets[0],
        key_events: mets[1],
    }));
    if (landings.length) {
        await GaDailyLanding.bulkCreate(landings, {
            updateOnDuplicate: ['sessions', 'key_events', 'updatedAt'],
        });
        rows += landings.length;
    }

    return { rows, apiCalls: 2 };
};
