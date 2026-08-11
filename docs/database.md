# Bases de datos (backend/POS y Keycloak)

Este documento explica cómo se despliegan y conectan las bases de datos que
usa el sistema:

- **`APP_DB_*`** — datos de negocio del backend (productos, ventas,
  inventario, etc.), consumidos por `apps/backend`.
- **`KC_DB_*`** — datos propios de Keycloak (realms, usuarios, clients,
  sesiones de IAM). Ver también [`docs/keycloak.md`](keycloak.md).

**Importante:** son dos bases de datos separadas (nombres, usuarios y
credenciales distintos) y nunca deben compartirse ni mezclarse entre sí ni
entre ambientes, aunque convivan dentro del mismo contenedor Postgres.

Motor: **PostgreSQL 16.14** en todos los ambientes.

---

## Un solo modelo de despliegue para los tres ambientes

Dev, staging y prod despliegan la base de datos de la **misma forma**:
`infra/docker-compose.db.yml`, cambiando únicamente el `--env-file`. No hay
un camino distinto para dev y otro para producción — eso es intencional,
para que el mismo runbook sirva en los tres casos (ver
[`docs/deployment.md`](deployment.md) para el paso a paso completo).

Este archivo está separado de `infra/docker-compose.yml` (que trae Keycloak,
backend y frontend) a propósito: la base de datos tiene su propio ciclo de
vida y **nunca debe poder caerse por un redeploy de la aplicación** — un
`docker compose -f infra/docker-compose.yml down` nunca toca este stack.

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
después del primer arranque, hay que resetear el volumen (ver
"Detener / reiniciar" abajo) para que se vuelva a ejecutar.

### Requisitos

- Docker y Docker Compose instalados (local en dev, en la VPS en staging/prod).
- Un archivo `.env.<ambiente>` (no versionado) basado en `.env.example`, con
  al menos estas variables completas:
  - `APP_ENV=dev|staging|prod`
  - `DB_ROOT_USER` / `DB_ROOT_PASSWORD` (superusuario, solo para el init)
  - `DB_PORT=5432` (único puerto expuesto, y solo a `127.0.0.1`)
  - `APP_DB_NAME`, `APP_DB_USERNAME`, `APP_DB_PASSWORD`
  - `KC_DB_NAME`, `KC_DB_USERNAME`, `KC_DB_PASSWORD`

### Cómo se conectan Keycloak y el backend

`infra/docker-compose.db.yml` publica el contenedor de Postgres en la red
`vca-net` con el alias `postgres` — así **el mismo valor** `KC_DB_HOST=postgres`
funciona en dev, staging y prod, sin variar por ambiente.

`APP_DB_HOST` sí cambia según dónde corre el backend:

| Ambiente | Backend corre en | `APP_DB_HOST` |
|---|---|---|
| dev | Local (`uv run fastapi dev`, ver `apps/backend/README.md`) | `localhost` (vía el puerto publicado `DB_PORT`) |
| staging / prod | Contenedor (`infra/docker-compose.yml`, servicio `backend`) | `postgres` (alias de red, igual que Keycloak) |

### Levantar la base de datos

Desde la raíz del repo, para cualquier ambiente:

```bash
docker compose -f infra/docker-compose.db.yml --env-file .env.<ambiente> up -d
```

Esto crea un contenedor `postgres-<ambiente>` con Postgres 16.14, expuesto
en `127.0.0.1:${DB_PORT}` (solo loopback, nunca a la red) y con los datos
persistidos en el volumen `postgres-data-<ambiente>` (sobrevive a reinicios
y a `docker compose down`, pero no a `docker compose down -v`).

Este comando también crea la red `vca-net` si no existe todavía — por eso
**la base de datos siempre se levanta primero**, antes que
`infra/docker-compose.yml` (que la referencia como red externa). El paso a
paso completo, en orden, está en [`docs/deployment.md`](deployment.md).

### Verificar que está arriba

```bash
docker compose -f infra/docker-compose.db.yml --env-file .env.<ambiente> ps

# Base de la app
docker exec -it postgres-<ambiente> psql -U vca_pos_user -d vca_pos_<ambiente>

# Base de Keycloak
docker exec -it postgres-<ambiente> psql -U keycloak_user -d keycloak_<ambiente>
```

### Detener / reiniciar

```bash
# Detener sin borrar datos
docker compose -f infra/docker-compose.db.yml --env-file .env.<ambiente> stop

# Borrar el contenedor pero conservar los datos (el volumen persiste)
docker compose -f infra/docker-compose.db.yml --env-file .env.<ambiente> rm -f

# Borrar TODO incluyendo los datos (destructivo: resetea AMBAS bases,
# app y Keycloak, ya que comparten un solo volumen)
docker compose -f infra/docker-compose.db.yml --env-file .env.<ambiente> down -v
```

El backend debe apuntar a su base usando las variables `APP_DB_*` de
`.env.<ambiente>` (o la config equivalente que arme a partir de ellas),
nunca con credenciales hardcodeadas. Keycloak usa las `KC_DB_*` de la misma
forma.

### Backups

No hay backup automático incluido en el compose — en staging/prod, programa
un `pg_dumpall` periódico contra el contenedor y sube el resultado fuera de
la VPS (ver [`docs/security.md`](security.md#backups)). Prueba el restore al
menos una vez por trimestre: un backup nunca verificado no es, en la
práctica, un backup.
