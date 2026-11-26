export function validateExpense(input: Record<string, unknown>) {
  const fields: Record<string, string> = {};
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0 || !/^\d+(\.\d{1,2})?$/.test(String(input.amount))) fields.amount = 'Nominal harus positif';
  if (typeof input.expenseDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.expenseDate) || Number.isNaN(Date.parse(`${input.expenseDate}T00:00:00Z`))) fields.expenseDate = 'Tanggal tidak valid';
  if (!Number.isInteger(input.categoryId) || (input.categoryId as number) <= 0) fields.categoryId = 'Kategori wajib dipilih';
  if (input.description != null && (typeof input.description !== 'string' || input.description.length > 500)) fields.description = 'Deskripsi maksimal 500 karakter';
  return fields;
}

export function csv(value: unknown) { const s = String(value ?? ''); return /[",\n\r\u0080-\uffff]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s; }
