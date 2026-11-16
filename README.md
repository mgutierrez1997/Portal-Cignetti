# Portal Cignetti

Seguimiento del cierre económico del Grupo Cignetti: estado de resultados por firma y por actividad
(Ventas → Costo de ventas → Contribución marginal → Costos de estructura → Margen bruto → Intereses →
Amortizaciones → Impuestos → Retiros → Margen neto), con % sobre ventas por actividad y asignación de la
estructura general a cada unidad de negocio según su % de facturación.

## Estructura

| Carpeta / archivo | Qué es |
|---|---|
| `index.html` | La app completa (una sola página). Es lo que publica GitHub Pages. |
| `supabase/esquema.sql` | Tablas y permisos de la base de datos (sin datos). |
| `escritorio/` | App de escritorio para Windows (Electron) que abre la app en su propia ventana, con instalador NSIS y actualizaciones desde OneDrive. |

## Cómo se actualiza

1. Se modifica `index.html` (subir `APP_VERSION` y agregar la versión arriba de todo en `NOVEDADES`).
2. Se hace commit en la rama `main`.
3. GitHub Pages publica la versión nueva en uno o dos minutos; al abrir la app, cada usuario ve el cartel de «Novedades».

## Datos y usuarios

Los datos (campañas, conceptos, plan de cuentas) **no** se guardan en este repositorio: viven en Supabase
(proyecto `cierre-cignetti`). El esquema y los permisos están en `supabase/esquema.sql`.

- Ingreso con mail y contraseña (usuarios dados de alta en Supabase → Authentication → Users; el registro libre está cerrado).
- Todo usuario logueado puede **consultar**. Solo los mails de la tabla `editores` pueden **cargar y modificar**.
