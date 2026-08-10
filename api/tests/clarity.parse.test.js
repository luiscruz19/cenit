import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseClarityPayload } from '../services/clarity/clarity.parse.js';

/**
 * Fixture REAL de la Data Export API de Clarity (proyecto Novitas, capturado en vivo).
 * Es la respuesta que destapó el bug: la fricción vive en sessionsWithMetricPercentage,
 * no en sessionsCount (que es el total de sesiones y es igual en todos los bloques).
 */
const NOVITAS = [
    { metricName: 'DeadClickCount', information: [{ sessionsCount: '61', sessionsWithMetricPercentage: 19.67, pagesViews: '20', subTotal: '53' }] },
    { metricName: 'ExcessiveScroll', information: [{ sessionsCount: '61', sessionsWithMetricPercentage: 0, subTotal: '0' }] },
    { metricName: 'RageClickCount', information: [{ sessionsCount: '61', sessionsWithMetricPercentage: 1.64, subTotal: '6' }] },
    { metricName: 'QuickbackClick', information: [{ sessionsCount: '61', sessionsWithMetricPercentage: 22.95, subTotal: '38' }] },
    { metricName: 'ScriptErrorCount', information: [{ sessionsCount: '61', sessionsWithMetricPercentage: 0, subTotal: '0' }] },
    { metricName: 'ScrollDepth', information: [{ averageScrollDepth: 62.82 }] },
    { metricName: 'Traffic', information: [{ totalSessionCount: '61', totalBotSessionCount: '3', distinctUserCount: '43', pagesPerSessionPercentage: 3.3055 }] },
    { metricName: 'EngagementTime', information: [{ totalTime: '683', activeTime: '139' }] },
];

test('Clarity: la fricción se lee como % de sesiones (no como sessionsCount)', () => {
    const m = parseClarityPayload(NOVITAS);
    assert.equal(m.deadClickPct, 19.67);
    assert.equal(m.rageClickPct, 1.64);
    assert.equal(m.quickbackPct, 22.95);
    // El bug hacía que dieran los tres iguales a 61 (el total de sesiones).
    assert.notEqual(m.deadClickPct, m.sessions);
});

test('Clarity: tráfico usa distinctUserCount (no el typo "distantUserCount" de la doc)', () => {
    const m = parseClarityPayload(NOVITAS);
    assert.equal(m.sessions, 61);
    assert.equal(m.botSessions, 3);
    assert.equal(m.distinctUsers, 43);
});

test('Clarity: comportamiento usa activeTime, no totalTime', () => {
    const m = parseClarityPayload(NOVITAS);
    assert.equal(m.avgScrollDepth, 62.82);
    assert.equal(m.avgActiveTime, 139);
});

test('Clarity: respuesta vacía no rompe, devuelve nulls', () => {
    const m = parseClarityPayload([]);
    assert.equal(m.sessions, null);
    assert.equal(m.rageClickPct, null);
});
