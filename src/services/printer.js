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
// Espera a que el escaneo descubra dispositivos (o a que se acabe el tiempo).
function escanearUnMomento(ms = 5000) {
  return new Promise((resolve) => {
    let listener = null
    let terminado = false
    const terminar = async () => {
      if (terminado) return
      terminado = true
      try { await CapacitorThermalPrinter.stopScan() } catch { /* noop */ }
      if (listener) { try { listener.remove() } catch { /* noop */ } }
      resolve()
    }
    CapacitorThermalPrinter.addListener('discoverDevices', () => { /* solo despierta el adaptador */ })
      .then((l) => { listener = l })
      .catch(() => { /* noop */ })
    CapacitorThermalPrinter.startScan().catch(() => { /* noop */ })
    setTimeout(terminar, ms)
  })
}

// Intenta conectar a una dirección. Devuelve true/false, sin lanzar.
async function intentarConectar(direccion) {
  try {
    const res = await CapacitorThermalPrinter.connect({ address: direccion })
    return res !== null
  } catch {
    return false
  }
}

// Se asegura de estar conectado a la impresora guardada.
// Si el primer intento falla, hace un escaneo corto (necesario en frío) y reintenta.
export async function asegurarConexion() {
  const g = impresoraGuardada()
  if (!g) throw new Error('No hay impresora configurada. Ve a Perfil → Impresora y elígela.')
  if (conectadaDir === g.direccion) return g

  // 1er intento: conexión directa
  if (await intentarConectar(g.direccion)) { conectadaDir = g.direccion; return g }

  // 2do intento: escanear primero (despierta el Bluetooth) y reconectar
  await escanearUnMomento(5000)
  if (await intentarConectar(g.direccion)) { conectadaDir = g.direccion; return g }

  conectadaDir = null
  throw new Error('No se pudo conectar con la impresora. Revisa que esté encendida, con papel y cerca del teléfono.')
}

// Marca la conexión como perdida (para forzar reconexión en el próximo intento).
export function reiniciarConexion() { conectadaDir = null }

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
  try { await b.write() } catch (e) { conectadaDir = null; throw new Error('Se perdió la conexión al imprimir. Intenta de nuevo.') }
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
  try { await b.write() } catch (e) { conectadaDir = null; throw new Error('Se perdió la conexión al imprimir. Intenta de nuevo.') }
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
  try { await b.write() } catch (e) { conectadaDir = null; throw new Error('Se perdió la conexión al imprimir. Intenta de nuevo.') }
}
