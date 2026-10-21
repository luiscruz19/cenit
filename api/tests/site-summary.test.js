import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newToken, hashToken, shapeSummary, TOKEN_PREFIX } from '../services/site-summary/site-summary.shape.js';

const range = { days: 28, from: '2026-09-21', to: '2026-10-18', prevFrom: '2026-08-24', prevTo: '2026-09-20', yoyFrom: 'x', yoyTo: 'y' };
const ga = { sessions: 120, users: 90, newUsers: 70, pageViews: 300, engagementRate: 0.6, avgSessionDuration: 80, keyEvents: 4 };
const gsc = { clicks: 40, impressions: 2000, ctr: 0.02, position: 12.5 };
const detail = {
    range,
    kpis: { ga, gaPrev: { ...ga, users: 80 }, gaYoy: null, gsc, gscPrev: null, gscYoy: null },
    gaPages: Array.from({ length: 8 }, (_, i) => ({ path: `/p${i}/`, pageViews: 100 - i, sessions: 1 })),
    gscQueries: Array.from({ length: 7 }, (_, i) => ({ query: `q${i}`, clicks: 10 - i, impressions: 50, ctr: 0.2, position: 3 })),
};
const site = { name: 'Ejemplo', domain: 'ejemplo.com', ga4_property_id: '123', gsc_site_url: 'sc-domain:ejemplo.com' };

test('el token es largo, distinto cada vez y con prefijo; el hash es sha256 en hexa', () => {
    const a = newToken(), b = newToken();
    assert.ok(a.startsWith(TOKEN_PREFIX) && a.length > 40);
    assert.notEqual(a, b);
    assert.match(hashToken(a), /^[0-9a-f]{64}$/);
    assert.equal(hashToken(a), hashToken(a));
});

test('respuesta completa: rango, KPIs sin campos de más y top 5', () => {
    const r = shapeSummary({ site, period: '28d', detail, updatedAt: '2026-10-18' });
    assert.deepEqual(r.site, { name: 'Ejemplo', domain: 'ejemplo.com' });
    assert.deepEqual(r.range, { from: '2026-09-21', to: '2026-10-18', prevFrom: '2026-08-24', prevTo: '2026-09-20' });
    assert.deepEqual(Object.keys(r.ga), ['sessions', 'users', 'newUsers', 'pageViews', 'engagementRate', 'keyEvents']);
    assert.equal(r.gaPrev.users, 80);
    assert.equal(r.topPages.length, 5);
    assert.deepEqual(r.topPages[0], { path: '/p0/', views: 100 });
    assert.equal(r.topQueries.length, 5);
    assert.deepEqual(Object.keys(r.topQueries[0]), ['query', 'clicks', 'impressions', 'position']);
});

test('fuente conectada sin datos: ceros, no null', () => {
    const vacio = { range, kpis: { ga: null, gaPrev: null, gsc: null, gscPrev: null }, gaPages: [], gscQueries: [] };
    const r = shapeSummary({ site, period: '28d', detail: vacio, updatedAt: null });
    assert.equal(r.ga.users, 0);
    assert.equal(r.gscPrev.clicks, 0);
    assert.equal(r.updatedAt, null);
});

test('fuente no conectada: null, aunque haya filas viejas', () => {
    const r = shapeSummary({ site: { ...site, ga4_property_id: null, gsc_site_url: '' }, period: '7d', detail, updatedAt: '2026-10-18' });
    assert.equal(r.ga, null);
    assert.equal(r.gaPrev, null);
    assert.equal(r.gsc, null);
    assert.deepEqual(r.topPages, []);
    assert.deepEqual(r.topQueries, []);
});
