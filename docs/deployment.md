# Guía de despliegue

Paso a paso para levantar VCA POS en **dev**, **staging** y **prod**. Los
tres ambientes siguen el mismo patrón — base de datos primero, después
Keycloak/backend/frontend — así que staging y prod se leen como una
variación de dev, no como un proceso aparte. Si nunca desplegaste este
proyecto, léela en orden; si ya conoces dev y solo necesitas staging/prod,
salta a la sección 4.

Para el hardening base de la VPS (firewall, SSH, fail2ban, actualizaciones)
y el manejo de secretos, ver [`docs/security.md`](security.md) — se asume
resuelto antes de empezar esta guía, salvo la creación del usuario de
despliegue (sección 1).

## 1. Requisitos previos

- [Docker](https://docs.docker.com/get-docker/) y Docker Compose — en dev,
  local; en staging/prod, en la VPS, corriendo como el usuario `deploy` (ver
  [`docs/security.md#1-usuario-de-despliegue`](security.md#1-usuario-de-despliegue)).
- [uv](https://docs.astral.sh/uv/getting-started/installation/) — solo en
  dev, para correr el backend local.
- [Node.js](https://nodejs.org/) 20+ y [pnpm](https://pnpm.io/installation)
  (vía `corepack enable`) — solo en dev, para correr el frontend local.
- Un dominio propio con acceso a su DNS — solo staging/prod.

## 2. Cómo está pensado el despliegue

Dos archivos de Docker Compose, con responsabilidades distintas:

| Archivo | Contiene | Ciclo de vida |
|---|---|---|
| `infra/docker-compose.db.yml` | Postgres (bases de la app y de Keycloak) | Se levanta **una vez** por ambiente; un redeploy de la app nunca lo toca. |
| `infra/docker-compose.yml` | Keycloak, backend, frontend | Se redeploya en cada release. |

Ambos comparten la red Docker `vca-net`: `docker-compose.db.yml` la crea (la
base de datos siempre se levanta primero), `docker-compose.yml` la referencia
como externa. Por eso el orden importa en los tres ambientes:

```bash
# 1. Base de datos (crea la red vca-net)
docker compose -f infra/docker-compose.db.yml --env-file .env.<ambiente> up -d

# 2. Resto de la app (se conecta a vca-net)
docker compose -f infra/docker-compose.yml --env-file .env.<ambiente> [--profile <ambiente>] up -d
```

En dev, el backend y el frontend **no** corren en Docker — se levantan
locales con `uv` y `pnpm`. Por eso el paso 2 en dev solo trae Keycloak (los
servicios `backend`/`frontend` tienen `profiles: [staging, prod]`, así que
sin pasar `--profile` no se levantan). En staging/prod sí corren
dockerizados, con `--profile staging` o `--profile prod`.

## 3. Dev — paso a paso

### 3.1 Variables de entorno

Crea `.env.dev` (o `.env.dev.local`, tiene prioridad) en la **raíz del
repo**, a partir de [`.env.example`](../.env.example), completando al menos
`DB_ROOT_USER`/`DB_ROOT_PASSWORD`, `APP_DB_*`, `KC_DB_*` y
`KEYCLOAK_ADMIN_USER`/`KEYCLOAK_ADMIN_PASSWORD`. Ninguno de estos archivos se
commitea.

Crea también `apps/frontend/.env.local` (Vite no lee los `.env.dev*` de la
raíz):

```
VITE_API_BASE_URL=http://localhost:8000
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=valiente-cafe
VITE_KEYCLOAK_CLIENT_ID=valiente-cafe-app-frontend
```

### 3.2 Base de datos

```bash
docker compose -f infra/docker-compose.db.yml --env-file .env.dev up -d
```

Expone Postgres en `127.0.0.1:${DB_PORT}` (5432 por defecto), con las bases
`vca_pos_dev` y `keycloak_dev` dentro del mismo contenedor. Detalle completo
en [`docs/database.md`](database.md).

### 3.3 Keycloak

```bash
docker compose -f infra/docker-compose.yml --env-file .env.dev up -d
```

Levanta Keycloak en `http://localhost:8080` (`KC_COMMAND=start-dev`). Con él
arriba, provisiona el realm/clients/roles:

```bash
cd apps/backend
uv run python scripts/setup_keycloak.py --with-test-user
```

La contraseña del usuario de prueba se imprime una sola vez en la salida del
script — no queda guardada en ningún archivo. Detalle en
[`docs/keycloak.md`](keycloak.md).

### 3.4 Backend

```bash
cd apps/backend
uv sync                                     # instala dependencias
uv run alembic upgrade head                 # aplica migraciones
uv run python -m app.seed.seed_data         # carga contenido inicial (idempotente)
uv run fastapi dev app/main.py              # http://localhost:8000 (docs en /docs)
```

### 3.5 Frontend

```bash
cd apps/frontend
pnpm install
pnpm dev      # http://localhost:5173
```

### Resultado

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend (Swagger) | http://localhost:8000/docs |
| Keycloak (admin console) | http://localhost:8080 |

Más detalle por app: [`apps/backend/README.md`](../apps/backend/README.md),
[`apps/frontend/README.md`](../apps/frontend/README.md).

## 4. Staging — paso a paso

Staging corre en una VPS, con backend y frontend dockerizados y expuestos
bajo dominios propios con TLS. Es un espejo casi exacto de prod (misma
forma, distintas credenciales/dominios) — la sección 8 solo lista las
diferencias.

### 4.1 Usuario de despliegue

Ver [`docs/security.md#1-usuario-de-despliegue`](security.md#1-usuario-de-despliegue).
De aquí en adelante, todos los comandos corren como `deploy`, no como `root`.

### 4.2 Variables de entorno

Crea `.env.staging` en la raíz del repo, en la VPS, a partir de
`.env.example` — nunca se commitea. Valores que cambian respecto a dev:

| Variable | Valor en staging |
|---|---|
| `APP_ENV` | `staging` |
| `KC_COMMAND` | `start` (no `start --optimized` — ver nota abajo) |
| `KC_HOSTNAME` | `auth-staging.tudominio.com` |
| `KC_REALM` | `valiente-cafe` (mismo valor que dev, pero hay que declararlo explícito — ver nota abajo) |
| `KC_ADMIN_HOSTNAME` | `keycloak` (alias interno de Docker; ver nota abajo) |
| `KC_ISSUER_URL` | `https://auth-staging.tudominio.com` (mismo valor que `VITE_KEYCLOAK_URL`; ver nota abajo) |
| `APP_DB_HOST` | `postgres` (el backend corre dockerizado; ver [`docs/database.md`](database.md#cómo-se-conectan-keycloak-y-el-backend)) |
| `BACKEND_CORS_ORIGINS` | `["https://app-staging.tudominio.com"]` |
| `VITE_API_BASE_URL` | `https://api-staging.tudominio.com` |
| `VITE_KEYCLOAK_URL` | `https://auth-staging.tudominio.com` |
| Todas las contraseñas (`*_PASSWORD`) | generadas con `openssl rand -base64 32`, únicas — nunca las de dev |

Notas:
- `KC_COMMAND=start --optimized` requiere una imagen de Keycloak
  pre-compilada con `kc.sh build`; este proyecto usa la imagen stock
  `quay.io/keycloak/keycloak`, que nunca pasa por ese paso, así que
  `--optimized` falla en el primer arranque. Usar `start` a secas.
- `KC_REALM` no tiene default seguro: si falta en el `.env.*`, Docker
  Compose lo sustituye por un string vacío en vez de dejarlo sin definir,
  rompiendo silenciosamente la validación de JWT. Declararlo siempre.
- `KC_ADMIN_HOSTNAME=keycloak` es necesario porque `scripts/setup_keycloak.py`
  corre dentro del contenedor del backend (`docker compose exec backend
  ...`) en staging/prod, donde Keycloak solo es alcanzable por su alias de
  red interno — no por `KC_HOSTNAME` (que es el dominio público). En dev se
  deja sin definir (el script corre en el host, contra `localhost`).
- `KC_ISSUER_URL` es obligatorio en staging/prod: sin él, el backend valida
  los JWT contra `http://KC_HOSTNAME:KC_PORT` (el fallback de dev), que
  nunca coincide con el `iss` real de un token emitido detrás de Caddy en
  HTTPS sin puerto — el resultado es un 401 silencioso en **todos** los
  endpoints protegidos, sin ningún error obvio del lado de Keycloak.

```bash
chmod 600 .env.staging
chown deploy:deploy .env.staging
```

### 4.3 DNS

Antes de levantar nada, apunta los tres subdominios a la IP de la VPS:

| Registro | Tipo | Apunta a |
|---|---|---|
| `app-staging.tudominio.com` | A | IP de la VPS |
| `api-staging.tudominio.com` | A | IP de la VPS |
| `auth-staging.tudominio.com` | A | IP de la VPS |

### 4.4 Base de datos

```bash
docker compose -f infra/docker-compose.db.yml --env-file .env.staging up -d
```

Mismo comando que en dev, solo cambia el `--env-file`. Detalle en
[`docs/database.md`](database.md).

### 4.5 Keycloak, backend y frontend

```bash
docker compose -f infra/docker-compose.yml --env-file .env.staging --profile staging up -d --build

docker compose -f infra/docker-compose.yml --env-file .env.staging exec backend uv run alembic upgrade head
docker compose -f infra/docker-compose.yml --env-file .env.staging exec backend uv run python -m app.seed.seed_data
docker compose -f infra/docker-compose.yml --env-file .env.staging exec backend uv run python scripts/setup_keycloak.py
```

`setup_keycloak.py` sin `--with-test-user` — staging usa cuentas reales, no
el usuario de prueba de dev.

### 4.6 Reverse proxy y SSL

Ver sección 6 — se instala una sola vez por VPS y sirve para todos los
ambientes que corran en ella.

### Resultado

| Servicio | URL |
|---|---|
| Frontend | https://app-staging.tudominio.com |
| Backend (Swagger) | https://api-staging.tudominio.com/docs |
| Keycloak (admin console) | https://auth-staging.tudominio.com |

## 5. Variables de entorno — referencia rápida

`.env.example` documenta cada variable con su intención y su diferencia por
ambiente. Las que sí o sí cambian entre dev/staging/prod son: `APP_ENV`,
`KC_COMMAND`, `KC_HOSTNAME`, `APP_DB_HOST`, `BACKEND_CORS_ORIGINS`,
`VITE_API_BASE_URL`, `VITE_KEYCLOAK_URL`, y todas las contraseñas. Si
agregas una variable nueva, refléjala también en `.env.example` en el mismo
commit.

## 6. Reverse proxy y SSL

Recomendación: **Caddy**. Emite y renueva certificados de Let's Encrypt
automáticamente — sin cronjob de renovación que se pueda olvidar — y la
config es una fracción del tamaño de un `nginx.conf` equivalente. Se instala
una vez en la VPS y sirve para staging y prod a la vez (dominios distintos,
mismo proceso).

```
# /etc/caddy/Caddyfile

app-staging.tudominio.com {
    reverse_proxy frontend-staging:80
    encode gzip
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}

api-staging.tudominio.com {
    reverse_proxy backend-staging:8000
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
    }
}

auth-staging.tudominio.com {
    reverse_proxy keycloak-staging:8080
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
    }
}
```

Repite el mismo bloque para los dominios de prod (`app.`, `api.`, `auth.`
sin `-staging`), apuntando a `frontend-prod`/`backend-prod`/`keycloak-prod`.
Si prefieres Nginx por familiaridad del equipo, el equivalente es Nginx +
`certbot --nginx` con renovación vía `systemd timer` — funciona igual, con
más piezas que mantener.

`infra/docker-compose.yml` ya trae `KC_PROXY_HEADERS: xforwarded` en el
servicio `keycloak` — necesario para que Keycloak confíe en el
`X-Forwarded-Proto` que manda Caddy y arme `redirect_uri`/`issuer` como
`https://auth-staging.tudominio.com` en vez de `http://`, aunque
internamente hable HTTP. (La opción vieja `KC_PROXY: edge` es de la v1 del
sistema de hostname de Keycloak, deprecada desde Keycloak 26 — no usarla.)

Restringir `/admin` de Keycloak a una IP/VPN conocida (en vez de dejarlo
público) se documenta en [`docs/security.md`](security.md#4-keycloak).

## 7. Prod — paso a paso

Prod es el mismo procedimiento que staging (secciones 4.1–4.6), con estas
diferencias:

| | Staging | Prod |
|---|---|---|
| Archivo de entorno | `.env.staging` | `.env.prod` |
| `APP_ENV` | `staging` | `prod` |
| Profile de compose | `--profile staging` | `--profile prod` |
| Subdominios | `*-staging.tudominio.com` | `*.tudominio.com` |
| Rama de origen | `staging` | `main` (solo vía PR desde `staging`) |
| Credenciales | Propias de staging | Propias de prod — nunca reusar las de staging |

```bash
docker compose -f infra/docker-compose.db.yml --env-file .env.prod up -d
docker compose -f infra/docker-compose.yml --env-file .env.prod --profile prod up -d --build

docker compose -f infra/docker-compose.yml --env-file .env.prod exec backend uv run alembic upgrade head
docker compose -f infra/docker-compose.yml --env-file .env.prod exec backend uv run python scripts/setup_keycloak.py
```

`seed_data` normalmente **no** se corre en prod salvo que el contenido
inicial (cafés/cursos de ejemplo) sea deseado ahí — en la práctica, el
contenido real de prod se carga desde el panel de administración.

Recordar la regla de ramas del proyecto (ver [`CLAUDE.md`](../CLAUDE.md)):
nunca push directo a `main`, los cambios llegan solo por PR desde `staging`.

## 8. Bajar recursos y limpiar

Backend (`fastapi dev`) y frontend (`pnpm dev`) en dev se detienen con
`Ctrl+C`. Si quedaron corriendo en background:

```bash
kill $(lsof -ti:8000)   # backend
kill $(lsof -ti:5173)   # frontend
```

Para la base de datos y el resto de la app, en cualquier ambiente:

```bash
# Detener sin borrar datos
docker compose -f infra/docker-compose.yml --env-file .env.<ambiente> stop
docker compose -f infra/docker-compose.db.yml --env-file .env.<ambiente> stop

# Eliminar contenedores, conservando volúmenes (datos intactos)
docker compose -f infra/docker-compose.yml --env-file .env.<ambiente> down
docker compose -f infra/docker-compose.db.yml --env-file .env.<ambiente> down

# Eliminar TODO incluyendo los datos (destructivo — resetea ambas bases)
docker compose -f infra/docker-compose.db.yml --env-file .env.<ambiente> down -v
```

Detalle por servicio en [`docs/database.md`](database.md#detener--reiniciar).

## 9. Versionado y releases (staging/prod)

Cada vez que se promueve código a staging (o después a prod), se etiqueta
con un tag anotado de Git — así siempre queda trazable qué commit exacto
está corriendo en cada ambiente, y un rollback es tan simple como volver a
desplegar el tag anterior. No se tagea cada commit de `dev`, solo cada
release real a staging/prod.

### 9.1 Convención de versión

Tags con [semver](https://semver.org/lang/es/): `vMAJOR.MINOR.PATCH`.

| Tipo de cambio | Ejemplo | Bump |
|---|---|---|
| Fix puntual, sin cambios de esquema/API | `fix(frontend): ...` | `PATCH` (`v1.2.3` → `v1.2.4`) |
| Feature nueva, compatible hacia atrás | `feat(backend): ...` | `MINOR` (`v1.2.3` → `v1.3.0`) |
| Cambio incompatible (rompe API pública, requiere pasos manuales de migración, etc.) | — poco frecuente en este proyecto | `MAJOR` (`v1.2.3` → `v2.0.0`) |

En la práctica, la mayoría de los releases de este proyecto son `MINOR` o
`PATCH`. Ver el tag más reciente: `git tag -l --sort=-v:refname | head`.

### 9.2 Tagear un release a staging

Después de mergear el PR `dev → staging` (ver tabla de ramas en
[`CLAUDE.md`](../CLAUDE.md)):

```bash
git checkout staging
git pull origin staging

git tag -a v1.3.0 -m "Release a staging: resumen breve de qué incluye"
git push origin v1.3.0
```

Para armar el resumen del mensaje, `git log <tag-anterior>..staging --oneline`
lista los commits incluidos desde el último release.

### 9.3 Desplegar ese tag en la VPS

En vez de `git pull origin staging` (que sigue la rama en movimiento),
desplegá el tag exacto — así lo que corre en la VPS siempre coincide con lo
que quedó tageado:

```bash
cd /opt/vca-posSystem-app   # o donde viva el repo en la VPS
git fetch --tags
git checkout v1.3.0

docker compose -f infra/docker-compose.yml --env-file .env.staging --profile staging up -d --build
docker compose -f infra/docker-compose.yml --env-file .env.staging exec backend uv run alembic upgrade head
```

### 9.4 Rollback

Si algo sale mal, volvé al tag anterior y repetí el mismo `up -d --build`:

```bash
git checkout v1.2.4
docker compose -f infra/docker-compose.yml --env-file .env.staging --profile staging up -d --build
```

Nota: si el release que se está revirtiendo incluyó una migración de
Alembic irreversible en la práctica (por ejemplo, una que borra una
columna/tabla con datos), el rollback de código no deshace la base de
datos — revisar `alembic downgrade` para ese caso puntual antes de asumir
que alcanza con volver el código atrás.

### 9.5 Promoción a prod

Cuando el mismo release ya validado en staging se promueve a prod (PR
`staging → main`, ver regla de ramas en [`CLAUDE.md`](../CLAUDE.md)), se
reutiliza el **mismo tag** — no se crea un número de versión nuevo. Eso logra
dos cosas: (1) confirma que lo que llega a prod es exactamente el código que se
probó en staging, sin drift entre ambientes, y (2) evita que los números de
versión de staging y prod diverjan con el tiempo.

```bash
# en la VPS de prod
git fetch --tags
git checkout v1.3.0

docker compose -f infra/docker-compose.yml --env-file .env.prod --profile prod up -d --build
docker compose -f infra/docker-compose.yml --env-file .env.prod exec backend uv run alembic upgrade head
```

### 9.6 Opcional: GitHub Release

Para tener el changelog visible en GitHub (no solo el mensaje del tag):

```bash
gh release create v1.3.0 --title v1.3.0 --generate-notes
```

`--generate-notes` arma la lista de PRs mergeados desde el release
anterior automáticamente.
