import test from 'node:test';
import assert from 'node:assert/strict';
import { validateExpense } from '../src/validation.js';

test('rejects invalid expense fields', () => {
  assert.deepEqual(validateExpense({ amount: '-1', expenseDate: 'bad', categoryId: 0 }), {
    amount: 'Nominal harus positif', expenseDate: 'Tanggal tidak valid', categoryId: 'Kategori wajib dipilih'
  });
});
