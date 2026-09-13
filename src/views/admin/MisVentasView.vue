<template>
  <div>
    <!-- KPIs de Mis Ventas -->
    <div class="kpis" v-if="!cargando && items.length">
      <div class="kpi-card">
        <div class="kpi-icon pine"><ion-icon :icon="cashOutline" /></div>
        <div class="kpi-info">
          <div class="kpi-l">Total vendido</div>
          <div class="kpi-v">{{ money(kpiTotalVendido) }}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon sky"><ion-icon :icon="cartOutline" /></div>
        <div class="kpi-info">
          <div class="kpi-l">Ventas activas</div>
          <div class="kpi-v">{{ itemsActivos.length }} ticket(s)</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon amber"><ion-icon :icon="receiptOutline" /></div>
        <div class="kpi-info">
          <div class="kpi-l">Ticket promedio</div>
          <div class="kpi-v">{{ money(kpiTicketPromedio) }}</div>
        </div>
      </div>
      <div class="kpi-card" v-if="kpiPendientesCount > 0">
        <div class="kpi-icon clay"><ion-icon :icon="timeOutline" /></div>
        <div class="kpi-info">
          <div class="kpi-l">Con pago pendiente</div>
          <div class="kpi-v">{{ kpiPendientesCount }} ({{ money(kpiPendientesMonto) }})</div>
        </div>
      </div>
      <div class="kpi-card kpi-canc" v-if="kpiCanceladasCount > 0">
        <div class="kpi-icon clay"><ion-icon :icon="closeCircleOutline" /></div>
        <div class="kpi-info">
          <div class="kpi-l">Canceladas</div>
          <div class="kpi-v">{{ kpiCanceladasCount }} venta(s)</div>
        </div>
      </div>
    </div>

    <!-- Barra de filtros y búsqueda -->
    <div class="filtros-bar">
      <div class="search-box">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
        <input v-model="buscar" placeholder="Buscar por cliente o folio #…" @input="debounced">
      </div>

      <div class="periodos">
        <button class="p-btn" :class="{ on: periodo === 'hoy' && !soloCanceladas }" @click="setPeriodo('hoy')">Hoy</button>
        <button class="p-btn" :class="{ on: periodo === 'semana' && !soloCanceladas }" @click="setPeriodo('semana')">Esta semana</button>
        <button class="p-btn" :class="{ on: periodo === 'todos' && !soloCanceladas && !soloSinCorte }" @click="setPeriodo('todos')">Todas</button>
        <button class="p-btn tag-corte" :class="{ on: soloSinCorte && !soloCanceladas }" @click="toggleSinCorte()">
          Por cortar
        </button>
        <button v-if="kpiCanceladasCount > 0" class="p-btn tag-cancel" :class="{ on: soloCanceladas }" @click="toggleCanceladas()">
          Canceladas ({{ kpiCanceladasCount }})
        </button>
      </div>
    </div>

    <p v-if="cargando" class="muted">Cargando ventas…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else-if="!itemsPaginados.length" class="muted">No hay ventas registradas con los filtros seleccionados.</p>

    <!-- Lista de ventas -->
    <div class="grid" v-if="!cargando && itemsPaginados.length">
      <div v-for="v in itemsPaginados" :key="v.id" class="card" :class="{ open: abierta === v.id, cancelada: v.estado === 'Cancelado' }">
        <div class="head" @click="toggle(v)">
          <div class="chip" :class="{ chip_canc: v.estado === 'Cancelado' }">
            <ion-icon :icon="v.estado === 'Cancelado' ? closeCircleOutline : cartOutline" />
          </div>
          <div class="info">
            <div class="top-row">
              <span class="cli" :class="{ tachado: v.estado === 'Cancelado' }">{{ v.clienteNombreMostrar }}</span>
              <span v-if="v.estado === 'Cancelado'" class="badge-cancelada">CANCELADA</span>
              <template v-else>
                <span v-if="!v.corteCajaId" class="badge-por-cortar">Por cortar</span>
                <span v-else class="badge-cortado">Cortada #{{ v.corteCajaId }}</span>
              </template>
            </div>
            <div class="sub">
              #{{ v.id }} · {{ fecha(v.fecha) }} · {{ v.metodoPago || 'Efectivo' }}
              <span v-if="v.estadoPago === 'Pendiente' && v.estado !== 'Cancelado'" class="badge-pend">Pago pendiente</span>
            </div>
          </div>
          <div class="total" :class="{ tachado: v.estado === 'Cancelado' }">{{ money(v.total) }}</div>
          <ion-icon :icon="abierta === v.id ? chevronUp : chevronDown" class="arrow" />
        </div>

        <div class="detalle" v-if="abierta === v.id">
          <!-- Banner de auditoría si la venta fue cancelada -->
          <div v-if="v.estado === 'Cancelado'" class="banner-cancelada">
            <div class="bc-head">
              <ion-icon :icon="warningOutline" />
              <b>Venta cancelada en su totalidad</b>
            </div>
            <div class="bc-meta">
              <span><b>Fecha cancelación:</b> {{ fecha(v.canceladoEn) }}</span>
              <span v-if="v.canceladoPorNombre"><b>Cancelada por:</b> {{ v.canceladoPorNombre }}</span>
            </div>
            <div class="bc-motivo">
              <b>Motivo registrado:</b> {{ v.motivoCancelacion || 'No especificado' }}
            </div>
            <div class="bc-aviso">
              ℹ️ Todos los productos de este ticket regresaron al inventario. Esta venta no suma a tus cortes ni a tu efectivo en mano.
            </div>
          </div>

          <p v-if="cargandoDetalle" class="muted2">Cargando productos del ticket…</p>
          <template v-else-if="detalle">
            <div class="lineas-tit">Productos incluidos en el ticket original:</div>
            <div class="linea" :class="{ 'linea-canc': v.estado === 'Cancelado' }" v-for="l in detalle.lineas" :key="l.id">
              <span class="ln">{{ l.productoNombre }}</span>
              <span class="lc">{{ cantMostrar(l) }} × {{ precioMostrar(l) }}</span>
              <span class="ls">{{ money(l.subtotal) }}</span>
            </div>

            <div class="acciones" v-if="v.estado !== 'Cancelado'">
              <button class="pdf-b" :disabled="descargando === v.id" @click="descargarPdf(v)">
                <ion-icon :icon="documentTextOutline" />{{ descargando === v.id ? 'Generando…' : 'PDF' }}
              </button>
              <button class="print-b" :disabled="imprimiendo === v.id" @click="imprimirTermico(v, detalle)">
                <ion-icon :icon="printOutline" />{{ imprimiendo === v.id ? 'Imprimiendo…' : 'Ticket térmico' }}
              </button>
              <button v-if="puedeCancelar(v)" class="cancel-sale-b" @click="abrirModalCancelar(v)">
                <ion-icon :icon="closeCircleOutline" /> Cancelar venta
              </button>
            </div>
            <p v-if="printMsg && printId === v.id" class="print-status">{{ printMsg }}</p>

            <p v-if="!puedeCancelar(v) && v.corteCajaId && v.estado !== 'Cancelado'" class="hint-nc">
              Ya no se puede cancelar: quedó incluida y sellada en tu corte de caja #{{ v.corteCajaId }}.
            </p>
          </template>
        </div>
      </div>
    </div>

    <!-- Paginación -->
    <div class="pager" v-if="!cargando && totalPaginas > 1">
      <button class="pg" :disabled="pagina <= 1" @click="irPagina(pagina - 1)">
        <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <button v-for="n in paginasVisibles" :key="n" class="pg num" :class="{ on: n === pagina }" @click="irPagina(n)">{{ n }}</button>
      <button class="pg" :disabled="pagina >= totalPaginas" @click="irPagina(pagina + 1)">
        <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
    <p v-if="!cargando && totalItems" class="cuenta">
      {{ totalItems }} venta(s) filtrada(s) · página {{ pagina }} de {{ totalPaginas }}
    </p>

    <!-- Modal: Cancelar venta completa -->
    <div v-if="cancelarModal" class="modal-bg" @click.self="cerrarModalCancelar()">
      <div class="modal">
        <div class="m-head m-head-warn">
          <div>
            <div class="m-title">Cancelar venta #{{ cancelarModal.id }}</div>
            <div class="m-sub">{{ cancelarModal.clienteNombreMostrar }} · Total: {{ money(cancelarModal.total) }}</div>
          </div>
          <button class="m-x" @click="cerrarModalCancelar()"><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div class="m-body">
          <div class="aviso-seguridad">
            <div class="as-icon"><ion-icon :icon="shieldCheckmarkOutline" /></div>
            <div class="as-txt">
              <b>Cancelación total segura:</b>
              <p>Al cancelar, <b>el 100% de los productos regresará al inventario</b> de inmediato y la venta quedará registrada como cancelada con tu nombre y motivo para la supervisión del administrador.</p>
            </div>
          </div>

          <div class="m-field">
            <div class="m-fl">Selecciona o escribe el motivo de la cancelación *</div>
            <div class="motivos-chips">
              <button
                v-for="m in motivosRapidos"
                :key="m"
                type="button"
                class="chip-motivo"
                :class="{ on: motivoCancelacion === m }"
                @click="motivoCancelacion = m"
              >
                {{ m }}
              </button>
            </div>
            <textarea
              class="m-textarea"
              v-model="motivoCancelacion"
              placeholder="Escribe el motivo detallado de la cancelación…"
              rows="3"
            ></textarea>
          </div>

          <p v-if="errorCancelar" class="m-err">{{ errorCancelar }}</p>
        </div>
        <div class="m-foot">
          <button class="m-cancel" @click="cerrarModalCancelar()">Regresar</button>
          <button
            class="m-btn-danger"
            :disabled="cancelando || !motivoCancelacion.trim() || motivoCancelacion.trim().length < 4"
            @click="confirmarCancelacion()"
          >
            <ion-icon :icon="closeCircleOutline" />
            {{ cancelando ? 'Cancelando venta…' : 'Confirmar cancelación total' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Guía interactiva -->
    <div class="guia-card">
      <div class="guia-header" @click="mostrarGuia = !mostrarGuia">
        <div class="guia-icon">💡</div>
        <div class="guia-tit">¿Cómo funciona la Cancelación de Ventas y el Control de Caja?</div>
        <div class="guia-badge">{{ mostrarGuia ? 'Ocultar guía' : 'Ver guía' }}</div>
      </div>
      <div v-if="mostrarGuia" class="guia-content">
        <div class="guia-item">
          <div class="gi-num">1</div>
          <div class="gi-text">
            <b>Cancelación completa por seguridad:</b> Si el cliente cambia de parecer o desea llevar otros productos, pulsa <b>"Cancelar venta"</b> indicando el motivo. El inventario se restablece íntegramente al momento y el administrador recibe una notificación con la auditoría. Para entregar los nuevos productos, simplemente registra una nueva venta en el mostrador.
          </div>
        </div>
        <div class="guia-item">
          <div class="gi-num">2</div>
          <div class="gi-text">
            <b>Inclusión en el Corte de caja:</b> Solo las ventas activas marcadas como "Por cortar" se integran en tu corte de caja en <i>Mi corte</i>. Las ventas canceladas quedan excluidas del corte y de tu efectivo esperado.
          </div>
        </div>
        <div class="guia-item">
          <div class="gi-num">3</div>
          <div class="gi-text">
            <b>Impresión Térmica y PDF:</b> Puedes reimprimir cualquier comprobante de tus ventas activas mediante el botón "Ticket térmico". Las ventas canceladas quedan anuladas y deshabilitadas para reimpresión.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { IonIcon } from '@ionic/vue'
import {
  cartOutline,
  cashOutline,
  receiptOutline,
  timeOutline,
  chevronDown,
  chevronUp,
  documentTextOutline,
  closeCircleOutline,
  warningOutline,
  shieldCheckmarkOutline,
  printOutline
} from 'ionicons/icons'
import http from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { imprimirTicketVenta } from '@/services/printer'

const emit = defineEmits(['ctx'])
const auth = useAuthStore()
const items = ref([])
const cargando = ref(true)
const error = ref('')
const abierta = ref(null)
const detalle = ref(null)
const cargandoDetalle = ref(false)
const descargando = ref(null)
const imprimiendo = ref(null)
const printId = ref(null)
const printMsg = ref('')
const mostrarGuia = ref(false)

// Cancelación de venta
const cancelarModal = ref(null)
const motivoCancelacion = ref('')
const cancelando = ref(false)
const errorCancelar = ref('')
const motivosRapidos = [
  'Cliente cambió de productos / llevará otra cosa',
  'Error de captura / productos equivocados',
  'Cliente canceló la compra / no completó el pago',
  'Error en precio o método de pago'
]

// Filtros y búsqueda
const buscar = ref('')
const periodo = ref('todos') // 'hoy' | 'semana' | 'todos'
const soloSinCorte = ref(false)
const soloCanceladas = ref(false)
let timerBusqueda = null

// Paginación local
const pagina = ref(1)
const tamano = ref(18)

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const fmt = (n) => Number(n || 0).toLocaleString('es-MX')
const fecha = (f) => f ? new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

function setPeriodo(p) {
  periodo.value = p
  soloCanceladas.value = false
  pagina.value = 1
}

function toggleSinCorte() {
  soloSinCorte.value = !soloSinCorte.value
  soloCanceladas.value = false
  pagina.value = 1
}

function toggleCanceladas() {
  soloCanceladas.value = !soloCanceladas.value
  if (soloCanceladas.value) soloSinCorte.value = false
  pagina.value = 1
}

function debounced() {
  clearTimeout(timerBusqueda)
  timerBusqueda = setTimeout(() => { pagina.value = 1 }, 250)
}

// Filtro en cliente
const itemsFiltrados = computed(() => {
  let list = items.value

  // Filtro de búsqueda por texto o folio
  const q = buscar.value.trim().toLowerCase()
  if (q) {
    list = list.filter((v) => {
      const nom = (v.clienteNombreMostrar || '').toLowerCase()
      const folio = String(v.id)
      return nom.includes(q) || folio.includes(q)
    })
  }

  // Filtro por período
  if (periodo.value === 'hoy') {
    const inicioHoy = new Date()
    inicioHoy.setHours(0, 0, 0, 0)
    list = list.filter((v) => new Date(v.fecha) >= inicioHoy)
  } else if (periodo.value === 'semana') {
    const inicioSemana = new Date()
    inicioSemana.setDate(inicioSemana.getDate() - 7)
    inicioSemana.setHours(0, 0, 0, 0)
    list = list.filter((v) => new Date(v.fecha) >= inicioSemana)
  }

  // Filtros especiales
  if (soloCanceladas.value) {
    list = list.filter((v) => v.estado === 'Cancelado')
  } else if (soloSinCorte.value) {
    list = list.filter((v) => !v.corteCajaId && v.estado !== 'Cancelado')
  }

  return list
})

// Ventas activas vs canceladas para KPIs
const itemsActivos = computed(() => itemsFiltrados.value.filter(v => v.estado !== 'Cancelado'))
const itemsCancelados = computed(() => itemsFiltrados.value.filter(v => v.estado === 'Cancelado'))

// KPIs calculados sobre ventas activas (las canceladas se descuentan contablemente)
const kpiTotalVendido = computed(() => itemsActivos.value.reduce((s, v) => s + (v.total || 0), 0))
const kpiTicketPromedio = computed(() => itemsActivos.value.length ? kpiTotalVendido.value / itemsActivos.value.length : 0)
const kpiPendientes = computed(() => itemsActivos.value.filter(v => v.estadoPago === 'Pendiente'))
const kpiPendientesCount = computed(() => kpiPendientes.value.length)
const kpiPendientesMonto = computed(() => kpiPendientes.value.reduce((s, v) => s + (v.total || 0), 0))
const kpiCanceladasCount = computed(() => itemsCancelados.value.length)

// Paginación
const totalItems = computed(() => itemsFiltrados.value.length)
const totalPaginas = computed(() => Math.max(1, Math.ceil(totalItems.value / tamano.value)))
const paginasVisibles = computed(() => {
  const tp = totalPaginas.value, actual = pagina.value
  const rango = []
  let ini = Math.max(1, actual - 2), fin = Math.min(tp, ini + 4)
  ini = Math.max(1, fin - 4)
  for (let i = ini; i <= fin; i++) rango.push(i)
  return rango
})
const itemsPaginados = computed(() => {
  const ini = (pagina.value - 1) * tamano.value
  return itemsFiltrados.value.slice(ini, ini + tamano.value)
})

function irPagina(n) {
  if (n >= 1 && n <= totalPaginas.value) pagina.value = n
}

function esCajaLinea(l) { return !!l.esCaja && l.piezasPorCaja > 0 }
function cantMostrar(l) { return esCajaLinea(l) ? `${fmt(l.cantidadEntregada / l.piezasPorCaja)} caja(s)` : fmt(l.cantidadEntregada) }
function precioMostrar(l) { return esCajaLinea(l) ? money(l.precioUnitario * l.piezasPorCaja) : money(l.precioUnitario) }

function puedeCancelar(v) {
  return v.estado !== 'Cancelado' && !v.corteCajaId
}

async function toggle(v) {
  if (abierta.value === v.id) { abierta.value = null; return }
  abierta.value = v.id
  printMsg.value = ''
  await cargarDetalle(v.id)
}

async function cargarDetalle(id) {
  cargandoDetalle.value = true; detalle.value = null
  try {
    const { data } = await http.get(`/pedidos/${id}`)
    detalle.value = data
  } catch {
    /* reintento manual */
  } finally {
    cargandoDetalle.value = false
  }
}

function abrirModalCancelar(v) {
  cancelarModal.value = v
  motivoCancelacion.value = 'Cliente cambió de productos / llevará otra cosa'
  errorCancelar.value = ''
}

function cerrarModalCancelar() {
  cancelarModal.value = null
  motivoCancelacion.value = ''
  errorCancelar.value = ''
}

async function confirmarCancelacion() {
  if (!cancelarModal.value) return
  if (!motivoCancelacion.value.trim() || motivoCancelacion.value.trim().length < 4) {
    errorCancelar.value = 'Por favor escribe un motivo claro de la cancelación (mínimo 4 letras).'
    return
  }

  cancelando.value = true
  errorCancelar.value = ''
  try {
    const id = cancelarModal.value.id
    const { data } = await http.post(`/pedidos/${id}/cancelar-venta`, {
      motivo: motivoCancelacion.value.trim()
    })

    // Actualizar elemento en lista local
    const idx = items.value.findIndex(x => x.id === id)
    if (idx >= 0) {
      items.value[idx] = {
        ...items.value[idx],
        estado: 'Cancelado',
        canceladoEn: data.canceladoEn,
        canceladoPorNombre: data.canceladoPorNombre,
        motivoCancelacion: data.motivoCancelacion
      }
    }
    if (detalle.value && detalle.value.id === id) {
      detalle.value = data
    }
    cerrarModalCancelar()
  } catch (e) {
    errorCancelar.value = e.response?.data?.mensaje || 'No se pudo cancelar la venta.'
  } finally {
    cancelando.value = false
  }
}

async function descargarPdf(v) {
  descargando.value = v.id
  try {
    const res = await http.get(`/pedidos/${v.id}/pdf`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url; a.download = `ticket-venta-${v.id}.pdf`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => window.URL.revokeObjectURL(url), 4000)
  } catch {
    error.value = 'No se pudo generar el ticket PDF.'
  } finally {
    descargando.value = null
  }
}

async function imprimirTermico(v, det) {
  imprimiendo.value = v.id
  printId.value = v.id
  printMsg.value = ''
  try {
    const lineas = (det?.lineas || []).map(l => ({
      nombre: l.productoNombre + (esCajaLinea(l) ? ' (Caja)' : ''),
      cantidad: esCajaLinea(l) ? (l.cantidadEntregada / l.piezasPorCaja) : l.cantidadEntregada,
      precio: esCajaLinea(l) ? (l.precioUnitario * l.piezasPorCaja) : l.precioUnitario
    }))

    const res = await imprimirTicketVenta({
      ticketId: v.id,
      fecha: v.fecha,
      cliente: v.clienteNombreMostrar,
      total: v.total,
      metodo: v.metodoPago || 'Efectivo',
      pagoPendiente: v.estadoPago === 'Pendiente',
      credito: v.metodoPago === 'Crédito',
      items: lineas
    })
    if (res && res.error) {
      printMsg.value = 'Aviso: ' + res.error
    } else {
      printMsg.value = 'Ticket térmico impreso con éxito.'
    }
  } catch (e) {
    printMsg.value = 'Error de impresión: ' + (e.message || 'Verifique impresora Bluetooth.')
  } finally {
    imprimiendo.value = null
  }
}

async function cargar() {
  cargando.value = true; error.value = ''
  try {
    const { data } = await http.get('/pedidos', { params: { repartidorId: auth.usuarioId, esVentaLibre: true, tamano: 200 } })
    items.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudieron cargar tus ventas.'
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  emit('ctx', { titulo: 'Mis ventas', sub: 'Historial y comprobantes de tus ventas de mostrador', back: null })
  cargar()
})
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; }
.muted2 { color: var(--muted); font-size: 13px; padding: 6px 2px; }
.err { color: var(--clay); font-weight: 600; margin-top: 16px; font-size: 13px; }

/* KPIs */
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 16px; }
.kpi-card { display: flex; align-items: center; gap: 12px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 13px 15px; box-shadow: var(--shadow); }
.kpi-icon { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; flex: 0 0 auto; }
.kpi-icon ion-icon { font-size: 20px; }
.kpi-icon.pine { background: var(--pine-tint); color: var(--pine); }
.kpi-icon.sky { background: var(--sky-soft); color: var(--sky); }
.kpi-icon.amber { background: var(--amber-soft); color: #B9781F; }
.kpi-icon.clay { background: var(--clay-soft); color: var(--clay); }
.kpi-card.kpi-canc { border-color: #F0D5D0; background: #FAF6F5; }
.kpi-info { flex: 1; min-width: 0; }
.kpi-l { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); }
.kpi-v { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; color: var(--ink); margin-top: 2px; font-variant-numeric: tabular-nums; }

/* Filtros y búsqueda */
.filtros-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 16px; }
.search-box { display: flex; align-items: center; gap: 8px; background: var(--surface); border: 1px solid var(--line); border-radius: 13px; padding: 9px 13px; flex: 1; min-width: 240px; box-shadow: var(--shadow); }
.search-box svg { width: 17px; height: 17px; stroke: var(--muted); fill: none; stroke-width: 2; flex: 0 0 auto; }
.search-box input { border: none; background: transparent; outline: none; font-size: 14px; font-weight: 500; color: var(--ink); width: 100%; }
.periodos { display: flex; gap: 6px; flex-wrap: wrap; }
.p-btn { border: 1px solid var(--line); background: var(--surface); color: var(--muted); border-radius: 999px; padding: 8px 14px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12px; cursor: pointer; transition: .15s; }
.p-btn.on { background: var(--pine); color: #fff; border-color: var(--pine); }
.p-btn.tag-corte.on { background: var(--amber); color: #fff; border-color: var(--amber); }
.p-btn.tag-cancel.on { background: var(--clay); color: #fff; border-color: var(--clay); }

/* Grid de ventas */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 12px; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow); overflow: hidden; transition: border-color .15s; }
.card.cancelada { background: #FCFAF9; border-color: #F0D5D0; }
.head { display: flex; align-items: center; gap: 13px; padding: 14px; cursor: pointer; }
.chip { width: 42px; height: 42px; border-radius: 11px; background: var(--pine-tint); display: grid; place-items: center; flex: 0 0 auto; }
.chip ion-icon { font-size: 21px; color: var(--pine); }
.chip.chip_canc { background: #FDE8E4; }
.chip.chip_canc ion-icon { color: var(--clay); }
.info { flex: 1; min-width: 0; }
.top-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.cli { font-weight: 700; font-size: 15px; }
.cli.tachado { text-decoration: line-through; color: var(--muted); }
.sub { font-size: 12px; color: var(--muted); margin-top: 3px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.badge-por-cortar { background: var(--amber-soft); color: #9A6512; font-weight: 700; font-size: 10px; padding: 2px 7px; border-radius: 6px; text-transform: uppercase; }
.badge-cortado { background: var(--paper-2); color: var(--muted); font-weight: 600; font-size: 10px; padding: 2px 7px; border-radius: 6px; }
.badge-pend { background: #FDE8E4; color: var(--clay); font-weight: 700; font-size: 10px; padding: 2px 7px; border-radius: 6px; }
.badge-cancelada { background: #FDE8E4; color: var(--clay); font-weight: 800; font-size: 10px; letter-spacing: .04em; padding: 2px 7px; border-radius: 6px; }
.total { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; font-variant-numeric: tabular-nums; flex: 0 0 auto; }
.total.tachado { text-decoration: line-through; color: var(--clay); }
.arrow { color: var(--muted); font-size: 18px; flex: 0 0 auto; }

.detalle { border-top: 1px solid var(--line); padding: 14px; background: var(--paper); }
.lineas-tit { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); margin-bottom: 8px; }
.linea { display: flex; align-items: center; gap: 10px; font-size: 12.5px; padding: 6px 0; }
.linea.linea-canc { opacity: .75; }
.linea .ln { flex: 1; min-width: 0; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.linea .lc { color: var(--muted); flex: 0 0 auto; }
.linea .ls { font-weight: 700; flex: 0 0 auto; min-width: 64px; text-align: right; font-variant-numeric: tabular-nums; }

/* Banner de cancelación */
.banner-cancelada { background: #FFF5F4; border: 1px solid #F0D5D0; border-radius: 13px; padding: 12px 14px; margin-bottom: 12px; }
.bc-head { display: flex; align-items: center; gap: 6px; color: var(--clay); font-size: 13px; margin-bottom: 6px; }
.bc-head ion-icon { font-size: 17px; }
.bc-meta { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; color: var(--ink-soft); margin-bottom: 4px; }
.bc-motivo { font-size: 12.5px; color: var(--ink); margin-top: 6px; padding: 6px 9px; background: rgba(217, 83, 79, .06); border-radius: 8px; }
.bc-motivo b { color: var(--clay); }
.bc-aviso { font-size: 11.5px; color: #9A6512; line-height: 1.4; margin-top: 8px; }

.acciones { display: flex; gap: 7px; margin-top: 12px; flex-wrap: wrap; }
.pdf-b, .print-b, .cancel-sale-b { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 110px; background: var(--surface); border: 1px solid var(--line); color: var(--ink-soft); border-radius: 11px; padding: 9px 10px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12px; cursor: pointer; justify-content: center; }
.pdf-b ion-icon { font-size: 16px; color: var(--sky); }
.print-b ion-icon { font-size: 16px; color: var(--pine); }
.cancel-sale-b { color: var(--clay); border-color: #F0D5D0; background: #FFF7F6; }
.cancel-sale-b ion-icon { font-size: 16px; color: var(--clay); }
.cancel-sale-b:hover { background: #FDE8E4; }
.pdf-b:disabled, .print-b:disabled, .cancel-sale-b:disabled { opacity: .6; }
.print-status { font-size: 11.5px; font-weight: 600; color: var(--pine); margin-top: 6px; }
.hint-nc { font-size: 11.5px; color: var(--muted); margin-top: 9px; line-height: 1.4; }

/* Paginación */
.pager { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 22px; }
.pg { min-width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); display: grid; place-items: center; cursor: pointer; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; color: var(--ink-soft); padding: 0 6px; }
.pg svg { width: 17px; height: 17px; stroke: var(--ink-soft); fill: none; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.pg:disabled { opacity: .4; cursor: default; }
.pg.num.on { background: var(--pine); color: #fff; border-color: var(--pine); }
.cuenta { text-align: center; color: var(--muted); font-size: 12px; font-weight: 600; margin-top: 10px; }

/* Modales */
.modal-bg { position: fixed; inset: 0; background: rgba(14,24,20,.5); backdrop-filter: blur(4px); z-index: 999; display: grid; place-items: center; padding: 16px; }
.modal { background: var(--surface); border: 1px solid var(--line); border-radius: 20px; width: 100%; max-width: 480px; box-shadow: 0 24px 48px -12px rgba(0,0,0,.25); overflow: hidden; animation: pop .18s ease-out; }
@keyframes pop { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
.m-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid var(--line); background: var(--paper); }
.m-head.m-head-warn { background: #FFF5F4; border-bottom-color: #F0D5D0; }
.m-title { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 16.5px; color: var(--ink); }
.m-sub { font-size: 12.5px; color: var(--muted); margin-top: 3px; }
.m-x { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface); display: grid; place-items: center; cursor: pointer; }
.m-x svg { width: 15px; height: 15px; stroke: var(--muted); stroke-width: 2; }
.m-body { padding: 20px; }
.aviso-seguridad { display: flex; gap: 11px; background: #F4FAF7; border: 1px solid #D5EDE3; border-radius: 12px; padding: 11px 13px; margin-bottom: 16px; }
.as-icon { font-size: 22px; color: var(--pine); flex: 0 0 auto; margin-top: 2px; }
.as-txt { font-size: 12.5px; color: var(--ink-soft); line-height: 1.45; }
.as-txt b { color: var(--pine); }
.as-txt p { margin: 4px 0 0; }
.m-field { margin-bottom: 14px; }
.m-fl { font-size: 12.5px; font-weight: 700; color: var(--ink); margin-bottom: 8px; }
.motivos-chips { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
.chip-motivo { text-align: left; background: var(--paper); border: 1px solid var(--line); border-radius: 9px; padding: 7px 11px; font-size: 12px; font-weight: 600; color: var(--ink-soft); cursor: pointer; transition: .15s; }
.chip-motivo.on { background: #FDE8E4; border-color: var(--clay); color: var(--clay); font-weight: 700; }
.m-textarea { width: 100%; border: 1px solid var(--line); border-radius: 10px; background: var(--paper); padding: 9px 12px; font-size: 13px; font-weight: 500; color: var(--ink); outline: none; font-family: inherit; resize: vertical; }
.m-textarea:focus { border-color: var(--clay); }
.m-err { color: var(--clay); font-size: 12.5px; font-weight: 600; margin-top: 8px; }
.m-foot { display: flex; gap: 8px; justify-content: flex-end; padding: 14px 20px; border-top: 1px solid var(--line); background: var(--paper); }
.m-cancel { background: transparent; border: 1px solid var(--line); border-radius: 10px; padding: 8px 14px; font-weight: 700; font-size: 13px; cursor: pointer; color: var(--muted); }
.m-btn-danger { display: flex; align-items: center; gap: 6px; background: var(--clay); border: 1px solid var(--clay); border-radius: 10px; padding: 9px 16px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13px; color: #fff; cursor: pointer; }
.m-btn-danger:disabled { opacity: .5; cursor: not-allowed; }

/* Guía interactiva */
.guia-card { margin-top: 26px; background: var(--surface); border: 1px solid var(--line); border-radius: 18px; overflow: hidden; box-shadow: var(--shadow); }
.guia-header { display: flex; align-items: center; gap: 10px; padding: 14px 18px; cursor: pointer; user-select: none; background: var(--paper); }
.guia-icon { font-size: 19px; }
.guia-tit { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; color: var(--ink); flex: 1; }
.guia-badge { font-size: 11.5px; font-weight: 700; color: var(--pine); background: var(--pine-tint); padding: 4px 10px; border-radius: 999px; }
.guia-content { padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; border-top: 1px solid var(--line); }
.guia-item { display: flex; gap: 12px; align-items: flex-start; }
.gi-num { width: 22px; height: 22px; border-radius: 50%; background: var(--pine-tint); color: var(--pine); display: grid; place-items: center; font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 11.5px; flex: 0 0 auto; margin-top: 2px; }
.gi-text { font-size: 12.5px; color: var(--ink-soft); line-height: 1.45; }
.gi-text b { color: var(--ink); font-weight: 700; }
</style>
