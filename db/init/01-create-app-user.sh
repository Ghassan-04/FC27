#!/bin/sh
# Runs ONCE, on first start of an empty data volume.
# Creates a limited application user so the app never connects as the superuser.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
CREATE ROLE ${APP_DB_USER} LOGIN PASSWORD '${APP_DB_PASSWORD}'
  NOSUPERUSER NOCREATEDB NOCREATEROLE;

-- Lock the database down, then grant only what the app needs
REVOKE ALL ON DATABASE ${POSTGRES_DB} FROM PUBLIC;
GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO ${APP_DB_USER};
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO ${APP_DB_USER};

-- Tables created later by the admin user are automatically usable by the app
-- (read/write rows only: no DROP, no ALTER, no CREATE)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${APP_DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO ${APP_DB_USER};
SQL
