# Bases de datos (backend/POS y Keycloak)

Este documento explica cómo desplegar y conectar las bases de datos que usa
el sistema:

- **`APP_DB_*`** — datos de negocio del backend (productos, ventas,
  inventario, etc.), consumidos por `apps/backend`.
- **`KC_DB_*`** — datos propios de Keycloak (realms, usuarios, clients,
  sesiones de IAM). Ver también `keycloak/README.md`.

**Importante:** son dos bases de datos separadas (nombres, usuarios y
credenciales distintos) y nunca deben compartirse ni mezclarse entre sí ni
entre ambientes, aunque en dev convivan en el mismo contenedor.

Motor: **PostgreSQL 16.14** en todos los ambientes.

---

## Dev — un solo contenedor Docker para ambas bases

En desarrollo, ambas bases viven dentro de **un único contenedor Postgres**
(servicio `postgres` en `infra/docker-compose.yml`, profile `dev`), para
usar un solo puerto expuesto en vez de levantar dos contenedores. Cada base
mantiene su propio nombre, usuario y password — internamente son bases
distintas dentro del mismo servidor Postgres, no una base compartida.

Este servicio está bajo el profile `dev`, por lo que **solo se levanta
cuando se pide explícitamente** y nunca se activa en staging/prod.

### Cómo se crean las dos bases

En el primer arranque (volumen de datos vacío), la imagen oficial de
Postgres ejecuta automáticamente los scripts en
`infra/postgres-init/init-databases.sh`, que:

1. Se conecta como el superusuario `DB_ROOT_USER` (bootstrap, solo se usa
   para esto).
2. Crea la base `APP_DB_NAME` con el usuario `APP_DB_USERNAME` como owner.
3. Crea la base `KC_DB_NAME` con el usuario `KC_DB_USERNAME` como owner.
4. Deja al usuario de cada base como owner del schema `public` de esa base
   (necesario desde Postgres 15+, que ya no da `CREATE` sobre `public` por
   defecto — sin este paso, Keycloak/el backend fallan al crear sus tablas
   con `permission denied for schema public`).

`APP_DB_USERNAME` y `KC_DB_USERNAME` pueden ser el mismo usuario si así lo
prefieres (el script no falla si ya existe), aunque lo recomendado es usar
usuarios distintos para mantener las credenciales de Keycloak separadas de
las de la aplicación.

Si el volumen ya tiene datos, este script **no vuelve a correr** (comportamiento
estándar de `/docker-entrypoint-initdb.d`). Si cambias `APP_DB_*`/`KC_DB_*`
después del primer arranque, hay que resetear el volumen
(`docker compose ... down -v`) para que se vuelva a ejecutar.

### Requisitos

- Docker y Docker Compose instalados localmente.
- Un archivo `.env.dev` (no versionado) basado en `.env.example`, con al
  menos estas variables completas:
  - `APP_ENV=dev`
  - `DB_ROOT_USER` / `DB_ROOT_PASSWORD` (superusuario, solo para el init)
  - `DB_PORT=5432` (único puerto expuesto al host)
  - `APP_DB_HOST=postgres`, `APP_DB_NAME=vca_pos_dev`, `APP_DB_USERNAME`, `APP_DB_PASSWORD`
  - `KC_DB_HOST=postgres`, `KC_DB_NAME=keycloak_dev`, `KC_DB_USERNAME`, `KC_DB_PASSWORD`

`APP_DB_HOST` y `KC_DB_HOST` valen `postgres` porque backend/Keycloak se
conectan al servicio por su nombre en la red `vca-net` (DNS interno de
Docker), no por `localhost`.

### Levantar la base de datos

Desde la raíz del repo:

```bash
docker compose -f infra/docker-compose.yml --env-file .env.dev --profile dev up -d postgres
```

Esto crea un contenedor `postgres-dev` con Postgres 16.14, expuesto en
`localhost:${DB_PORT}` (5432 por defecto) y con los datos persistidos en el
volumen `postgres-data` (sobrevive a reinicios y a `docker compose down`,
pero no a `docker compose down -v`).

Si en el mismo paso quieres levantar también Keycloak:

```bash
docker compose -f infra/docker-compose.yml --env-file .env.dev --profile dev up -d
```

(Keycloak no tiene profile, así que siempre se levanta; `postgres` solo se
suma cuando se pasa `--profile dev`.)

### Verificar que está arriba

```bash
docker compose -f infra/docker-compose.yml --env-file .env.dev ps

# Base de la app
docker exec -it postgres-dev psql -U vca_pos_user -d vca_pos_dev

# Base de Keycloak
docker exec -it postgres-dev psql -U keycloak_user -d keycloak_dev
```

### Detener / reiniciar

```bash
# Detener sin borrar datos
docker compose -f infra/docker-compose.yml --env-file .env.dev stop postgres

# Borrar el contenedor pero conservar los datos (volumen persiste)
docker compose -f infra/docker-compose.yml --env-file .env.dev rm -f postgres

# Borrar TODO incluyendo los datos (destructivo: resetea AMBAS bases,
# app y Keycloak, ya que comparten un solo volumen)
docker compose -f infra/docker-compose.yml --env-file .env.dev down -v
```

El backend debe apuntar a su base usando las variables `APP_DB_*` de
`.env.dev` (o la `DATABASE_URL`/config equivalente que arme a partir de
ellas), nunca con credenciales hardcodeadas. Keycloak usa las `KC_DB_*` de
la misma forma.

---

## Staging / Prod — bases de datos ya desplegadas en la VPS

En staging y prod, **ambas bases ya están desplegadas y gestionadas
directamente en la VPS** (no vía este `docker-compose.yml`). No hay que
instalar ni levantar nada: solo apuntar backend y Keycloak a las instancias
existentes mediante variables de entorno.

Cada ambiente tiene sus propias bases aisladas — nunca se comparte la misma
base de datos ni las mismas credenciales entre `staging` y `prod`, ni entre
la base de la app y la de Keycloak.

### Variables requeridas

En `.env.staging` / `.env.prod` (no versionados, creados a partir de
`.env.example`):

| Variable | Descripción |
|---|---|
| `APP_DB_HOST` | Host/IP o DNS interno de la VPS donde corre la base de la app |
| `APP_DB_NAME` | `vca_pos_staging` o `vca_pos_prod` según el ambiente |
| `APP_DB_USERNAME` / `APP_DB_PASSWORD` | Credenciales del usuario de aplicación |
| `KC_DB_HOST` | Host/IP o DNS interno de la VPS donde corre la base de Keycloak |
| `KC_DB_NAME` | `keycloak_staging` o `keycloak_prod` según el ambiente |
| `KC_DB_USERNAME` / `KC_DB_PASSWORD` | Credenciales del usuario de Keycloak |

`DB_ROOT_USER`, `DB_ROOT_PASSWORD` y `DB_PORT` **no aplican** en staging/prod
— solo existen para el bootstrap del contenedor `postgres` de dev.

El servicio `postgres` de `infra/docker-compose.yml` tiene
`profiles: [dev]`, por lo que al correr
`docker compose --env-file .env.staging up -d` (sin `--profile dev`)
**no intentará levantar ninguna base de datos** — solo arrancará Keycloak y
los demás servicios que no dependan de ese profile.

### Responsabilidad de las bases ya desplegadas

- La creación de las bases (`vca_pos_staging`/`prod`,
  `keycloak_staging`/`prod`), los usuarios y sus permisos se gestionan
  manualmente en la VPS (fuera de este repo).
- Si en algún momento se documenta el proceso de instalación/configuración
  de Postgres directamente en la VPS (fuera de Docker), debe agregarse como
  una sección aparte en este mismo archivo — hoy no está cubierto porque el
  despliegue ya existe y se gestiona fuera de este repositorio.
