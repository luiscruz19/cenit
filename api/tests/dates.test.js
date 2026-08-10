import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, daysBetween, dateRange } from '../utils/dates.js';

test('addDays cruza fin de mes', () => {
    assert.equal(addDays('2026-01-31', 1), '2026-02-01');
    assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('daysBetween es inclusivo', () => {
    assert.equal(daysBetween('2026-01-01', '2026-01-01'), 1);
    assert.equal(daysBetween('2026-01-01', '2026-01-28'), 28);
});

test('dateRange devuelve todas las fechas del rango', () => {
    assert.deepEqual(dateRange('2026-01-01', '2026-01-03'), ['2026-01-01', '2026-01-02', '2026-01-03']);
});
