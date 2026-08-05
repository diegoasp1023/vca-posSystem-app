#!/bin/bash
# Runs once, only on first container startup with an empty data volume
# (official postgres image behavior for /docker-entrypoint-initdb.d).
# Creates the app and Keycloak databases on top of the single postgres
# instance shared between them in dev.
#
# APP_DB_USERNAME and KC_DB_USERNAME are allowed to be the same role (some
# setups intentionally reuse one user across both databases), so role
# creation is guarded to avoid a "role already exists" error aborting the
# rest of the script.
set -euo pipefail

create_role_if_missing() {
    local role="$1" password="$2"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-SQL
        DO \$\$
        BEGIN
          IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${role}') THEN
            CREATE ROLE "${role}" WITH LOGIN PASSWORD '${password}';
          END IF;
        END
        \$\$;
SQL
}

create_role_if_missing "${APP_DB_USERNAME}" "${APP_DB_PASSWORD}"
create_role_if_missing "${KC_DB_USERNAME}" "${KC_DB_PASSWORD}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-SQL
    CREATE DATABASE "${APP_DB_NAME}";
    GRANT ALL PRIVILEGES ON DATABASE "${APP_DB_NAME}" TO "${APP_DB_USERNAME}";
    ALTER DATABASE "${APP_DB_NAME}" OWNER TO "${APP_DB_USERNAME}";

    CREATE DATABASE "${KC_DB_NAME}";
    GRANT ALL PRIVILEGES ON DATABASE "${KC_DB_NAME}" TO "${KC_DB_USERNAME}";
    ALTER DATABASE "${KC_DB_NAME}" OWNER TO "${KC_DB_USERNAME}";

    -- ALTER DATABASE ... OWNER TO only changes who owns the database, not
    -- who owns the "public" schema inside it (Postgres 15+ no longer grants
    -- CREATE on public to everyone, so the app/kc users need to own it
    -- directly to be able to create tables).
    \connect "${APP_DB_NAME}"
    ALTER SCHEMA public OWNER TO "${APP_DB_USERNAME}";

    \connect "${KC_DB_NAME}"
    ALTER SCHEMA public OWNER TO "${KC_DB_USERNAME}";
SQL
