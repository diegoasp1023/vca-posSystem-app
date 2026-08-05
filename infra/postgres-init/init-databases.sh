#!/bin/bash
# Runs once, only on first container startup with an empty data volume
# (official postgres image behavior for /docker-entrypoint-initdb.d).
# Creates the two application databases/users on top of the single
# postgres instance shared by app-db and Keycloak in dev.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-SQL
    CREATE DATABASE "${APP_DB_NAME}";
    CREATE USER "${APP_DB_USERNAME}" WITH PASSWORD '${APP_DB_PASSWORD}';
    GRANT ALL PRIVILEGES ON DATABASE "${APP_DB_NAME}" TO "${APP_DB_USERNAME}";
    ALTER DATABASE "${APP_DB_NAME}" OWNER TO "${APP_DB_USERNAME}";

    CREATE DATABASE "${KC_DB_NAME}";
    CREATE USER "${KC_DB_USERNAME}" WITH PASSWORD '${KC_DB_PASSWORD}';
    GRANT ALL PRIVILEGES ON DATABASE "${KC_DB_NAME}" TO "${KC_DB_USERNAME}";
    ALTER DATABASE "${KC_DB_NAME}" OWNER TO "${KC_DB_USERNAME}";
SQL
