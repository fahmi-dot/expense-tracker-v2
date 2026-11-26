function utcDate(year: number, month: number, day: number) {
  const date = new Date(0);
  date.setUTCFullYear(year, month, day);
  return date;
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = utcDate(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isMonth(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function monthRange(month: string): [string, string] {
  const [year, value] = month.split('-').map(Number);
  const next = utcDate(year, value, 1);
  return [`${month}-01`, next.toISOString().slice(0, 10)];
}

export function validateFilter(q: Record<string, unknown>) {
  if (q.month != null && (!isMonth(q.month) || q.from != null || q.to != null)) return { code: 'FILTER_INVALID' };
  if (q.from != null && !isIsoDate(q.from)) return { code: 'FILTER_INVALID' };
  if (q.to != null && !isIsoDate(q.to)) return { code: 'FILTER_INVALID' };
  if (typeof q.from === 'string' && typeof q.to === 'string' && q.from > q.to) return { code: 'FILTER_INVALID' };
  return null;
}

export function validateExpense(input: Record<string, unknown>) {
  const fields: Record<string, string> = {};
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0 || !/^\d+(\.\d{1,2})?$/.test(String(input.amount))) fields.amount = 'Nominal harus positif';
  if (!isIsoDate(input.expenseDate)) fields.expenseDate = 'Tanggal tidak valid';
  if (!Number.isInteger(input.categoryId) || (input.categoryId as number) <= 0) fields.categoryId = 'Kategori wajib dipilih';
  if (input.description != null && (typeof input.description !== 'string' || input.description.length > 500)) fields.description = 'Deskripsi maksimal 500 karakter';
  return fields;
}

export function csv(value: unknown) { const s = String(value ?? ''); return /[",\n\r\u0080-\uffff]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s; }
