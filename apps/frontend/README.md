# Frontend — Valiente Café

Landing pública de Valiente Café. React + Vite + TypeScript + Tailwind CSS.

Sitio con routing (`react-router-dom`): Home, `/menu`, `/nosotros`,
`/contacto`, `/cursos/:slug`. La sección "Nuestros cafés de especialidad"
del home es el catálogo completo paginado (6 por página); `/menu` es un
placeholder aparte para el futuro menú del local (bebidas/comida in-house,
no los cafés en bolsa). La sección de cursos del home está paginada (4 por
página). Todo viene del backend (`apps/backend`, ver
[`src/lib/api.ts`](src/lib/api.ts)) — ya no es data estática.
`src/data/location.ts` y `src/data/social.ts` siguen siendo placeholders
locales (dirección, WhatsApp, redes).

## Login y panel de administración

El botón "Ingresa" del header dispara el login real vía `keycloak-js`
(client `vca-pos-frontend`, público + PKCE). Tras loguearse, redirige a
`/admin`:

- Cualquier usuario autenticado ve "Bienvenido, {usuario}".
- Con el rol de realm `Administrador`, además ve dos accesos: "Gestión de
  Cafés de especialidad" (`/admin/cafes`) y "Gestión de Cursos y Talleres"
  (`/admin/cursos`) — tablas con crear/editar/eliminar contra los endpoints
  protegidos del backend.
- El rol `Gerente` solo ve la bienvenida, sin esos menús.

El token vive en memoria (el propio `keycloak-js`), nunca en `localStorage`.
Antes de usar el login en dev, hay que correr
`apps/backend/scripts/setup_keycloak.py` (ver `apps/backend/README.md`) para
crear el realm/clients/roles.

## Desarrollo (dev)

En dev el frontend **no corre en Docker** — se levanta local con Node.
Los comandos se corren parados en `apps/frontend`, no en la raíz del repo:

```bash
cd apps/frontend
pnpm install
pnpm dev      # servidor de desarrollo (HMR)
pnpm build    # build de producción (tsc + vite build)
pnpm lint      # oxlint
```

Necesita el backend corriendo para mostrar cafés/cursos reales (ver
`apps/backend/README.md`, `uv run fastapi dev app/main.py`). Vite no lee el
`.env.dev`/`.env.dev.local` de la raíz del repo (esos son para
docker-compose y el backend) — para el frontend, crea
`apps/frontend/.env.local` (gitignored, patrón `*.local`) con:

```
VITE_API_BASE_URL=http://localhost:8000
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=vca-pos
VITE_KEYCLOAK_CLIENT_ID=vca-pos-frontend
```

## Staging / Prod

En staging y prod el frontend se sirve como estáticos vía `nginx`, construido
por Docker desde `apps/frontend/Dockerfile` (build multi-stage: `pnpm
build` en la etapa de build, `nginx:1.27-alpine` para servir `dist/`). Se
despliega junto al resto de `infra/docker-compose.yml`, en el servicio
`frontend` (`profiles: [staging, prod]`).

```bash
docker compose -f infra/docker-compose.yml --env-file .env.staging --profile staging up -d frontend
docker compose -f infra/docker-compose.yml --env-file .env.prod --profile prod up -d frontend
```

Variables de entorno necesarias (ver `.env.example`):
- `FRONTEND_PORT` — puerto del host mapeado al 80 de nginx dentro del contenedor.
- `VITE_API_BASE_URL` — URL del backend de ese ambiente, pasada como build ARG a `Dockerfile` (`infra/docker-compose.yml`, `frontend.build.args`).

**Importante:** las variables `VITE_*` se compilan dentro del build de Vite
(no son runtime como las de Keycloak) — cada ambiente necesita su propia
imagen construida con sus propios valores; no se puede promover la misma
imagen de staging a prod sin rebuildear.
