# Despliegue continuo a staging (VPS)

Este documento explica cómo queda desplegada la rama `staging` en una VPS
con CI/CD vía GitHub Actions, incluyendo cómo se aplican las migraciones de
base de datos en cada deploy. Complementa a `docs/database.md` (bases de
datos) y a `keycloak/README.md` (Keycloak) — léelos primero si no conoces
esa parte del stack.

**Alcance:** este documento cubre solo el ambiente `staging`. El flujo de
`main`/prod sigue el mismo patrón pero no se documenta aquí todavía (ver
tabla de ramas en `CLAUDE.md`).

**Fuera de alcance (ya resuelto fuera de este repo):**

- Proxy reverso, TLS y DNS de los subdominios de staging — ya existen en la
  VPS y no se tocan desde este pipeline.
- Aprovisionamiento y administración de las bases de datos de staging
  (`vca_pos_staging`, `keycloak_staging`) — ver "Staging / Prod" en
  `docs/database.md`, ya están desplegadas y gestionadas manualmente.

---

## 1. Provisionamiento inicial de la VPS (una sola vez, manual)

Estos pasos se hacen una vez por VPS, a mano, antes de que exista cualquier
pipeline:

1. **Instalar Docker Engine + el plugin Docker Compose** en la VPS (guía
   oficial de Docker para la distro correspondiente).

2. **Crear un usuario de sistema dedicado para deploys**, sin privilegios
   `sudo`, solo en el grupo `docker`:

   ```bash
   sudo adduser --disabled-password deploy
   sudo usermod -aG docker deploy
   ```

3. **Generar un par de llaves SSH exclusivo para CI/CD** (no reutilizar
   llaves personales) y autorizar la pública para el usuario `deploy`:

   ```bash
   # En tu máquina local, no en la VPS
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f vca_pos_deploy_key -N ""

   # Copiar vca_pos_deploy_key.pub al final de:
   # /home/deploy/.ssh/authorized_keys  (en la VPS)
   ```

   La llave **privada** (`vca_pos_deploy_key`) se guarda como GitHub Secret
   (ver sección 4), nunca se commitea.

4. **Clonar el repo en la VPS** bajo ese usuario, con la rama `staging`:

   ```bash
   sudo -u deploy git clone -b staging <url-del-repo> /opt/vca-pos
   ```

5. **Crear `.env.staging`** en la raíz de ese clon (`/opt/vca-pos/.env.staging`),
   a partir de `.env.example`, con los valores reales de staging. Este
   archivo **vive solo en la VPS**, nunca se sube a GitHub ni pasa por el
   pipeline — ver `CLAUDE.md` sección "Variables de entorno".

6. **Confirmar que el proxy reverso** ya enruta los subdominios de staging
   hacia los puertos internos que defina ese `.env.staging`
   (`BACKEND_PORT`, `FRONTEND_PORT`, `KC_PORT`). Esto ya está resuelto en la
   VPS y no forma parte de este pipeline.

---

## 2. Pipeline de CI/CD (`.github/workflows/deploy-staging.yml`)

**Disparador:** `push` a la rama `staging` (llega ahí solo vía PR desde un
feature/fix branch, según el flujo de `CLAUDE.md`).

### Job `test` (gate)

Corre antes que nada; si falla, el deploy no ocurre:

- Backend: `uv sync`, `uv run pytest` (contra SQLite en memoria, igual que
  en local — no necesita Postgres levantado).
- Frontend: `npm ci`, `npm run lint`, `npm run build` (valida que compile).

### Job `deploy` (solo si `test` pasa)

Se conecta por SSH a la VPS (usuario `deploy`, llave del secret
`VPS_SSH_KEY`) y corre, dentro de `/opt/vca-pos`:

```bash
cd /opt/vca-pos
git fetch origin staging
git reset --hard origin/staging
docker compose -f infra/docker-compose.yml --env-file .env.staging --profile staging build
docker compose -f infra/docker-compose.yml --env-file .env.staging --profile staging up -d
docker image prune -f
```

Notas sobre esta secuencia:

- `git reset --hard origin/staging` asume que la VPS nunca tiene cambios
  locales sin commitear en ese path — es un clon de solo-deploy, no un
  entorno de desarrollo.
- Las imágenes se **construyen en la propia VPS** (no hay registry
  intermedio como GHCR): más simple de operar, a costa de usar CPU/RAM de
  la VPS en cada deploy.
- `docker image prune -f` limpia imágenes `<none>` que quedan de builds
  anteriores, para no llenar el disco de la VPS con el tiempo.

### Migraciones de base de datos — no requieren paso aparte

`apps/backend/Dockerfile` ya define:

```dockerfile
CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000"]
```

Cada vez que el contenedor `backend` arranca (incluido cada deploy, porque
`docker compose up -d` recrea el contenedor con la imagen nueva), corre
`alembic upgrade head` antes de levantar la API. Si una migración falla, el
contenedor no llega a exponer la API y el `docker compose up -d` del
deploy queda con ese servicio caído — visible en los logs
(`docker compose -f infra/docker-compose.yml --env-file .env.staging logs backend`).

No se necesita ningún job ni paso adicional en el workflow para aplicar
migraciones: viven en el ciclo de vida normal del contenedor backend.

---

## 3. Ejemplo de workflow

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy staging

on:
  push:
    branches: [staging]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Backend tests
        run: |
          cd apps/backend
          curl -LsSf https://astral.sh/uv/install.sh | sh
          export PATH="$HOME/.local/bin:$PATH"
          uv sync
          uv run pytest

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Frontend lint + build
        run: |
          cd apps/frontend
          npm ci
          npm run lint
          npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy over SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_DEPLOY_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/vca-pos
            git fetch origin staging
            git reset --hard origin/staging
            docker compose -f infra/docker-compose.yml --env-file .env.staging --profile staging build
            docker compose -f infra/docker-compose.yml --env-file .env.staging --profile staging up -d
            docker image prune -f
```

---

## 4. Secrets de GitHub requeridos

Configurar en `Settings → Secrets and variables → Actions` del repo:

| Secret | Descripción |
|---|---|
| `VPS_HOST` | IP o hostname de la VPS |
| `VPS_DEPLOY_USER` | Usuario SSH de deploy (`deploy`, ver sección 1) |
| `VPS_SSH_KEY` | Llave privada SSH exclusiva de CI/CD (ver sección 1, paso 3) |

Ningún secreto de base de datos o de Keycloak pasa por GitHub — `.env.staging`
vive solo en la VPS y el pipeline nunca lo lee, escribe ni transmite.

---

## 5. Verificar un deploy

```bash
# Desde la VPS, o por SSH
cd /opt/vca-pos
docker compose -f infra/docker-compose.yml --env-file .env.staging ps
docker compose -f infra/docker-compose.yml --env-file .env.staging logs backend --tail=50
```

Confirmar que `backend` y `frontend` están `Up` y que el log del backend
muestra el `alembic upgrade head` corriendo sin errores antes del arranque
de `uvicorn`.

## 6. Rollback

Si un deploy deja staging roto (migración fallida, bug introducido):

```bash
cd /opt/vca-pos
git log --oneline -5          # identificar el commit bueno anterior
git reset --hard <commit-bueno>
docker compose -f infra/docker-compose.yml --env-file .env.staging --profile staging build
docker compose -f infra/docker-compose.yml --env-file .env.staging --profile staging up -d
```

**Cuidado con rollbacks que impliquen revertir una migración de Alembic**:
`alembic upgrade head` solo aplica migraciones hacia adelante. Si el commit
bueno anterior tiene un esquema de base de datos distinto (columnas/tablas
que ya no existen en el código pero sí en la base), hay que correr
`uv run alembic downgrade <revisión>` manualmente contra la base de
staging antes de hacer el rollback de código — el pipeline no lo hace
automáticamente.
