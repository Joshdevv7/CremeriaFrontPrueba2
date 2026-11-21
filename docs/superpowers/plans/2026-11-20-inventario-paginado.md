# Inventario paginado

## Diseño

El usuario solicita paginación para evitar descargar todo el inventario, filas compactas desplegables similares a Pedidos y un botón Editar que abra un modal. Se usará el listado existente con veinte productos por página. En celular, cada fila se presenta como tarjeta. La cabecera muestra producto, proveedor, existencias y precio; el detalle agrega código, categoría, costo promedio, margen, umbrales de reorden y venta por caja.

La API aplicará búsqueda y filtros antes de contar y paginar, con orden estable por nombre e identificador. Se conservan los tres caracteres y el debounce de 300 ms. El resumen global se obtiene mediante agregados en SQL, separando cantidades por unidad. El editor existente se reutiliza dentro de un diálogo y conserva las comprobaciones de concurrencia de inventario y costo. Solo el administrador puede editar productos existentes, conforme al permiso actual. No hay cambios de esquema ni migraciones.

## Plan de implementación

**Goal:** Consultar el inventario por páginas reales y editar sin perder búsqueda ni posición.

**Architecture:** Vue consume una sola página de GET /productos y un resumen global de GET /productos/resumen. LINQ aplica filtros, orden y límites en PostgreSQL. ProductoEditorView acepta un identificador opcional para uso en modal.

**Tech Stack:** Vue 3, .NET 8, Entity Framework Core 8, PostgreSQL.

1. [x] Añadir pruebas de consultas para filtros, búsqueda sin acentos, orden estable, resumen y SQL con LIMIT/OFFSET; comprobar que fallen antes de implementar.
2. [x] Añadir filtros y resumen al backend manteniendo los parámetros actuales del catálogo para ventas.
3. [x] Añadir prueba de navegador que exija una sola página, búsquedas con debounce, detalles desplegables y edición modal.
4. [x] Implementar listado compacto, paginación, errores/reintentos y cancelación de consultas anteriores. Reutilizar editor sin navegar al guardar.
5. [x] Verificar backend, frontend, celulares/tabletas/escritorio, permisos y guardado concurrente. Revisar antes de publicar backend y después frontend; verificar disponibilidad y sincronizar Android.

## Verificación

Pruebas de consultas y compilación .NET sin advertencias ni errores. El modelo de EF no tiene cambios pendientes de migración. Las 29 pruebas de frontend y el build pasan. Navegador con 123 registros, perfiles Admin y Vendedor y tamaños de 320 a 1280 px: una sola página inicial, búsqueda global con debounce, cancelación de respuestas anteriores, detalle sin consultas adicionales, edición modal, permisos, reintento, vacío y conservación de página al guardar.

Publicados backend `7f98364` y frontend `a03b591`. La comprobación de solo lectura sobre la API publicada confirmó 55 productos activos, 20 en la primera página, resumen global y filtros correctos, y `/health/ready` disponible. Recursos Android sincronizados.

## Casos importantes

- Buscar desde páginas posteriores vuelve a la primera página, respetando filtros globales.
- Respuestas antiguas no reemplazan resultados nuevos.
- Vacío, error y reducción del catálogo no dejan una página inexistente.
- Guardar o desactivar actualiza la página y los indicadores globales.
- Las existencias por peso nunca se suman como piezas.
