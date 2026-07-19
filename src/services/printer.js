// Servicio central de impresión térmica (MUNBYN 58mm, ESC/POS vía capacitor-thermal-printer 0.2.4).
// Recuerda la impresora elegida en localStorage y se reconecta sola antes de imprimir.
// IMPORTANTE: imprimir NUNCA debe tumbar una venta. Si falla, se avisa pero la operación ya quedó guardada.
import { CapacitorThermalPrinter } from 'capacitor-thermal-printer'

const LS_DIR = 'impresora_direccion'
const LS_NOM = 'impresora_nombre'
// Ancho real medido en la MUNBYN 58mm: con 32 se desbordaban 3 caracteres por línea.
const ANCHO = 29

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
  conectadaDir = null
}
export function olvidarImpresora() {
  localStorage.removeItem(LS_DIR)
  localStorage.removeItem(LS_NOM)
  conectadaDir = null
}
export function reiniciarConexion() { conectadaDir = null }

// ── Conexión ─────────────────────────────────────────────────────
// Un escaneo corto "despierta" el Bluetooth. Sin esto, conectar en frío suele fallar.
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

async function intentarConectar(direccion) {
  try {
    const res = await CapacitorThermalPrinter.connect({ address: direccion })
    return res !== null
  } catch {
    return false
  }
}

export async function asegurarConexion() {
  const g = impresoraGuardada()
  if (!g) throw new Error('No hay impresora configurada. Ve a Perfil y elige la impresora.')
  if (conectadaDir === g.direccion) return g
  if (await intentarConectar(g.direccion)) { conectadaDir = g.direccion; return g }
  await escanearUnMomento(5000)
  if (await intentarConectar(g.direccion)) { conectadaDir = g.direccion; return g }
  conectadaDir = null
  throw new Error('No se pudo conectar con la impresora. Revisa que esté encendida, con papel y cerca.')
}

// ── Helpers de formato (58mm) ────────────────────────────────────
const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const linea = (c = '-') => c.repeat(ANCHO) + '\n'

// Recorta para que nunca desborde la línea.
function corta(txt, max = ANCHO) {
  txt = String(txt == null ? '' : txt)
  return txt.length > max ? txt.slice(0, max - 1) + '.' : txt
}

// Fecha corta: 18/07/26 18:37
function fechaCorta(f) {
  const d = new Date(f || Date.now())
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// "Etiqueta            $123.00" — recorta la izquierda si hace falta.
function fila(izq, der) {
  der = String(der == null ? '' : der)
  izq = corta(izq, Math.max(1, ANCHO - der.length - 1))
  const espacio = ANCHO - izq.length - der.length
  return izq + ' '.repeat(Math.max(1, espacio)) + der + '\n'
}

// Producto: nombre en su línea, luego cantidad x precio ... importe
function filaProducto(nombre, cantidad, precio, importe) {
  return corta(nombre, ANCHO) + '\n' + fila(`  ${Number(cantidad || 0)} x ${money(precio)}`, money(importe))
}

// Datos del negocio (editables aquí hasta que llegue el SAT).
const NEGOCIO = {
  nombre: 'DISTRIBUIDORA',
  contacto: '' // ej. 'Tel. 667 000 0000'
}

// ── Tickets ──────────────────────────────────────────────────────
function encabezado(subtitulo) {
  let b = CapacitorThermalPrinter.begin()
    .align('center').bold().text(NEGOCIO.nombre + '\n').clearFormatting()
  if (NEGOCIO.contacto) b = b.text(corta(NEGOCIO.contacto) + '\n')
  return b.text(subtitulo + '\n').align('left').text(linea())
}

async function enviar(b) {
  try { await b.write() } catch (e) {
    conectadaDir = null
    throw new Error('Se perdió la conexión al imprimir. Intenta de nuevo.')
  }
}

// Venta en ruta / autoventa
export async function imprimirTicketVenta(v) {
  await asegurarConexion()
  let b = encabezado('Venta en ruta')
  if (v.ticketId) b = b.text(fila('Ticket:', '#' + v.ticketId))
  b = b.text(fila('Fecha:', fechaCorta(v.fecha)))
  if (v.cliente) b = b.text(fila('Cliente:', corta(v.cliente, 19)))
  if (v.repartidor) b = b.text(fila('Atendio:', corta(v.repartidor, 19)))
  if (v.folio) b = b.text(fila('Folio:', corta(v.folio, 19)))
  b = b.text(linea())
  for (const it of (v.items || [])) {
    b = b.text(filaProducto(it.nombre, it.cantidad, it.precio, it.cantidad * it.precio))
  }
  b = b.text(linea())
    .bold().text(fila('TOTAL', money(v.total))).clearFormatting()
    .text(fila('Pago:', corta(v.metodo || '-', 20)))
  if (v.pagoPendiente) b = b.align('center').text('** PAGO PENDIENTE **\n').align('left')
  if (v.credito && v.vence) b = b.align('center').text('CREDITO - vence ' + v.vence + '\n').align('left')
  b = b.text(linea()).align('center').text('Gracias por su compra\n').text('\n\n\n')
  await enviar(b)
}

// Entrega de pedido
export async function imprimirTicketEntrega(e) {
  await asegurarConexion()
  let b = encabezado('Comprobante de entrega')
  if (e.pedidoId) b = b.text(fila('Pedido:', '#' + e.pedidoId))
  b = b.text(fila('Fecha:', fechaCorta(e.fecha)))
  if (e.cliente) b = b.text(fila('Cliente:', corta(e.cliente, 19)))
  if (e.repartidor) b = b.text(fila('Entrego:', corta(e.repartidor, 19)))
  if (e.folio) b = b.text(fila('Folio:', corta(e.folio, 19)))
  b = b.text(linea())
  for (const it of (e.items || [])) {
    b = b.text(filaProducto(it.nombre, it.cantidad, it.precio, it.cantidad * it.precio))
  }
  b = b.text(linea())
    .bold().text(fila('TOTAL', money(e.total))).clearFormatting()
    .text(fila('Pago:', corta(e.metodo || '-', 20)))
  if (e.pagoPendiente) b = b.align('center').text('** PAGO PENDIENTE **\n').align('left')
  if (e.credito && e.vence) b = b.align('center').text('CREDITO - vence ' + e.vence + '\n').align('left')
  b = b.text(linea()).align('center').text('Gracias por su compra\n').text('\n\n\n')
  await enviar(b)
}

// Corte de caja (por carga)
export async function imprimirCorte(c) {
  await asegurarConexion()
  let b = encabezado('CORTE DE CAJA')
  if (c.cargaId) b = b.text(fila('Carga:', '#' + c.cargaId))
  b = b.text(fila('Fecha:', fechaCorta(c.fecha)))
  if (c.repartidor) b = b.text(fila('Repartidor:', corta(c.repartidor, 17)))
  b = b.text(linea())
    .text(fila('Efectivo', money(c.totalEfectivo)))
    .text(fila('Transferencia', money(c.totalTransferencia)))
    .text(fila('Tarjeta', money(c.totalTarjeta)))
    .text(fila('Credito', money(c.totalCredito)))
    .text(linea())
    .bold().text(fila('VENTAS', money(c.totalVentas))).clearFormatting()
    .text(linea())
    .text(fila('Efvo. esperado', money(c.efectivoEsperado)))
    .text(fila('Efvo. entregado', money(c.efectivoEntregado)))
  const dif = Number(c.diferencia || 0)
  const signo = dif < 0 ? '-' : dif > 0 ? '+' : ''
  b = b.bold().text(fila('Diferencia', signo + money(Math.abs(dif)))).clearFormatting()
  if (dif < 0) b = b.align('center').text('** FALTANTE **\n').align('left')
  b = b.text(linea())
    .text(fila('Devuelto', money(c.valorDevuelto)))
    .text(fila('Merma', money(c.valorMerma)))
    .text(linea())
    .align('center').text('Firma: ____________________\n').text('\n\n\n')
  await enviar(b)
}
