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

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción (tsc + vite build)
npm run lint      # oxlint
```
