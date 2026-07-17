// Servicio central de impresión térmica (MUNBYN 58mm, ESC/POS vía capacitor-thermal-printer 0.2.4).
// Recuerda la impresora elegida en localStorage y se reconecta sola antes de imprimir.
// IMPORTANTE: imprimir NUNCA debe tumbar una venta. Si falla, se avisa pero la operación ya quedó guardada.
import { CapacitorThermalPrinter } from 'capacitor-thermal-printer'

const LS_DIR = 'impresora_direccion'
const LS_NOM = 'impresora_nombre'
const ANCHO = 32 // caracteres por línea a 58mm (fuente normal)

let conectadaDir = null // dirección actualmente conectada en esta sesión

// ── Impresora guardada ───────────────────────────────────────────
export function impresoraGuardada() {
  const direccion = localStorage.getItem(LS_DIR)
  const nombre = localStorage.getItem(LS_NOM)
  return direccion ? { direccion, nombre } : null
}
export function guardarImpresora(direccion, nombre) {
  localStorage.setItem(LS_DIR, direccion)
  localStorage.setItem(LS_NOM, nombre || direccion)
  conectadaDir = null // forzar reconexión a la nueva
}
export function olvidarImpresora() {
  localStorage.removeItem(LS_DIR)
  localStorage.removeItem(LS_NOM)
  conectadaDir = null
}

// ── Conexión ─────────────────────────────────────────────────────
// Se asegura de estar conectado a la impresora guardada. Lanza error claro si no hay ninguna.
export async function asegurarConexion() {
  const g = impresoraGuardada()
  if (!g) throw new Error('No hay impresora configurada. Elige una en Perfil → Impresora.')
  if (conectadaDir === g.direccion) return g // ya conectada en esta sesión
  const res = await CapacitorThermalPrinter.connect({ address: g.direccion })
  if (res === null) throw new Error('No se pudo conectar con la impresora. Revisa que esté encendida y cerca.')
  conectadaDir = g.direccion
  return g
}

// ── Helpers de formato (58mm) ────────────────────────────────────
const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const linea = (c = '-') => c.repeat(ANCHO) + '\n'

// "Producto           $123.00" — nombre a la izquierda, monto a la derecha, alineados al ancho.
function fila(izq, der) {
  izq = String(izq); der = String(der)
  const espacio = ANCHO - izq.length - der.length
  if (espacio < 1) {
    // nombre muy largo: lo cortamos para que quepa el monto
    const max = ANCHO - der.length - 1
    izq = izq.slice(0, Math.max(1, max))
    return izq + ' '.repeat(Math.max(1, ANCHO - izq.length - der.length)) + der + '\n'
  }
  return izq + ' '.repeat(espacio) + der + '\n'
}

// Datos del negocio en el encabezado (editables aquí hasta que llegue el SAT).
const NEGOCIO = {
  nombre: 'DISTRIBUIDORA',
  contacto: '' // ej. 'Tel. 667 000 0000' — se puede llenar después
}

// ── Tickets ──────────────────────────────────────────────────────
// Venta en ruta / autoventa
export async function imprimirTicketVenta(v) {
  await asegurarConexion()
  let b = CapacitorThermalPrinter.begin()
    .align('center').bold().text(NEGOCIO.nombre + '\n').clearFormatting()
  if (NEGOCIO.contacto) b = b.text(NEGOCIO.contacto + '\n')
  b = b.text('Venta en ruta\n').text(linea())
    .align('left')
    .text(fila('Fecha:', new Date(v.fecha || Date.now()).toLocaleString('es-MX')))
  if (v.cliente) b = b.text(fila('Cliente:', v.cliente))
  if (v.folio) b = b.text(fila('Folio:', String(v.folio)))
  b = b.text(linea())
  for (const it of (v.items || [])) {
    b = b.text(it.nombre + '\n')
    b = b.text(fila(`  ${it.cantidad} x ${money(it.precio)}`, money(it.cantidad * it.precio)))
  }
  b = b.text(linea())
    .bold().text(fila('TOTAL', money(v.total))).clearFormatting()
    .text(fila('Pago:', v.metodo || '-'))
  if (v.pagoPendiente) b = b.text('** PAGO PENDIENTE **\n')
  b = b.text(linea())
    .align('center').text('Gracias por su compra\n')
    .text('\n\n\n')
  await b.write()
}

// Entrega de pedido
export async function imprimirTicketEntrega(e) {
  await asegurarConexion()
  let b = CapacitorThermalPrinter.begin()
    .align('center').bold().text(NEGOCIO.nombre + '\n').clearFormatting()
  if (NEGOCIO.contacto) b = b.text(NEGOCIO.contacto + '\n')
  b = b.text('Comprobante de entrega\n').text(linea())
    .align('left')
    .text(fila('Fecha:', new Date(e.fecha || Date.now()).toLocaleString('es-MX')))
  if (e.cliente) b = b.text(fila('Cliente:', e.cliente))
  if (e.pedidoId) b = b.text(fila('Pedido:', '#' + e.pedidoId))
  b = b.text(linea())
  for (const it of (e.items || [])) {
    b = b.text(it.nombre + '\n')
    b = b.text(fila(`  ${it.cantidad} x ${money(it.precio)}`, money(it.cantidad * it.precio)))
  }
  b = b.text(linea())
    .bold().text(fila('TOTAL', money(e.total))).clearFormatting()
    .text(fila('Pago:', e.metodo || '-'))
  if (e.pagoPendiente) b = b.text('** PAGO PENDIENTE **\n')
  b = b.text(linea())
    .align('center').text('Gracias\n')
    .text('\n\n\n')
  await b.write()
}

// Corte de caja (por carga)
export async function imprimirCorte(c) {
  await asegurarConexion()
  let b = CapacitorThermalPrinter.begin()
    .align('center').bold().text(NEGOCIO.nombre + '\n').clearFormatting()
    .text('CORTE DE CAJA\n').text(linea())
    .align('left')
    .text(fila('Repartidor:', c.repartidor || '-'))
  if (c.cargaId) b = b.text(fila('Carga:', '#' + c.cargaId))
  b = b.text(fila('Fecha:', new Date(c.fecha || Date.now()).toLocaleString('es-MX')))
    .text(linea())
    .text(fila('Efectivo', money(c.totalEfectivo)))
    .text(fila('Transferencia', money(c.totalTransferencia)))
    .text(fila('Tarjeta', money(c.totalTarjeta)))
    .text(fila('Credito', money(c.totalCredito)))
    .text(linea())
    .bold().text(fila('VENTAS', money(c.totalVentas))).clearFormatting()
    .text(fila('Efectivo esperado', money(c.efectivoEsperado)))
    .text(fila('Efectivo entregado', money(c.efectivoEntregado)))
  const dif = Number(c.diferencia || 0)
  const difTxt = (dif < 0 ? '-' : dif > 0 ? '+' : '') + money(Math.abs(dif))
  b = b.bold().text(fila('Diferencia', difTxt)).clearFormatting()
    .text(linea())
    .text(fila('Devuelto', money(c.valorDevuelto)))
    .text(fila('Merma', money(c.valorMerma)))
    .text(linea())
    .align('center').text('\n\n\n')
  await b.write()
}
