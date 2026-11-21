# Clientes, Proveedores y Compras por páginas

## Diseño

El usuario solicita la misma paginación real del inventario para Clientes, Proveedores y Compras, conservando la búsqueda en todas las páginas. Cada listado solicitará veinte registros. Los filtros y el término aplicado por useBusqueda (mínimo tres caracteres, debounce de 300 ms) se resuelven en SQL antes del conteo y la paginación. Los indicadores se obtienen de resúmenes agregados, nunca de la página visible. Se mantienen acciones, permisos y diseño existentes.

La captura de compra mostrada deja el total en cero porque setUnidad y la inicialización de caja asignan costo cero. Se corregirá la precarga por presentación usando el costo promedio base y el factor de caja, conservando los cambios manuales sin recurrir a precios de venta. Las etiquetas explican las unidades base, incluso cuando el producto está registrado con unidad Caja. No se reinterpretan ni migran datos de productos.

## Plan

**Goal:** Mostrar listas paginadas sin descargar todos los registros y calcular correctamente las compras por presentación.

**Architecture:** API .NET aplica búsqueda, filtros, agregados y orden estable en PostgreSQL; Vue consume una sola página y cancela consultas anteriores. El formulario de compra conserva costo manual por presentación y valida capturas incompletas.

**Tech Stack:** .NET 8, EF Core 8, PostgreSQL, Vue 3.

1. [x] Pruebas de consultas, filtros globales y traducción SQL, incluidas cuentas de clientes sin alterar saldos.
2. [x] Backend con filtros y resúmenes compatibles con consumidores actuales, sin cambios de esquema.
3. [x] Listados frontend con veinte registros por página, resumen global, búsqueda global y cancelación de respuestas antiguas.
4. [x] Reproducir total cero y cubrir cambios de unidad, entrada manual, escaneo y cantidades por peso antes de corregir el formulario.
5. [x] Verificar páginas posteriores, vacío, error/reintento, búsqueda sin acentos, filtros y tamaños 320–1280 px para ambos perfiles.
6. [ ] Revisar integración; publicar primero backend, comprobar disponibilidad y consultas reales de solo lectura, publicar frontend y sincronizar Android.

## Restricciones

- Ningún cambio en el esquema ni ejecución de migraciones al arrancar el servidor.
- La paginación no altera la lógica contable ni los permisos.
- Las cantidades por peso no se suman como piezas.
- No utilizar precio de venta como costo de compra ni modificar datos existentes de unidad base.
- Conservar resources/README.md preexistente sin incluirlo en la entrega.

## Aclaración del usuario y cálculo

El usuario confirmó que AZUCAR cuesta $200 por caja completa. Con el catálogo actual (unidad base Caja), siete cajas base muestran $1,400 y envían `cantidad=7,costoUnitario=200,esCaja=false`. La presentación adicional se identifica como paquete de diez cajas, diferenciándola de una caja completa. No se modifican datos del producto.

El total usa el importe redondeado por línea a dos decimales con MidpointToEven, igual que el backend; el costo promedio ponderado usa esos importes y se redondea a cuatro decimales. Esto evita discrepancias con cantidades por peso y costos con hasta ocho decimales.
