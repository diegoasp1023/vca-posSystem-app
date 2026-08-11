# Keycloak (IAM / seguridad)

Toda la autenticación/autorización del sistema pasa por Keycloak — ni el
backend ni el frontend implementan login, contraseñas o sesiones propias.
Ver [`CLAUDE.md`](../CLAUDE.md) en la raíz del repo para las reglas
generales de seguridad del proyecto.

No se usa import automático de realms (`--import-realm`): la configuración
de realm/clients/roles se hace vía `apps/backend/scripts/setup_keycloak.py`
(idempotente, recomendado) o manualmente desde la consola admin.

## Base de datos

La base propia de Keycloak (`keycloak_dev` / `keycloak_staging` /
`keycloak_prod`) es independiente de la base de datos de la aplicación
(`APP_DB_*`) — nunca deben compartirse ni mezclarse, aunque vivan dentro del
mismo contenedor Postgres. Desplegar y conectarse: [`docs/database.md`](database.md).

## Clients

| Client | Tipo | Uso |
|---|---|---|
| `valiente-cafe-app-frontend` | Público + PKCE (S256) | Login del panel de administración vía `keycloak-js`. **Nunca** agregarle client secret. |
| `valiente-cafe-app-backend` | Confidential (client secret) | Reservado para uso server-to-server futuro. |

## Roles de realm

- `Administrador` — acceso completo al panel (`/admin/cafes`, `/admin/cursos`, empleados, turnos, nómina).
- `Cajero` — acceso a `/admin/cuentas` (gestión de cuentas/tabs abiertas), sin el resto de los menús de gestión.

## Tema de login (`keycloak/themes/vca-pos`)

El login (y cualquier otro flujo que Keycloak renderice — reset de
contraseña, registro, etc.) usa un tema propio con la marca de Valiente
Café en vez del tema por defecto de Keycloak:

- Extiende el tema base `keycloak.v2` (`parent=keycloak.v2` en
  `theme.properties`) y solo agrega una hoja de estilos propia
  (`resources/css/vca-pos.css`) — no reemplaza ningún template FTL, así que
  hereda el layout/accesibilidad/i18n del tema oficial tal cual.
- Logo: `resources/img/logo.svg` es una copia de
  `apps/frontend/src/assets/fox-logo.svg` (el mismo mark del header
  público), inyectado sobre `#kc-header-wrapper` vía `background-image` —
  el template base solo expone ese contenedor como texto, no hay slot de
  logo dedicado.
- Paleta y tipografía calcadas a mano de `apps/frontend/src/index.css`
  (`--color-coral`, `--color-lavender`, fuente serif de los títulos) — no
  hay una fuente de verdad compartida entre el theme de Keycloak (FreeMarker
  + CSS) y el build de Tailwind del frontend, así que si la paleta cambia en
  uno hay que actualizar el otro a mano.
- Botones de login social (Google/Microsoft, cuando se configuren como
  Identity Providers) ya están estilizados como pill lavanda —
  `social-providers.ftl` los renderiza automáticamente al agregar el
  Identity Provider, con ícono de marca de cada proveedor; el CSS solo
  ajusta el contenedor, no toca los íconos.

Montaje del tema en el contenedor (`infra/docker-compose.yml`, servicio
`keycloak`):

```yaml
volumes:
  - ../keycloak/themes:/opt/keycloak/themes:ro
```

Se aplica al realm automáticamente al correr `scripts/setup_keycloak.py`
(setea `loginTheme=vca-pos`, tanto al crear el realm como en un re-run sobre
uno existente). En dev (`start-dev`) los cambios de CSS se ven al recargar,
sin reiniciar el contenedor — Keycloak no cachea temas en ese modo.

## Comando de arranque por ambiente

- `dev` → `KC_COMMAND=start-dev` (modo relajado, HTTP permitido, solo local)
- `staging` / `prod` → `KC_COMMAND=start --optimized` (modo producción real)

Nunca cambiar `start --optimized` por `start-dev` en staging o prod, ni al
revés en dev, salvo pedido explícito — `start-dev` no aplica los checks de
producción y no debe quedar expuesto públicamente.

## Provisionar realm/clients/roles

Con Keycloak ya levantado (ver [`docs/deployment.md`](deployment.md)):

```bash
cd apps/backend
uv run python scripts/setup_keycloak.py               # staging/prod
uv run python scripts/setup_keycloak.py --with-test-user   # dev, agrega un usuario Administrador de prueba
```

Es idempotente — se puede re-correr sin duplicar realm, clients ni roles. La
contraseña del usuario de prueba se imprime una sola vez en la salida del
script y no queda guardada en ningún archivo.

## Endurecimiento en staging/prod

Ver el checklist completo en [`docs/security.md`](security.md#keycloak), en
particular:

- Rotar `KEYCLOAK_ADMIN_PASSWORD` inmediatamente después del primer login.
- Activar **Brute Force Detection** (Realm Settings → Security Defenses).
- Restringir el acceso a `/admin` de la consola a una IP/VPN conocida desde
  el reverse proxy.
- Fijar `KC_HOSTNAME` al dominio público real y pasar `KC_HOSTNAME_STRICT`
  a `"true"` una vez que ese dominio esté estable.
