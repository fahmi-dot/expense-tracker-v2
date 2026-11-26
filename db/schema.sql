\set ON_ERROR_STOP on

-- This file must run as the provisioning owner, never as the runtime role.
DO $$
BEGIN
  IF current_user <> 'expense_owner' THEN
    RAISE EXCEPTION 'schema.sql must run as expense_owner, current role is %', current_user;
  END IF;
END $$;

-- Read app password only from process environment; it is not stored in this file.
\getenv app_database_password APP_DATABASE_PASSWORD
\if :{?app_database_password}
\else
  \quit
\endif

-- Suppress psql output while handing the ephemeral value to the DO block.
\o /dev/null
SELECT set_config('expense.provisioning_app_password', :'app_database_password', false);
\o

DO $$
DECLARE
  app_password text := current_setting('expense.provisioning_app_password', true);
BEGIN
  IF app_password IS NULL OR app_password = '' THEN
    RAISE EXCEPTION 'APP_DATABASE_PASSWORD must be set';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'expense_app') THEN
    CREATE ROLE expense_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;

  EXECUTE format(
    'ALTER ROLE expense_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD %L',
    app_password
  );
  PERFORM set_config('expense.provisioning_app_password', '', false);
END $$;

REVOKE ALL ON DATABASE expense FROM PUBLIC;
GRANT CONNECT ON DATABASE expense TO expense_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM expense_app;
GRANT USAGE ON SCHEMA public TO expense_app;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL,
  description VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users OWNER TO expense_owner;
ALTER TABLE categories OWNER TO expense_owner;
ALTER TABLE expenses OWNER TO expense_owner;
ALTER TABLE sessions OWNER TO expense_owner;
ALTER SEQUENCE users_id_seq OWNER TO expense_owner;
ALTER SEQUENCE categories_id_seq OWNER TO expense_owner;
ALTER SEQUENCE expenses_id_seq OWNER TO expense_owner;

CREATE INDEX IF NOT EXISTS expenses_user_date_idx ON expenses (user_id, expense_date);
CREATE INDEX IF NOT EXISTS expenses_user_category_idx ON expenses (user_id, category_id);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions (expires_at);

INSERT INTO categories (name) VALUES
  ('Makanan'), ('Transportasi'), ('Tagihan'), ('Belanja'),
  ('Kesehatan'), ('Hiburan'), ('Lainnya')
ON CONFLICT (name) DO NOTHING;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM expense_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE users, categories, expenses, sessions TO expense_app;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM expense_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO expense_app;
