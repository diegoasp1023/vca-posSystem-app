# Documentación — VCA POS

Índice de la documentación del proyecto. La arquitectura del código y las
reglas de trabajo con Claude Code viven en [`CLAUDE.md`](../CLAUDE.md), en
la raíz del repo; aquí vive todo lo operativo — cómo desplegar, cómo están
las bases de datos, Keycloak y la seguridad de cada ambiente.

| Documento | Contenido |
|---|---|
| [`deployment.md`](deployment.md) | Guía paso a paso: dev, staging y prod, en orden progresivo. Empieza aquí. |
| [`database.md`](database.md) | Cómo se despliegan y conectan las bases de datos (app y Keycloak). |
| [`keycloak.md`](keycloak.md) | Clients, roles, provisioning y endurecimiento de Keycloak. |
| [`security.md`](security.md) | Usuario de despliegue, manejo de secretos y checklist de seguridad por ambiente. |

## Por dónde empezar

- **Nunca desplegaste el proyecto** → [`deployment.md`](deployment.md) de
  principio a fin.
- **Ya tienes dev corriendo y vas a staging/prod** → [`deployment.md`](deployment.md#4-staging--paso-a-paso).
- **Dudas sobre una variable de entorno puntual** → [`.env.example`](../.env.example),
  cada variable tiene su propio comentario.
- **Dudas de arquitectura de código, ramas o flujo con Claude Code** →
  [`CLAUDE.md`](../CLAUDE.md).
