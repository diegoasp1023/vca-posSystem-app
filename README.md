# VCA POS — Valiente Café

Sistema de punto de venta (POS) para Valiente Café: landing pública +
panel de administración (cafés de especialidad, cursos/talleres, empleados,
turnos y nómina).

- `apps/backend` — API en FastAPI (Python, gestionado con [`uv`](https://docs.astral.sh/uv/))
- `apps/frontend` — Landing pública + panel de administración (React + Vite + TypeScript)
- `keycloak/` — Configuración de Keycloak (IAM/seguridad)
- `infra/` — Docker Compose y configuración de despliegue
- `docs/` — Documentación del proyecto (`docs/database.md` es la referencia completa de las bases de datos)

La autenticación/autorización se maneja con **Keycloak** — ni el backend ni
el frontend implementan login propio. Ver [`CLAUDE.md`](CLAUDE.md) para las
reglas completas de arquitectura y flujo de trabajo de este repo.

## Requisitos previos

- [Docker](https://docs.docker.com/get-docker/) y Docker Compose (para Postgres y Keycloak en dev).
- [uv](https://docs.astral.sh/uv/getting-started/installation/) (backend).
- [Node.js](https://nodejs.org/) 20+ y npm (frontend).

## Desplegar en dev (paso a paso)

En dev, **solo Postgres y Keycloak corren en Docker**; el backend y el
frontend se levantan locales. Todos los comandos parten de la raíz del repo
salvo que se indique lo contrario.

### 1. Variables de entorno

Crea `.env.dev` (o `.env.dev.local`, tiene prioridad) en la **raíz del
repo**, a partir de [`.env.example`](.env.example), completando al menos
`DB_ROOT_USER`/`DB_ROOT_PASSWORD`, `APP_DB_*`, `KC_DB_*` y
`KEYCLOAK_ADMIN_USER`/`KEYCLOAK_ADMIN_PASSWORD`. Ninguno de estos archivos se
commitea (ver `.gitignore`).

Crea también `apps/frontend/.env.local` (Vite no lee los `.env.dev*` de la
raíz):

```
VITE_API_BASE_URL=http://localhost:8000
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=vca-pos
VITE_KEYCLOAK_CLIENT_ID=vca-pos-frontend
```

### 2. Levantar Postgres + Keycloak

```bash
docker compose -f infra/docker-compose.yml --env-file .env.dev --profile dev up -d
```

Esto expone Postgres en `localhost:${DB_PORT}` (5432 por defecto, con las
bases `vca_pos_dev` y `keycloak_dev` dentro del mismo contenedor) y Keycloak
en `http://localhost:8080`. Detalle completo en
[`docs/database.md`](docs/database.md).

### 3. Backend

```bash
cd apps/backend
uv sync                                     # instala dependencias
uv run alembic upgrade head                 # aplica migraciones
uv run python -m app.seed.seed_data         # carga contenido inicial (idempotente)
uv run fastapi dev app/main.py              # http://localhost:8000 (docs en /docs)
```

### 4. Provisionar Keycloak (una vez, idempotente)

Con Keycloak ya arriba, crea el realm `vca-pos`, los clients
(`vca-pos-frontend` público+PKCE, `vca-pos-backend` confidential) y los
roles (`Administrador`, `Gerente`):

```bash
cd apps/backend
uv run python scripts/setup_keycloak.py --with-test-user
```

La contraseña del usuario de prueba se imprime una sola vez en la salida del
script — no queda guardada en ningún archivo.

### 5. Frontend

```bash
cd apps/frontend
npm install
npm run dev      # http://localhost:5173
```

### Resultado

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend (Swagger) | http://localhost:8000/docs |
| Keycloak (admin console) | http://localhost:8080 |

Más detalle por app: [`apps/backend/README.md`](apps/backend/README.md),
[`apps/frontend/README.md`](apps/frontend/README.md),
[`keycloak/README.md`](keycloak/README.md).

## Bajar recursos y limpiar (dev)

Backend (`fastapi dev`) y frontend (`npm run dev`) se detienen con `Ctrl+C`
en su propia terminal.

Si en cambio quedaron corriendo en background (por ejemplo, se lanzaron con
`&` o desde otra sesión), matalos por el puerto que ocupan:

```bash
# Backend (puerto 8000)
kill $(lsof -ti:8000)

# Frontend (puerto 5173)
kill $(lsof -ti:5173)

# Si no cede con SIGTERM, forzar:
kill -9 $(lsof -ti:8000)
kill -9 $(lsof -ti:5173)
```

`lsof -ti:<puerto>` devuelve el PID que tiene ese puerto abierto; sirve igual
para encontrar cualquier proceso colgado en `8000`/`5173` sin tener que
buscarlo por nombre.

Para Postgres y Keycloak:

```bash
# Detener los contenedores sin borrar datos (se pueden volver a levantar con `up -d`)
docker compose -f infra/docker-compose.yml --env-file .env.dev --profile dev stop

# Detener y eliminar los contenedores, conservando el volumen de datos
docker compose -f infra/docker-compose.yml --env-file .env.dev --profile dev down

# Eliminar TODO incluyendo los datos (destructivo: resetea ambas bases,
# app y Keycloak, ya que comparten un solo volumen — hay que volver a
# migrar/seedear/provisionar Keycloak después)
docker compose -f infra/docker-compose.yml --env-file .env.dev --profile dev down -v
```

Detalle y comandos equivalentes por servicio en
[`docs/database.md`](docs/database.md#detener--reiniciar).

## Staging / Producción

- El frontend se sirve como build estático vía `nginx`, construido por
  Docker (`apps/frontend/Dockerfile`, multi-stage). Las variables `VITE_*`
  se compilan en build time — no se puede promover la misma imagen de
  staging a prod sin rebuildear.

  ```bash
  docker compose -f infra/docker-compose.yml --env-file .env.staging --profile staging up -d frontend
  docker compose -f infra/docker-compose.yml --env-file .env.prod --profile prod up -d frontend
  ```

- Keycloak arranca con `KC_COMMAND=start --optimized` (nunca `start-dev`) en
  estos ambientes.
- Las bases de datos (app y Keycloak) ya están desplegadas y gestionadas
  directamente en la VPS — el servicio `postgres` del compose es
  exclusivo de dev (`profiles: [dev]`) y no se levanta aquí. Detalle en
  [`docs/database.md`](docs/database.md).
- La configuración de realms/clients/roles de Keycloak en estos ambientes se
  hace manualmente desde la consola admin (ver
  [`keycloak/README.md`](keycloak/README.md)).

## Estructura de ramas

| Rama | Ambiente | Notas |
|------|----------|-------|
| `dev` | Desarrollo | Se puede romper temporalmente. Todo feature branch nace y regresa aquí. |
| `staging` | Pre-producción | Espejo casi exacto de prod. Se usa para QA antes de liberar. |
| `main` | Producción | Protegida. Solo vía PR desde `staging`. |

Ver [`CLAUDE.md`](CLAUDE.md) para el flujo de trabajo completo (ramas, commits, PRs).
