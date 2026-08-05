# Backend — VCA POS API

API en FastAPI para el sistema POS de Valiente Café. Fase actual: endpoints
públicos de solo lectura para los cafés de especialidad y los cursos/talleres
(paginados), que reemplazan la data estática que antes vivía en el frontend.

No implementa autenticación/autorización propia — eso lo valida Keycloak
(JWT), sin manejo de contraseñas ni sesiones en este servicio.

## Stack

- FastAPI + SQLAlchemy 2.0 (async) + Alembic
- Postgres (la misma base `vca_pos_dev`/`staging`/`prod` documentada en
  [`docs/database.md`](../../docs/database.md))
- Gestión de dependencias con [`uv`](https://docs.astral.sh/uv/)

## Desarrollo (dev)

El backend **no corre en Docker** — se levanta local con `uv`, igual que el
frontend con `npm run dev`. Se conecta a la Postgres compartida (ver
`docs/database.md`) vía `localhost:${DB_PORT}`.

Requisitos:
- [uv](https://docs.astral.sh/uv/getting-started/installation/) instalado.
- La base de datos de dev corriendo (`docker compose ... --profile dev up -d postgres`, ver `docs/database.md`).
- Un archivo `.env.dev` o `.env.dev.local` en la raíz del repo (no versionado, basado en `.env.example`) con `APP_DB_HOST=localhost`, `DB_PORT`, `APP_DB_NAME`, `APP_DB_USERNAME`, `APP_DB_PASSWORD` completos. El backend lee ese archivo automáticamente (busca `.env.dev.local`, luego `.env.dev`, luego `.env` en la raíz del repo).

```bash
cd apps/backend
uv sync                          # instala dependencias

uv run alembic upgrade head      # aplica las migraciones
uv run python -m app.seed.seed_data   # carga el contenido real (4 cafés, 4 cursos) — no duplica si ya existe

uv run fastapi dev app/main.py   # servidor de desarrollo, http://localhost:8000
```

Documentación interactiva (Swagger) en `http://localhost:8000/docs` una vez
corriendo.

## Migraciones

Cada cambio al modelo de datos (`app/models/`) necesita una migración de
Alembic:

```bash
uv run alembic revision --autogenerate -m "descripción del cambio"
uv run alembic upgrade head
```

## Tests

```bash
uv run pytest
```

Corren contra SQLite en memoria (no contra la Postgres de dev), así que no
requieren la base de datos levantada.

## Endpoints (fase actual)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/products` | Cafés de especialidad, paginados de a 6 (`?page=`) |
| GET | `/api/courses` | Cursos y talleres, paginados de a 4 (`?page=`) |
| GET | `/api/courses/{slug}` | Detalle de un curso |
| GET | `/api/health` | Healthcheck |

Cada item viene con sus campos de texto en `{es, en}` (igual forma que ya
usaba el frontend en `Localized<T>`), para que el toggle de idioma siga
siendo instantáneo sin volver a pedir datos.
