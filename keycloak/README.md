# Keycloak

Configuración y despliegue de Keycloak (IAM/seguridad) para VCA POS. No se
está usando import automático de realms (`--import-realm`) — la configuración
de realms, clients y roles se hace manualmente desde la consola admin en cada
ambiente. Ver `CLAUDE.md` en la raíz del repo para las reglas completas.

## Base de datos de Keycloak

La base de datos propia de Keycloak (`keycloak_dev` / `keycloak_staging` /
`keycloak_prod`) es independiente de la base de datos de la aplicación
(`APP_DB_*`) — nunca deben compartirse ni mezclarse, aunque en dev vivan
dentro del mismo contenedor Postgres.

Cómo desplegarla y conectarse (dev vía Docker, staging/prod ya desplegada en
la VPS) está documentado en **[`docs/database.md`](../docs/database.md)**,
junto con la base de datos de la aplicación, para no duplicar instrucciones.

Variables relevantes para Keycloak: `KC_DB_HOST`, `KC_DB_NAME`,
`KC_DB_USERNAME`, `KC_DB_PASSWORD` (ver `.env.example`).

## Comandos de arranque por ambiente

- `dev` → `KC_COMMAND=start-dev` (modo relajado, HTTP permitido, solo local)
- `staging` / `prod` → `KC_COMMAND=start --optimized` (modo producción real)

Nunca cambiar `start --optimized` por `start-dev` en staging o prod, ni al
revés en dev, salvo pedido explícito.
