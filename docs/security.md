# Seguridad — VPS y aplicación

Este documento asume que el hardening base de la VPS (firewall, SSH,
actualizaciones automáticas, fail2ban, etc.) ya está resuelto a nivel de
infraestructura. Lo que sí cubre es lo que falta arriba de esa base para
desplegar esta aplicación: el usuario con el que se despliega, el manejo de
secretos, y el endurecimiento propio de cada pieza (Postgres, Keycloak, el
reverse proxy).

## 1. Usuario de despliegue

No despliegues como `root`. Crea un usuario dedicado con acceso a Docker:

```bash
adduser deploy
usermod -aG docker deploy
```

A partir de aquí, todos los comandos de [`docs/deployment.md`](deployment.md)
se corren como `deploy`, no como `root`.

## 2. Secretos y variables de entorno

- `.env.dev`, `.env.staging`, `.env.prod` **nunca se commitean** — viven
  solo en cada máquina/VPS (patrón `.env*` / `!.env.example` en
  `.gitignore`). El único archivo versionado es `.env.example`, con
  placeholders.
- En la VPS, restringe permisos del archivo real:

  ```bash
  chmod 600 .env.staging .env.prod
  chown deploy:deploy .env.staging .env.prod
  ```

- Cada contraseña (`DB_ROOT_PASSWORD`, `APP_DB_PASSWORD`, `KC_DB_PASSWORD`,
  `KEYCLOAK_ADMIN_PASSWORD`) debe ser única y generada, no reutilizada entre
  variables ni entre ambientes:

  ```bash
  openssl rand -base64 32
  ```

- Si agregas una variable nueva a cualquier `.env.*`, refléjala también en
  `.env.example` en el mismo commit (regla del proyecto, ver `CLAUDE.md`).

## 3. Postgres

- El servicio nunca publica el puerto `5432` a la red — `infra/docker-compose.db.yml`
  lo liga a `127.0.0.1` únicamente (ver [`docs/database.md`](database.md)).
  Solo es alcanzable desde dentro de la VPS o vía túnel SSH.
- `DB_ROOT_USER`/`DB_ROOT_PASSWORD` son credenciales de bootstrap — úsalas
  solo para el `init-databases.sh` inicial, no para que el backend o
  Keycloak se conecten con ellas.

## 4. Keycloak

- Cambia `KEYCLOAK_ADMIN_PASSWORD` desde la consola admin inmediatamente
  después del primer arranque en staging/prod — el valor de `.env.*` solo
  se usa para el bootstrap inicial.
- Activa **Brute Force Detection** en el realm (Realm Settings → Security
  Defenses) — complementa a fail2ban, pero a nivel de intentos de login de
  la aplicación, no de SSH.
- Restringe `/admin` en el reverse proxy a una IP/VPN conocida (ver
  [`docs/deployment.md`](deployment.md#6-reverse-proxy-y-ssl)) — no necesita
  estar abierto al público en general.
- `KC_HOSTNAME_STRICT` puede pasar a `"true"` una vez que `KC_HOSTNAME`
  esté fijo en el dominio real de ese ambiente.
- Confirma que `valiente-cafe-app-frontend` siga siendo público + PKCE y
  `valiente-cafe-app-backend` confidential — nunca agregarle client secret al de
  frontend (ver [`docs/keycloak.md`](keycloak.md)).

## 5. Backend / CORS

- `BACKEND_CORS_ORIGINS` debe listar únicamente el dominio real del
  frontend de ese ambiente (`["https://app-staging.tudominio.com"]`), nunca
  un comodín.
- El backend no maneja contraseñas ni sesiones — solo valida JWTs de
  Keycloak contra JWKS (`app/core/auth.py`). No hay superficie de sesión
  propia que asegurar en el backend más allá de eso.

## 6. Reverse proxy

- Es el único proceso con `80`/`443` expuestos — todo lo demás (Postgres,
  Keycloak, backend, frontend) vive detrás de él, en la red interna de
  Docker.
- TLS real vía Let's Encrypt en los tres subdominios, con headers de
  seguridad (`Strict-Transport-Security`, `X-Content-Type-Options`,
  `X-Frame-Options`) — configuración concreta en
  [`docs/deployment.md`](deployment.md#6-reverse-proxy-y-ssl).

## Backups

- Automatiza un `pg_dumpall` diario contra el contenedor de Postgres y sube
  el resultado fuera de la VPS (un bucket S3-compatible con `rclone`, por
  ejemplo) — un backup que solo vive en el mismo disco que la base no
  protege contra la pérdida del servidor.
- Prueba el `restore` al menos una vez por trimestre. Un backup nunca
  verificado no es, en la práctica, un backup.

```bash
# ejemplo de cron diario, purga dumps de más de 14 días
0 3 * * * deploy docker exec postgres-staging pg_dumpall -U ${DB_ROOT_USER} \
  | gzip > /var/backups/postgres/staging-$(date +\%F).sql.gz \
  && find /var/backups/postgres -mtime +14 -delete
```

## Checklist antes de anunciar un ambiente

- [ ] Desplegado con el usuario `deploy`, no `root`.
- [ ] `.env.<ambiente>` con permisos `600` y contraseñas únicas generadas.
- [ ] Puerto `5432` no alcanzable desde la red, solo `127.0.0.1`.
- [ ] `KEYCLOAK_ADMIN_PASSWORD` rotado tras el primer login.
- [ ] Brute Force Detection activo en el realm.
- [ ] `BACKEND_CORS_ORIGINS` limitado al dominio real del frontend.
- [ ] TLS válido y renovación automática confirmada en los tres subdominios.
- [ ] Backup de Postgres probado con un restore real, no solo el dump.
