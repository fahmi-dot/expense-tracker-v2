# STATUS

## Tahap PRD: selesai
File: /home/ubuntu/projects/expense-tracker-v2/PRD.md

## Tahap FSD: selesai
File: /home/ubuntu/projects/expense-tracker-v2/FSD.md

## Deliverable database: selesai
- /home/ubuntu/projects/expense-tracker-v2/db/docker-compose.yaml
- /home/ubuntu/projects/expense-tracker-v2/db/schema.sql
- /home/ubuntu/projects/expense-tracker-v2/db/.env.example
- PostgreSQL 17 Alpine; bind `127.0.0.1:${POSTGRES_PORT:-5432}:5432`; external network `n8n_default`; volume `expense_postgres_data`.
- `expense_owner` bootstrap/provisioning/schema owner via `POSTGRES_USER`/`POSTGRES_PASSWORD`.
- `expense_app` runtime login least privilege. Schema creates/updates role idempotently from `APP_DATABASE_PASSWORD`; no password literal schema.
- App runtime must use `DATABASE_URL` for `expense_app`, not owner.
- Docker dan koneksi PostgreSQL tidak dijalankan.

## Catatan desain
- Frontend React + Vite + TypeScript, backend Node.js + Express + TypeScript terpisah.
- Data: users, categories, expenses; sessions mendukung revoke logout/cookie HTTP-only.
- Satu akun lokal provisioning seed/manual; tanpa pendaftaran publik.
- IDR dua digit desimal; zona waktu konfigurabel default `Asia/Jakarta`.
- UI/pesan pengguna Bahasa Indonesia.
- Non-goal: multi-user, pembayaran, mobile, pendaftaran publik.

## Status persetujuan
PRD disetujui. FSD/database role design selesai dan siap tahap programmer.
