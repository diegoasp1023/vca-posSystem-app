# Base de datos de la aplicación (backend/POS)

Este documento explica cómo desplegar y conectar la base de datos que usa
`apps/backend` para datos de negocio (productos, ventas, inventario, etc.).

**Importante:** esta base de datos es independiente de la base de datos de
Keycloak (`keycloak_dev` / `keycloak_staging` / `keycloak_prod`), que solo
almacena realms, usuarios, clients y sesiones de IAM. Nunca deben compartirse
ni mezclarse.

Motor: **PostgreSQL 16.14** en todos los ambientes.

---

## Dev — desplegar con Docker

En desarrollo, la base de datos se levanta localmente con Docker a través del
mismo `infra/docker-compose.yml` que ya usa Keycloak, usando el servicio
`app-db` (Postgres 16.14 oficial). Este servicio está bajo el profile `dev`,
por lo que **solo se levanta cuando se le pide explícitamente** y nunca se
activa en staging/prod.

### Requisitos

- Docker y Docker Compose instalados localmente.
- Un archivo `.env.dev` (no versionado) basado en `.env.example`, con al
  menos estas variables completas:
  - `APP_ENV=dev`
  - `APP_DB_HOST=localhost`
  - `APP_DB_PORT=5432`
  - `APP_DB_NAME=vca_pos_dev`
  - `APP_DB_USERNAME=vca_pos_user`
  - `APP_DB_PASSWORD=<tu password local>`

### Levantar la base de datos

Desde la raíz del repo:

```bash
docker compose -f infra/docker-compose.yml --env-file .env.dev --profile dev up -d app-db
```

Esto crea un contenedor `app-db-dev` con Postgres 16.14, expuesto en
`localhost:${APP_DB_PORT}` (5432 por defecto) y con los datos persistidos en
el volumen `app-db-data` (sobrevive a reinicios y a `docker compose down`,
pero no a `docker compose down -v`).

Si en el mismo paso quieres levantar también Keycloak:

```bash
docker compose -f infra/docker-compose.yml --env-file .env.dev --profile dev up -d
```

(Keycloak no tiene profile, así que siempre se levanta; `app-db` solo se
suma cuando se pasa `--profile dev`.)

### Verificar que está arriba

```bash
docker compose -f infra/docker-compose.yml --env-file .env.dev ps
docker exec -it app-db-dev psql -U vca_pos_user -d vca_pos_dev
```

### Detener / reiniciar

```bash
# Detener sin borrar datos
docker compose -f infra/docker-compose.yml --env-file .env.dev stop app-db

# Borrar el contenedor pero conservar los datos (volumen persiste)
docker compose -f infra/docker-compose.yml --env-file .env.dev rm -f app-db

# Borrar TODO incluyendo los datos (destructivo, solo si de verdad quieres resetear dev)
docker compose -f infra/docker-compose.yml --env-file .env.dev down -v
```

El backend debe apuntar a esta base usando las variables `APP_DB_*` de
`.env.dev` (o la `DATABASE_URL`/config equivalente que arme a partir de
ellas), nunca con credenciales hardcodeadas.

---

## Staging / Prod — base de datos ya desplegada en la VPS

En staging y prod, Postgres **ya está desplegado y gestionado directamente
en la VPS** (no vía este `docker-compose.yml`, igual que ocurre con la base
de datos de Keycloak). No hay que instalar ni levantar nada: solo apuntar el
backend a la instancia existente mediante variables de entorno.

Cada ambiente tiene su propia base de datos aislada — nunca se comparte la
misma base de datos ni las mismas credenciales entre `staging` y `prod`.

### Variables requeridas

En `.env.staging` / `.env.prod` (no versionados, creados a partir de
`.env.example`):

| Variable | Descripción |
|---|---|
| `APP_DB_HOST` | Host/IP o DNS interno de la VPS donde corre Postgres |
| `APP_DB_PORT` | Puerto donde escucha esa instancia (normalmente 5432) |
| `APP_DB_NAME` | `vca_pos_staging` o `vca_pos_prod` según el ambiente |
| `APP_DB_USERNAME` | Usuario de aplicación con permisos sobre esa base |
| `APP_DB_PASSWORD` | Password del usuario anterior (nunca commitear el valor real) |

El servicio `app-db` de `infra/docker-compose.yml` tiene `profiles: [dev]`,
por lo que al correr `docker compose --env-file .env.staging up -d` (sin
`--profile dev`) **no intentará levantar ninguna base de datos** — solo
arrancará Keycloak y los demás servicios que no dependan de ese profile.

### Responsabilidad de la base ya desplegada

- La creación de la base (`vca_pos_staging`, `vca_pos_prod`), el usuario y
  sus permisos se gestionan manualmente en la VPS (fuera de este repo), tal
  como ocurre hoy con las bases de Keycloak.
- Si en algún momento se documenta el proceso de instalación/configuración
  de Postgres directamente en la VPS (fuera de Docker), debe agregarse como
  una sección aparte en este mismo archivo — hoy no está cubierto porque
  el despliegue ya existe y se gestiona fuera de este repositorio.
