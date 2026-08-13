# VCA POS — Valiente Café

Sistema de punto de venta (POS) para Valiente Café: landing pública +
panel de administración (cafés de especialidad, cursos/talleres, empleados,
turnos y nómina).

- `apps/backend` — API en FastAPI (Python, gestionado con [`uv`](https://docs.astral.sh/uv/))
- `apps/frontend` — Landing pública + panel de administración (React + Vite + TypeScript)
- `keycloak/` — Configuración de Keycloak (IAM/seguridad)
- `infra/` — Docker Compose y configuración de despliegue
- `docs/` — Documentación del proyecto — **empieza en [`docs/README.md`](docs/README.md)**

La autenticación/autorización se maneja con **Keycloak** — ni el backend ni
el frontend implementan login propio. Ver [`CLAUDE.md`](CLAUDE.md) para las
reglas completas de arquitectura y flujo de trabajo de este repo.

## Documentación

| Quiero... | Ver |
|---|---|
| Levantar el proyecto en dev, staging o prod, paso a paso | [`docs/deployment.md`](docs/deployment.md) |
| Entender las bases de datos (app + Keycloak) | [`docs/database.md`](docs/database.md) |
| Configurar Keycloak (clients, roles, provisioning) | [`docs/keycloak.md`](docs/keycloak.md) |
| Seguridad: usuario de despliegue, secretos, checklist por ambiente | [`docs/security.md`](docs/security.md) |
| Arquitectura de código, ramas, flujo de trabajo con Claude Code | [`CLAUDE.md`](CLAUDE.md) |
| Endpoints y detalle del backend | [`apps/backend/README.md`](apps/backend/README.md) |
| Rutas y detalle del frontend | [`apps/frontend/README.md`](apps/frontend/README.md) |

## Quickstart (dev)

```bash
# 1. Base de datos
docker compose -f infra/docker-compose.db.yml --env-file .env.dev up -d

# 2. Keycloak
docker compose -f infra/docker-compose.yml --env-file .env.dev up -d

# 3. Backend
cd apps/backend && uv sync && uv run alembic upgrade head \
  && uv run python -m app.seed.seed_data && uv run fastapi dev app/main.py

# 4. Frontend (en otra terminal)
cd apps/frontend && pnpm install && pnpm dev
```

Requiere `.env.dev` (raíz del repo) y `apps/frontend/.env.local` ya creados
a partir de `.env.example` — el paso a paso completo, con qué poner en cada
uno y cómo provisionar Keycloak, está en
[`docs/deployment.md`](docs/deployment.md#3-dev--paso-a-paso).

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend (Swagger) | http://localhost:8000/docs |
| Keycloak (admin console) | http://localhost:8080 |

## Estructura de ramas

| Rama | Ambiente | Notas |
|------|----------|-------|
| `dev` | Desarrollo | Se puede romper temporalmente. Todo feature branch nace y regresa aquí. |
| `staging` | Pre-producción | Espejo casi exacto de prod. Se usa para QA antes de liberar. |
| `main` | Producción | Protegida. Solo vía PR desde `staging`. |

Ver [`CLAUDE.md`](CLAUDE.md) para el flujo de trabajo completo (ramas, commits, PRs).
