import test from 'node:test';
import assert from 'node:assert/strict';
import { validateExpense, isIsoDate, isMonth, monthRange, validateFilter } from '../src/validation.js';

for (const [month, expected] of [
  ['2023-02', ['2023-02-01', '2023-03-01']],
  ['2024-02', ['2024-02-01', '2024-03-01']],
  ['2024-04', ['2024-04-01', '2024-05-01']],
  ['2024-01', ['2024-01-01', '2024-02-01']],
] as const) {
  test(`builds safe half-open range for ${month}`, () => {
    assert.deepEqual(monthRange(month), expected);
  });
}

test('rejects impossible ISO dates', () => {
  assert.equal(isIsoDate('2024-02-31'), false);
  assert.equal(validateExpense({ amount: '1', expenseDate: '2024-02-31', categoryId: 1 }).expenseDate, 'Tanggal tidak valid');
});

test('handles years below 100 without Date.UTC remapping', () => {
  assert.equal(isIsoDate('0001-01-01'), true);
  assert.equal(isIsoDate('0099-12-31'), true);
  assert.deepEqual(monthRange('0099-12'), ['0099-12-01', '0100-01-01']);
});

test('validates month and filter ranges', () => {
  assert.equal(isMonth('2024-13'), false);
  assert.deepEqual(validateFilter({ month: 'bad' }), { code: 'FILTER_INVALID' });
  assert.deepEqual(validateFilter({ from: '2025-12-31', to: '2025-01-01' }), { code: 'FILTER_INVALID' });
});

test('rejects invalid summary month', () => {
  assert.equal(isMonth(''), false);
  assert.equal(isMonth('2024-02'), true);
});

test('rejects invalid expense fields', () => {
  assert.deepEqual(validateExpense({ amount: '-1', expenseDate: 'bad', categoryId: 0 }), {
    amount: 'Nominal harus positif', expenseDate: 'Tanggal tidak valid', categoryId: 'Kategori wajib dipilih'
  });
});
