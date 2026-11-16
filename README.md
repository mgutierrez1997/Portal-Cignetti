# Cierre Cignetti

Seguimiento del cierre económico del Grupo Cignetti: estado de resultados por firma y por actividad
(Ventas → Costo de ventas → Contribución marginal → Costos de estructura → Margen bruto → Intereses →
Amortizaciones → Impuestos → Retiros → Margen neto), con % sobre ventas por actividad y asignación de la
estructura general a cada unidad de negocio según su % de facturación.

## Estructura

| Carpeta / archivo | Qué es |
|---|---|
| `index.html` | La app completa (una sola página). Es lo que publica GitHub Pages. |
| `escritorio/` | App de escritorio para Windows (Electron) que abre la app en su propia ventana, con instalador NSIS y actualizaciones desde OneDrive. |

## Cómo se actualiza

1. Se modifica `index.html` (subir `APP_VERSION` y agregar la versión arriba de todo en `NOVEDADES`).
2. Se hace commit en la rama `main`.
3. GitHub Pages publica la versión nueva en uno o dos minutos; al abrir la app, cada usuario ve el cartel de «Novedades».

Los datos (campañas, conceptos, plan de cuentas) **no** se guardan en este repositorio: viven en la base de datos en la nube.
