# FSD — Expense Tracker v2

Versi PRD: `PRD.md` (disetujui). Scope: satu akun lokal, tanpa pendaftaran publik, multi-user, pembayaran, atau mobile.

## 1. Overview dan Scope

Frontend React + Vite + TypeScript berjalan terpisah dari API Node.js + Express + TypeScript. API memakai PostgreSQL database `expense`. UI/pesan pengguna Bahasa Indonesia. Mata uang IDR disimpan `NUMERIC(14,2)`; zona waktu `APP_TIMEZONE` default `Asia/Jakarta`. Keputusan ini menyelesaikan A-002, A-004, A-005 dan rekomendasi pertanyaan terbuka PRD.

## 2. Design Decisions

- React/Vite/TypeScript dan Express/TypeScript: sesuai PRD, development server independen (NFR-005). Full-stack framework ditolak karena coupling tambahan.
- PostgreSQL 17 Alpine: sesuai PRD; constraint DB menjaga integritas. File storage ditolak karena filter/ringkasan rapuh.
- Database roles: `expense_owner` adalah login owner provisioning/schema. `expense_app` adalah login runtime least-privilege, tanpa superuser, create role/database, replication, atau bypass RLS. Koneksi aplikasi memakai `DATABASE_URL` dengan user `expense_app`; tidak memakai owner. Satu role dipakai karena PRD satu aplikasi/satu database; role per fitur ditolak karena tidak diperlukan.
- Session server-side dengan cookie opaque HTTP-only; session row/expiry berada di `sessions`. JWT localStorage ditolak karena risiko XSS dan revocation sulit.
- Password Argon2id melalui library dipilih implementer; plaintext tidak disimpan. Version wajib dikunci dan diverifikasi saat implementasi.
- Nominal `NUMERIC(14,2)`, IDR, deskripsi maksimal 500 karakter. Kategori seed tetap tanpa CRUD kategori.
- CSV dibuat API dari query terfilter; serializer RFC 4180.

## 3. Architecture

```text
Browser
  React UI (Vite) --fetch credentials: include--> Express API
                                                   | auth + validation + services
                                                   | parameterized SQL as expense_app
                                                   v
                                   PostgreSQL expense
                                   expense_owner: provisioning/schema owner
                                   expense_app: runtime DML only
```

Komponen: `frontend` untuk login/CRUD/filter/ringkasan/ekspor; `backend` untuk route, session middleware, validation, query/service, CSV, error middleware; `db` untuk Compose/schema. Database tidak dijalankan pada tahap FSD.

Semua query data memakai `user_id` dari sesi, bukan client (FR-014). Create/update/delete memakai transaksi bila lebih dari satu statement (NFR-007).

## 4. Project Structure

```text
frontend/
  src/{api,components,pages,types,App.tsx,main.tsx}
backend/
  src/{config,db,middleware,routes,services,validation,app.ts,server.ts}
  test/
db/
  docker-compose.yaml
  schema.sql
  .env.example
FSD.md
PRD.md
STATUS.md
```

Source baru mengikuti stack repository. README.md dan `.gitignore` tidak diubah. Frontend/backend masing-masing punya script dev/build/test.

## 5. Data Model

Semua tabel memakai `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, kecuali disebut lain.

### `users`
- `id BIGSERIAL PRIMARY KEY`
- `username VARCHAR(100) NOT NULL UNIQUE`
- `email VARCHAR(254) NOT NULL UNIQUE`
- `password_hash TEXT NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

Satu row diprovision manual/seed; tidak ada route register (FR-002, NFR-002).

### `categories`
- `id BIGSERIAL PRIMARY KEY`
- `name VARCHAR(80) NOT NULL UNIQUE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

Seed: `Makanan`, `Transportasi`, `Tagihan`, `Belanja`, `Kesehatan`, `Hiburan`, `Lainnya` (FR-009).

### `expenses`
- `id BIGSERIAL PRIMARY KEY`
- `user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT`
- `category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT`
- `amount NUMERIC(14,2) NOT NULL CHECK (amount > 0)`
- `expense_date DATE NOT NULL`
- `description VARCHAR(500) NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

Index `(user_id, expense_date)`, `(user_id, category_id)`.

### `sessions`
- `id UUID PRIMARY KEY`
- `user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE`
- `expires_at TIMESTAMPTZ NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

Index `(user_id)`, `(expires_at)`. Session ID cryptographically random. Migration awal menjalankan `schema.sql` sebagai `expense_owner`; rerun aman dan non-destruktif. Migration berikutnya berurutan dan non-destruktif tanpa approval.

### Database provisioning dan privilege

1. Operator mengisi environment lokal, bukan repository: `POSTGRES_DB=expense`, `POSTGRES_USER=expense_owner`, `POSTGRES_PASSWORD` owner secret, `APP_DATABASE_PASSWORD` app secret, dan `POSTGRES_PORT`.
2. Compose membuat database dan bootstrap login owner dari `POSTGRES_USER`/`POSTGRES_PASSWORD`. `schema.sql` hanya menerima password app dari `APP_DATABASE_PASSWORD` runtime; tidak memuat password literal.
3. Jalankan schema hanya melalui bootstrap Compose atau `psql` yang login sebagai `expense_owner`, pada database `expense`. Schema fail bila current role bukan `expense_owner`.
4. Schema idempotently membuat/memperketat `expense_app`, tabel/index/seed, mencabut privilege `PUBLIC` yang tidak diperlukan, lalu memberi `expense_app`: `CONNECT` pada database; `USAGE` schema `public`; `SELECT, INSERT, UPDATE, DELETE` pada empat tabel; `USAGE, SELECT` pada sequence tabel.
5. `expense_app` tidak mendapat `CREATE`, `TRUNCATE`, `REFERENCES`, `TRIGGER`, DDL, ownership, atau hak admin. Backend runtime memakai `DATABASE_URL` app. Owner password hanya untuk provisioning/admin, tidak dimasukkan konfigurasi backend runtime.

## 6. Interfaces

Base URL `/api`. JSON `Content-Type: application/json`; browser memakai `credentials: include`. Error: `{ "error": { "code": "...", "message": "...", "fields": {} } }`; `fields` opsional.

### Auth
- `POST /api/auth/login` body `{identifier: string, password: string}`. `200 {user:{id,username,email}}`, Set-Cookie `session=...; HttpOnly; SameSite=Lax; Path=/; Max-Age=...`; `Secure` saat HTTPS. Invalid: `401 AUTH_INVALID`, pesan umum.
- `POST /api/auth/logout`: hapus sesi/clear cookie; `204`, idempotent.
- `GET /api/auth/me`: `200 {user:{id,username,email}}`; tanpa sesi `401 AUTH_REQUIRED`.
- Tidak ada `POST /register` (FR-002).

### Categories
- `GET /api/categories`: sesi wajib; `200 {categories:[{id,name}]}`, urut nama ASC; tanpa sesi `401`.

### Expenses
Representasi: `{id, amount:"123.45", expenseDate:"YYYY-MM-DD", category:{id,name}, description:null|string, createdAt, updatedAt}`.
- `GET /api/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD&month=YYYY-MM&page=1&pageSize=50`: sesi wajib. `from/to` inklusif; `month` tidak boleh digabung range (`400 FILTER_CONFLICT`). Default semua tanggal, page 1, pageSize 50, maksimum 100. Response `{items,total,page,pageSize,totalAmount}`.
- `POST /api/expenses` body `{amount:string|number, expenseDate:string, categoryId:number, description?:string|null}`: `201`; invalid `400 VALIDATION_ERROR`, tanpa perubahan.
- `PATCH /api/expenses/:id`: payload lengkap create, field asing ditolak; `200`. Bukan milik sesi: `404 EXPENSE_NOT_FOUND`.
- `DELETE /api/expenses/:id`: `204` setelah konfirmasi UI; cancel tidak request. Bukan milik sesi: `404`.

### Summary dan CSV
- `GET /api/expenses/summary?month=YYYY-MM`: sesi wajib; `200 {month:"YYYY-MM",totalAmount:"...",count:number}`.
- `GET /api/expenses/export.csv?from=...&to=...&month=...`: filter identik list; `200`, `Content-Type: text/csv; charset=utf-8`, attachment `pengeluaran-YYYY-MM-DD.csv`. Header `tanggal,kategori,deskripsi,nominal` selalu ada. Serializer mengutip koma, kutip, newline, non-ASCII (FR-012, FR-013).

Status: `400` input/filter, `401` sesi/kredensial, `404` resource sesi tidak ada, `409` conflict, `500` internal. UI menampilkan pesan aman Indonesia.

## 7. Behavior dan Business Rules

1. Login mencari identifier case-insensitive sesuai kolom ternormalisasi, memverifikasi hash, membuat expiry; kegagalan punya pesan sama (FR-001).
2. Auth middleware membaca cookie, lookup sesi, cek expiry/user; tanpa hasil `401` sebelum handler (FR-014).
3. Form: amount positif, finite, maksimal dua desimal/batas DB; ISO date valid; category integer tersedia; description opsional maksimal 500. Error per field Indonesia.
4. Create/update validasi seluruh payload sebelum transaksi. Update hanya `id` dan `user_id` sesi. Tidak ada partial write.
5. Filter range inklusif; API menolak `from > to`; total memakai filter sama.
6. Ringkasan memakai semua expense user bulan terpilih. Edit/delete memengaruhi query berikutnya.
7. Delete UI konfirmasi Indonesia; cancel tidak API call. Logout hapus session/cookie.
8. CSV kolom stabil UTF-8 dan hanya data session user.
9. Runtime DB connection gagal bila memakai owner atau role selain `expense_app`; startup config memvalidasi username URL sebelum membuka pool. Ini mencegah privilege provisioning dipakai API.

## 8. Error Handling dan Logging

Error middleware memetakan validation/database/auth error ke kode aman. Jangan kirim stack trace, SQL, password, password hash, session ID, connection string, atau detail schema. Log terstruktur: timestamp, request ID, method, path, status, duration, user ID setelah auth. Login gagal event tanpa identifier penuh/password. Unexpected error `500 INTERNAL_ERROR`; stack internal. Write rollback saat error; jangan retry write. Read retry terbatas hanya bila library mendukung.

## 9. Security dan Privacy

- Password hash Argon2id; seed menerima hash via provisioning aman, bukan plaintext repository.
- Cookie `HttpOnly`, `SameSite=Lax`, `Path=/`; `Secure=true` saat HTTPS. CORS allowlist configured frontend origin, credentials true, tanpa wildcard.
- Session ID entropy tinggi; expiry configurable, rotate login, logout revoke server-side.
- Validasi tipe/panjang/tanggal/nominal/category; SQL parameterized; React default escaping.
- CSRF: SameSite dan origin check mutating route.
- Owner/app DB passwords hanya environment variables. `schema.sql` tidak menyimpan literal password; `APP_DATABASE_PASSWORD` hanya dipakai provisioning. Jangan log environment atau `DATABASE_URL`.
- Compose bind hanya loopback; network `n8n_default` external. Database tidak diekspos alamat host lain.

## 10. Configuration dan Environment

Backend: `PORT`, `DATABASE_URL`, `APP_TIMEZONE`, `SESSION_SECRET`, `SESSION_TTL_SECONDS`, `FRONTEND_ORIGIN`, `NODE_ENV`, `COOKIE_SECURE`.

Frontend: `VITE_API_BASE_URL`.

DB Compose: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `APP_DATABASE_PASSWORD`, `POSTGRES_PORT`. Required identity values: database `expense`, owner `expense_owner`, runtime login `expense_app`. `.env.example` memakai placeholder; nilai secret nyata tidak masuk repository. Compose image `postgres:17-alpine`, bind `127.0.0.1:${POSTGRES_PORT:-5432}:5432`, volume `expense_postgres_data`, external network `n8n_default`.

Dependencies utama: React, Vite, TypeScript, Express, PostgreSQL driver, password-hash library, validation library, test runner. Final version dikunci package manager dan diverifikasi sebelum coding.

## 11. Test Strategy

Unit: validation amount/date/category/description; boundary month timezone; CSV escaping; error mapping; session expiry; runtime DB URL rejects owner. Integration API + PostgreSQL test DB: valid/invalid login, cookie flags, auth denial, no register, CRUD ownership, rollback, category seed, filter inclusive, summary, empty/special CSV. DB provisioning inspection: schema contains no literal secret, app role has login/no admin flags, only stated grants, owner owns tables/sequences, `PUBLIC` cannot create schema objects. E2E desktop dua versi mayor Chrome/Firefox/Edge: Indonesia, login → add → filter/summary → edit → export → delete/logout.

Test data: one provisioned user, seven categories, boundary-month expenses, invalid nominal values, special descriptions, second user only for isolation fixture.

## 12. Implementation Order

1. Lock config; create `.env` locally from template; provision roles/schema as owner without committing secrets.
2. Add DB connection with `expense_app` URL validation, migrations/bootstrap, session/auth middleware, provisioning script outside public API.
3. Categories/expense validation/service/routes, summary, CSV.
4. Frontend client/login/protected routing/CRUD/filter/summary/export/error Indonesia.
5. Automated, browser, cookie/security, privilege, independent-dev checks.

## 13. Traceability Matrix

| PRD ID | FSD section | Planned tests |
|---|---|---|
| FR-001–FR-003 | 5, 6, 7, 9 | auth integration/E2E |
| FR-004–FR-005 | 5, 6, 7 | validation + create integration |
| FR-006–FR-008 | 6, 7 | CRUD ownership/E2E |
| FR-009 | 5, 6 | seed/category integration |
| FR-010 | 6, 7 | filter boundary |
| FR-011 | 6, 7 | aggregate/month boundary |
| FR-012–FR-013 | 6, 7 | empty/special CSV parser |
| FR-014 | 3, 6, 7, 9 | unauthenticated API/UI |
| NFR-001 | 3, 7, 11 | UI text/E2E |
| NFR-002 | 5, 9, 11 | schema/provisioning inspection |
| NFR-003–NFR-004 | 6, 9 | cookie/CORS/CSRF |
| NFR-005 | 3, 4, 11 | independent startup |
| NFR-006 | 6, 8, 9 | error redaction |
| NFR-007 | 3, 7, 8 | rollback/failure |
| NFR-008 | 11 | browser matrix |

## 14. Risks, Assumptions, dan Open Issues

Resolved: IDR two decimals, `Asia/Jakarta` default, seven fixed categories, description 500, manual/seed provisioning, desktop browser matrix. `APP_TIMEZONE` configurable; changing it needs month-boundary regression.

Operational risk: Docker init scripts run only on new data volume. Existing `expense_postgres_data` requires operator run `schema.sql` manually as `expense_owner`; do not delete volume to reinitialize. Password rotation is an explicit owner provisioning operation: change environment secret then rerun schema as owner. Database/Docker tidak dijalankan pada tahap ini. Exact hash library/parameters/package versions remain implementation selection, must be maintained and lockfile-pinned. No blocking PRD issue.
