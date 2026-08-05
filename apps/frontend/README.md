# Frontend — Valiente Café

Landing pública de Valiente Café. React + Vite + TypeScript + Tailwind CSS.

Por ahora es una sola página estática (sin routing, sin autenticación): Hero,
Menú y Ubicación/Horario. Los datos de `src/data/menu.ts` y
`src/data/location.ts` son placeholders — `menu.ts` está tipado (`Product[]`)
pensando en reemplazarse por un fetch al backend más adelante sin tener que
tocar los componentes que lo consumen.

El botón "Ingresa" en el header todavía no tiene funcionalidad — quedará
conectado al login de Keycloak (client `vca-pos-frontend`, público + PKCE)
cuando se implemente esa parte del sistema.

## Desarrollo (dev)

En dev el frontend **no corre en Docker** — se levanta local con Node.
Los comandos se corren parados en `apps/frontend`, no en la raíz del repo:

```bash
cd apps/frontend
npm install
npm run dev      # servidor de desarrollo (HMR)
npm run build    # build de producción (tsc + vite build)
npm run lint      # oxlint
```

No requiere ninguna variable de entorno para verse — toda la data actual
(menú, ubicación) es estática (`src/data/`). Cuando se conecte al backend o
a Keycloak, las variables `VITE_*` que se agreguen irán documentadas acá y
en `.env.example`.

## Staging / Prod

En staging y prod el frontend se sirve como estáticos vía `nginx`, construido
por Docker desde `apps/frontend/Dockerfile` (build multi-stage: `npm run
build` en la etapa de build, `nginx:1.27-alpine` para servir `dist/`). Se
despliega junto al resto de `infra/docker-compose.yml`, en el servicio
`frontend` (`profiles: [staging, prod]`).

```bash
docker compose -f infra/docker-compose.yml --env-file .env.staging --profile staging up -d frontend
docker compose -f infra/docker-compose.yml --env-file .env.prod --profile prod up -d frontend
```

Variable de entorno necesaria: `FRONTEND_PORT` (puerto del host mapeado al
80 de nginx dentro del contenedor). Ver `.env.example`.

**Importante:** las variables `VITE_*` se compilan dentro del build de Vite
(no son runtime como las de Keycloak) — si en el futuro se agregan (ej.
`VITE_API_BASE_URL`, `VITE_KEYCLOAK_*`), cada ambiente necesita su propia
imagen construida con sus propios valores; no se puede promover la misma
imagen de staging a prod sin rebuildear.
