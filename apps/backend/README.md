# Backend — VCA POS API

API en FastAPI para el sistema POS de Valiente Café. Fase actual: endpoints
públicos de solo lectura para los cafés de especialidad y los cursos/talleres
(paginados), que reemplazan la data estática que antes vivía en el frontend.

No implementa autenticación/autorización propia — valida el JWT que emite
Keycloak contra sus llaves públicas (JWKS), sin manejar contraseñas ni
sesiones en este servicio. Los endpoints de escritura (`POST`/`PUT`/`DELETE`
de `/api/products` y `/api/courses`, más `GET .../admin`) requieren un JWT
válido con el rol de realm `Administrador`.

## Stack

- FastAPI + SQLAlchemy 2.0 (async) + Alembic
- Postgres (la misma base `vca_pos_dev`/`staging`/`prod` documentada en
  [`docs/database.md`](../../docs/database.md))
- Gestión de dependencias con [`uv`](https://docs.astral.sh/uv/)

## Desarrollo (dev)

El backend **no corre en Docker** — se levanta local con `uv`, igual que el
frontend con `pnpm dev`. Se conecta a la Postgres compartida (ver
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

## Keycloak (realm, clients, roles)

`CLAUDE.md` establece que la configuración de Keycloak se hace manualmente
vía consola admin, sin `--import-realm` en el contenedor. Para no repetir
esos pasos a mano en cada ambiente, `scripts/setup_keycloak.py` los hace vía
la API REST de administración de Keycloak — corre una sola vez contra un
Keycloak ya levantado, es idempotente (se puede re-correr sin duplicar
nada), y **no** toca `docker-compose.yml` ni activa import automático.

Crea:
- Realm `vca-pos`
- Client `vca-pos-frontend` (público, PKCE S256, redirect URI de dev `http://localhost:5173/*`)
- Client `vca-pos-backend` (confidential, reservado — no se usa todavía)
- Roles de realm `Administrador` y `Cajero`
- Opcionalmente, un usuario de prueba con rol `Administrador`

```bash
# Con Keycloak corriendo (docker compose ... --profile dev up -d keycloak)
uv run python scripts/setup_keycloak.py --with-test-user
```

La contraseña del usuario de prueba se imprime una sola vez en la salida del
script — no queda guardada en ningún archivo. Para re-crearlo, borralo desde
la consola admin de Keycloak y volvé a correr el script.

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

## Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/products` | Público | Cafés activos, paginados de a 6 (`?page=`) |
| GET | `/api/products/admin` | Administrador | Todos los cafés (incluye inactivos), paginados |
| POST | `/api/products` | Administrador | Crear café |
| PUT | `/api/products/{id}` | Administrador | Editar café |
| DELETE | `/api/products/{id}` | Administrador | Eliminar café |
| GET | `/api/courses` | Público | Cursos activos, paginados de a 4 (`?page=`) |
| GET | `/api/courses/{slug}` | Público | Detalle de un curso activo |
| GET | `/api/courses/admin` | Administrador | Todos los cursos (incluye inactivos), paginados |
| GET | `/api/courses/admin/{id}` | Administrador | Detalle de un curso por id (incluye inactivos) |
| POST | `/api/courses` | Administrador | Crear curso |
| PUT | `/api/courses/{id}` | Administrador | Editar curso (reemplaza objetivos/contenido/costos) |
| DELETE | `/api/courses/{id}` | Administrador | Eliminar curso |
| GET | `/api/presentations` | Público | Catálogo de presentaciones (Molido/En grano) |
| GET | `/api/payment-methods` | Público | Catálogo de métodos de pago |
| GET | `/api/health` | Público | Healthcheck |

Cada item viene con sus campos de texto en `{es, en}` (igual forma que ya
usaba el frontend en `Localized<T>`), para que el toggle de idioma siga
siendo instantáneo sin volver a pedir datos.
