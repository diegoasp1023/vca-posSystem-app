# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Este archivo define cómo debe trabajar Claude Code en este repositorio. Léelo por completo antes de hacer cambios.

## Contexto del proyecto

Sistema de punto de venta (POS) para Valiente Café, compuesto por:

- `apps/backend` — API en FastAPI (Python, `uv`)
- `apps/frontend` — Landing pública + panel de administración (React + Vite + TypeScript)
- `keycloak/` — Configuración de Keycloak (IAM / seguridad)
- `infra/` — Docker Compose, configuración de despliegue
- `docs/` — Documentación del proyecto; empieza en `docs/README.md`. `docs/deployment.md` es la guía paso a paso de despliegue (dev/staging/prod), `docs/database.md` la referencia de bases de datos, `docs/keycloak.md` la de Keycloak y `docs/security.md` la de seguridad operativa.

La seguridad (autenticación/autorización) se maneja con **Keycloak**, no se implementa login propio en el backend ni en el frontend.

---

## Comandos comunes

### Backend (`apps/backend`, corre local con `uv`, no en Docker)

```bash
cd apps/backend
uv sync                                      # instala dependencias
uv run alembic upgrade head                  # aplica migraciones
uv run python -m app.seed.seed_data          # carga contenido inicial (idempotente)
uv run fastapi dev app/main.py               # servidor de desarrollo, http://localhost:8000 (docs en /docs)
uv run pytest                                # corre todos los tests
uv run pytest tests/test_products.py         # un solo archivo de test
uv run pytest tests/test_products.py::test_x -v   # un solo test
uv run alembic revision --autogenerate -m "descripción"   # nueva migración tras cambiar app/models/
```

Los tests corren contra SQLite en memoria (`tests/conftest.py`), no requieren Postgres levantado. Necesita la Postgres de dev corriendo para uso normal (ver sección Docker Compose) y un `.env.dev.local`/`.env.dev`/`.env` en la **raíz del repo** (no en `apps/backend/`) — `app/core/config.py` lo lee de ahí.

### Frontend (`apps/frontend`, corre local con Node, no en Docker)

```bash
cd apps/frontend
pnpm install
pnpm dev        # servidor de desarrollo (HMR), http://localhost:5173
pnpm build       # tsc -b && vite build
pnpm lint         # oxlint
```

Necesita el backend corriendo (`http://localhost:8000`) para mostrar cafés/cursos reales, y su propio `apps/frontend/.env.local` (gitignored) con `VITE_API_BASE_URL`, `VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM`, `VITE_KEYCLOAK_CLIENT_ID` — Vite **no** lee los `.env.dev*` de la raíz del repo.

### Base de datos y Keycloak (dev)

Postgres y Keycloak viven en dos archivos de compose distintos (ver sección
"Docker Compose" más abajo), siempre en ese orden:

```bash
# 1. Postgres (crea la red vca-net)
docker compose -f infra/docker-compose.db.yml --env-file .env.dev up -d

# 2. Keycloak
docker compose -f infra/docker-compose.yml --env-file .env.dev up -d

# Provisionar realm/clients/roles de Keycloak (una vez, idempotente)
cd apps/backend
uv run python scripts/setup_keycloak.py --with-test-user
```

Ver `docs/database.md` para el detalle completo (cómo se crean las dos bases dentro del mismo contenedor, requisitos de `.env.dev`, verificación, etc.), `docs/keycloak.md` para Keycloak y `docs/deployment.md` para el paso a paso completo de los tres ambientes.

---

## Arquitectura

### Backend (`apps/backend/app/`)

FastAPI + SQLAlchemy 2.0 async + Alembic, contra Postgres (`vca_pos_dev`/`staging`/`prod`).

- `main.py` registra los routers de `app/api/` (`products`, `courses`, `lookups`, `employees`, `shifts`, `payroll`) y expone `/api/health`.
- `app/core/auth.py` — valida JWTs de Keycloak vía JWKS (`PyJWKClient`), sin manejar contraseñas ni sesiones propias. `get_current_user` extrae roles de `realm_access.roles`; `require_admin` exige el rol de realm `Administrador`. Los endpoints de escritura de `products`/`courses` (y las vistas `/admin`) requieren ese rol.
- `app/core/config.py` — `Settings` (pydantic-settings) lee env vars desde los archivos de la **raíz del repo**, no desde `apps/backend/`: `.env.dev.local` → `.env.dev` → `.env`, en ese orden de prioridad.
- `app/core/payroll.py` — lógica de cálculo de nómina (separada de los endpoints en `app/api/payroll.py`).
- `app/models/` — modelos SQLAlchemy (`course`, `employee`, `payroll`, `product`, `shift`); cualquier cambio aquí necesita una migración de Alembic (`alembic revision --autogenerate`).
- `app/schemas/` — schemas Pydantic de request/response, un archivo por dominio + `common.py` para paginación/formas compartidas.
- `app/seed/seed_data.py` — carga de contenido real inicial (cafés, cursos), no duplica si ya existe.
- Contenido bilingüe: los campos de texto de productos/cursos vienen como `{es, en}` en la misma respuesta, para que el toggle de idioma del frontend no dispare otra request.

### Frontend (`apps/frontend/src/`)

React 19 + Vite + TypeScript + Tailwind CSS 4, routing con `react-router-dom`.

- `lib/api.ts` — cliente para los endpoints públicos del backend; `lib/adminApi.ts` — cliente para los endpoints protegidos (adjunta el bearer token).
- `lib/keycloak.ts` + `context/AuthContext.tsx` — login vía `keycloak-js` (client `valiente-cafe-app-frontend`, público + PKCE). El token vive en memoria, nunca en `localStorage`.
- `pages/admin/` — panel de administración: `ProtectedRoute.tsx` exige sesión, `RequireAdmin.tsx` exige el rol `Administrador`. `AdminProductsPage`/`AdminCoursesPage`/`AdminEmployeesPage` son las vistas CRUD; `TurnosTab`/`ShiftsCalendar` (turnos) y `BonosTab`/`ResumenTab`/`PayrollShared` (nómina) viven bajo el mismo panel.
- `data/location.ts` y `data/social.ts` siguen siendo placeholders locales (no vienen del backend).
- `i18n.ts` — configuración de `react-i18next`; el contenido bilingüe de productos/cursos llega ya resuelto desde el backend en la forma `Localized<T>`, no se traduce en el cliente.

### Ambientes y despliegue

- `dev`: backend y frontend corren locales (`uv`/`pnpm`); Postgres (`infra/docker-compose.db.yml`) y Keycloak (`infra/docker-compose.yml`, sin profile) corren en Docker.
- `staging`/`prod`: el frontend se sirve como build estático vía `nginx` (`apps/frontend/Dockerfile`, multi-stage); las variables `VITE_*` se compilan en build time (build ARG), así que **no se puede promover la misma imagen de staging a prod** sin rebuildear.
- Keycloak arranca con `KC_COMMAND=start-dev` en dev y `start --optimized` en staging/prod — nunca intercambiar estos modos entre ambientes.

---

## Estructura de ramas (obligatorio respetar)

| Rama        | Ambiente        | Notas                                                                    |
| ----------- | --------------- | ------------------------------------------------------------------------ |
| `dev`     | Desarrollo      | Se puede romper temporalmente. Todo feature branch nace y regresa aquí. |
| `staging` | Pre-producción | Espejo casi exacto de prod. Se usa para QA antes de liberar.             |
| `main`    | Producción     | Protegida. Nunca push directo. Solo vía PR desde`staging`.            |

- Nunca hacer push directo a `main` o `staging`. Los cambios llegan ahí solo por PR desde la rama anterior en el flujo (`dev` → `staging` → `main`).
- Los feature branches se crean desde `dev` con el patrón `feature/nombre-corto` o `fix/nombre-corto`, y su PR apunta de vuelta a `dev`.
- Si se pide "desplegar a producción" o similar, recordar que `main` requiere PR + review, no es un push automático.

---

## Flujo de trabajo con Claude Code (obligatorio)

Cuando se pida corregir un bug, hacer un ajuste o implementar algo puntual:

1. **Crear rama antes de tocar código.** Siempre partir de `dev` actualizado, con
   el patrón `fix/nombre-corto` o `feature/nombre-corto` según corresponda.
   No trabajar directo sobre `dev`.
2. **Nunca hacer commit sin preguntar primero.** Después de cada cambio (o
   grupo pequeño de cambios relacionados), mostrar un resumen de qué se
   modificó y por qué, y esperar aprobación explícita antes de correr
   `git commit`. No asumir aprobación por continuidad de la conversación.
3. **Commits pequeños y atómicos.** Un commit = un cambio con sentido propio
   (ej. no mezclar un fix de backend con un ajuste de estilo en frontend). Si
   una tarea generó cambios en varios frentes, dividir en varios commits, cada
   uno con su propio mensaje conventional commit, preguntando por la
   aprobación de cada uno (por separado o en bloque, según lo indique el
   usuario en el momento). Los commit deben ser en conventional commit en ingles.
4. **PR solo después de que el/los commits estén aprobados.** Una vez
   aprobado el último commit de la rama, abrir el PR hacia `dev` (nunca hacia
   `staging` o `main` directamente, ver tabla de ramas arriba). Incluir en la
   descripción del PR un resumen breve de los commits incluidos.
5. Si a mitad de la tarea surge la necesidad de un cambio no relacionado al
   ajuste original, avisar y sugerir manejarlo en una rama/PR aparte en vez de
   mezclarlo.
6. No crear specs de una vez al desarrollo, y no usar el mcp de claude-chrome
   para ver el frontend yo lo verificare.

---

## Variables de entorno

- Nunca commitear archivos `.env`, `.env.dev`, `.env.staging`, `.env.prod`.
- El único archivo de entorno que se commitea es `.env.example`, con valores placeholder (`changeme`) y comentarios en inglés explicando cada variable.
- Si se agrega una variable de entorno nueva a cualquier `.env.*`, se debe reflejar también en `.env.example` en el mismo commit/PR.
- Patrón en `.gitignore`: `.env*` / `!.env.example`.

---

## Keycloak

- **No se está usando import automático de realms todavía** (`--import-realm`). La configuración de realms, clients y roles se hace manualmente desde la consola admin en cada ambiente, o vía `apps/backend/scripts/setup_keycloak.py` en dev (idempotente).
- No crear archivos en `keycloak/realm-export/` ni agregar `--import-realm`/volúmenes de import al `docker-compose.yml` a menos que se pida explícitamente.
- `keycloak/themes/vca-pos/login` es el tema de login con la marca de Valiente Café (logo, colores coral/lavender, tipografía) — montado en el contenedor vía `infra/docker-compose.yml` (`../keycloak/themes:/opt/keycloak/themes:ro`) y aplicado por `scripts/setup_keycloak.py` (`loginTheme`). No crear otras subcarpetas (`providers/`, `realm-export/`) de forma anticipada.
- El client `valiente-cafe-app-backend` es **confidential** (usa client secret, corre en servidor). El client `valiente-cafe-app-frontend` es **public + PKCE** — nunca agregarle client secret.
- Cada ambiente tiene su propia base de datos aislada de Keycloak (`keycloak_dev`, `keycloak_staging`, `keycloak_prod`) y su propio realm — nunca compartir entre ambientes.

---

## Docker Compose

- Dos archivos, separados por responsabilidad (no por ambiente):
  - `infra/docker-compose.db.yml` — solo Postgres. Se levanta primero (crea la red externa `vca-net`) y su ciclo de vida es independiente del resto: un redeploy de la app nunca lo debe tocar.
  - `infra/docker-compose.yml` — Keycloak, backend y frontend. Se conecta a `vca-net` como red externa.
- Ambos funcionan para los 3 ambientes vía `--env-file` (`.env.dev`, `.env.staging`, `.env.prod`); `infra/docker-compose.yml` además necesita `--profile staging`/`--profile prod` para levantar backend/frontend (en dev corren locales, no en Docker).
- No hardcodear valores de host, puertos, credenciales o nombres de contenedor directamente en el YAML — todo debe venir de variables de entorno (`${VARIABLE}`).
- No agregar `docker-compose.prod.yml` u otros archivos separados por ambiente salvo que se solicite; la única separación válida es por responsabilidad (base de datos vs. resto de la app), no por ambiente.
- Al probar cambios en `infra/docker-compose*.yml`, usar `-p <nombre>` para aislar el stack de pruebas del stack de dev real del usuario.

---

## Seguridad — reglas generales

- El backend nunca debe implementar su propio manejo de contraseñas o sesiones — toda autenticación pasa por Keycloak (validación de JWT contra JWKS).
- No guardar tokens de acceso/refresh en `localStorage` del frontend salvo que se indique explícitamente lo contrario. El patrón actual es token en memoria vía `keycloak-js`.
- Nunca escribir secretos, contraseñas o client secrets directamente en código, YAML versionado, o archivos JSON de realm que se vayan a commitear.

---

## Estilo de trabajo esperado

- Antes de crear carpetas o archivos nuevos, revisar si ya existe una convención establecida en este documento o en `docs/`.
- Si una tarea implica una decisión de arquitectura no cubierta aquí (ej. nueva base de datos, nuevo servicio, cambio de flujo de auth), preguntar antes de implementar en lugar de asumir.
- Mantener consistencia entre `.env.example`, los `docker-compose*.yml` y la documentación en `docs/` (`keycloak/README.md` es solo un puntero corto a `docs/keycloak.md`) — si se cambia una variable en un lado, actualizar los demás en el mismo cambio.
- No incluir trailers de Claude (`Co-Authored-By`, `Claude-Session`) en los mensajes de commit.
- Se debe usar conventional commit en cada commit (ver detalle de tamaño y aprobación de commits en "Flujo de trabajo con Claude Code" arriba).
