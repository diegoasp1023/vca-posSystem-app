# Keycloak

Configuración y despliegue de Keycloak (IAM/seguridad) para VCA POS. No se
está usando import automático de realms (`--import-realm`) — la configuración
de realms, clients y roles se hace manualmente desde la consola admin en cada
ambiente. Ver `CLAUDE.md` en la raíz del repo para las reglas completas.

Este documento cubre específicamente **la base de datos propia de Keycloak**
(`keycloak_dev` / `keycloak_staging` / `keycloak_prod`), independiente de la
base de datos de la aplicación (ver `docs/database.md`). Nunca deben
compartirse ni mezclarse entre sí ni entre ambientes.

Motor: **PostgreSQL 16.14** en todos los ambientes.

---

## Dev — desplegar con Docker

En desarrollo, la base de datos de Keycloak se levanta localmente con Docker
mediante el servicio `keycloak-db` en `infra/docker-compose.yml`. Al igual
que `app-db`, está bajo el profile `dev`, así que solo se levanta cuando se
pide explícitamente y nunca se activa en staging/prod.

`keycloak-db` y `keycloak` corren en contenedores separados dentro de la
misma red `vca-net`, por lo que Keycloak se conecta a su base usando el
nombre del servicio (`keycloak-db`) como host, no `localhost`.

### Requisitos

- Docker y Docker Compose instalados localmente.
- Un archivo `.env.dev` (no versionado) basado en `.env.example`, con al
  menos estas variables completas:
  - `APP_ENV=dev`
  - `KC_DB_HOST=keycloak-db`
  - `KC_DB_PORT=5433` (puerto expuesto al host; distinto del 5432 que ya usa `app-db`)
  - `KC_DB_NAME=keycloak_dev`
  - `KC_DB_USERNAME=keycloak_user`
  - `KC_DB_PASSWORD=<tu password local>`
  - `KEYCLOAK_ADMIN_USER` / `KEYCLOAK_ADMIN_PASSWORD`
  - `KC_HOSTNAME=localhost`, `KC_PORT=8080`, `KC_COMMAND=start-dev`

### Levantar la base de datos y Keycloak

Desde la raíz del repo:

```bash
# Solo la base de datos de Keycloak
docker compose -f infra/docker-compose.yml --env-file .env.dev --profile dev up -d keycloak-db

# Base de datos + Keycloak juntos
docker compose -f infra/docker-compose.yml --env-file .env.dev --profile dev up -d
```

Esto crea un contenedor `keycloak-db-dev` con Postgres 16.14, expuesto en
`localhost:${KC_DB_PORT}` (5433 por defecto) y con los datos persistidos en
el volumen `keycloak-db-data` (sobrevive a reinicios y a
`docker compose down`, pero no a `docker compose down -v`).

Al arrancar por primera vez sobre una base vacía, Keycloak crea su propio
esquema automáticamente — no hace falta ejecutar migraciones a mano.

### Verificar que está arriba

```bash
docker compose -f infra/docker-compose.yml --env-file .env.dev ps
docker exec -it keycloak-db-dev psql -U keycloak_user -d keycloak_dev
```

### Detener / reiniciar

```bash
# Detener sin borrar datos
docker compose -f infra/docker-compose.yml --env-file .env.dev stop keycloak-db

# Borrar el contenedor pero conservar los datos (volumen persiste)
docker compose -f infra/docker-compose.yml --env-file .env.dev rm -f keycloak-db

# Borrar TODO incluyendo los datos (destructivo, solo si de verdad quieres
# resetear realms/usuarios/clients locales)
docker compose -f infra/docker-compose.yml --env-file .env.dev down -v
```

---

## Staging / Prod — base de datos ya desplegada en la VPS

En staging y prod, la base de datos de Keycloak **ya está desplegada y
gestionada directamente en la VPS** (no vía este `docker-compose.yml`, igual
que ocurre con la base de datos de la aplicación). No hay que instalar ni
levantar nada: solo apuntar Keycloak a la instancia existente mediante
variables de entorno.

Cada ambiente tiene su propia base de datos aislada (`keycloak_staging`,
`keycloak_prod`) — nunca se comparte la misma base de datos ni el mismo
realm entre ambientes.

### Variables requeridas

En `.env.staging` / `.env.prod` (no versionados, creados a partir de
`.env.example`):

| Variable | Descripción |
|---|---|
| `KC_DB_HOST` | Host/IP o DNS interno de la VPS donde corre Postgres |
| `KC_DB_PORT` | Puerto donde escucha esa instancia (normalmente 5432) |
| `KC_DB_NAME` | `keycloak_staging` o `keycloak_prod` según el ambiente |
| `KC_DB_USERNAME` | Usuario con privilegios para crear/alterar tablas en el primer arranque |
| `KC_DB_PASSWORD` | Password del usuario anterior (nunca commitear el valor real) |
| `KC_COMMAND` | Debe ser `start --optimized`, nunca `start-dev` |

El servicio `keycloak-db` de `infra/docker-compose.yml` tiene
`profiles: [dev]`, por lo que al correr
`docker compose --env-file .env.staging up -d` (sin `--profile dev`)
**no intentará levantar ninguna base de datos** — solo arrancará Keycloak
apuntando a la instancia ya existente.

### Responsabilidad de la base ya desplegada

- La creación de la base (`keycloak_staging`, `keycloak_prod`), el usuario y
  sus permisos se gestionan manualmente en la VPS (fuera de este repo).
- Si en algún momento se documenta el proceso de instalación/configuración
  de Postgres directamente en la VPS (fuera de Docker), debe agregarse como
  una sección aparte en este mismo archivo — hoy no está cubierto porque el
  despliegue ya existe y se gestiona fuera de este repositorio.
