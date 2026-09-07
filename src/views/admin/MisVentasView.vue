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
          <div class="kpi-l">Ventas registradas</div>
          <div class="kpi-v">{{ items.length }} ticket(s)</div>
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
    </div>

    <!-- Barra de filtros y búsqueda -->
    <div class="filtros-bar">
      <div class="search-box">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
        <input v-model="buscar" placeholder="Buscar por cliente o folio #…" @input="debounced">
      </div>

      <div class="periodos">
        <button class="p-btn" :class="{ on: periodo === 'hoy' }" @click="setPeriodo('hoy')">Hoy</button>
        <button class="p-btn" :class="{ on: periodo === 'semana' }" @click="setPeriodo('semana')">Esta semana</button>
        <button class="p-btn" :class="{ on: periodo === 'todos' }" @click="setPeriodo('todos')">Todas</button>
        <button class="p-btn tag-corte" :class="{ on: soloSinCorte }" @click="soloSinCorte = !soloSinCorte">
          Por cortar
        </button>
      </div>
    </div>

    <p v-if="cargando" class="muted">Cargando ventas…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else-if="!itemsPaginados.length" class="muted">No hay ventas registradas con los filtros seleccionados.</p>

    <!-- Lista de ventas -->
    <div class="grid" v-if="!cargando && itemsPaginados.length">
      <div v-for="v in itemsPaginados" :key="v.id" class="card" :class="{ open: abierta === v.id }">
        <div class="head" @click="toggle(v)">
          <div class="chip"><ion-icon :icon="cartOutline" /></div>
          <div class="info">
            <div class="top-row">
              <span class="cli">{{ v.clienteNombreMostrar }}</span>
              <span v-if="!v.corteCajaId" class="badge-por-cortar">Por cortar</span>
              <span v-else class="badge-cortado">Cortada #{{ v.corteCajaId }}</span>
            </div>
            <div class="sub">
              #{{ v.id }} · {{ fecha(v.fecha) }} · {{ v.metodoPago || 'Efectivo' }}
              <span v-if="v.estadoPago === 'Pendiente'" class="badge-pend">Pago pendiente</span>
              <span v-if="v.editadoEn" class="badge-ed">Editada</span>
            </div>
          </div>
          <div class="total">{{ money(v.total) }}</div>
          <ion-icon :icon="abierta === v.id ? chevronUp : chevronDown" class="arrow" />
        </div>

        <div class="detalle" v-if="abierta === v.id">
          <p v-if="cargandoDetalle" class="muted2">Cargando productos del ticket…</p>
          <template v-else-if="detalle">
            <template v-if="editando !== v.id">
              <div class="linea" v-for="l in detalle.lineas" :key="l.id">
                <span class="ln">{{ l.productoNombre }}</span>
                <span class="lc">{{ cantMostrar(l) }} × {{ precioMostrar(l) }}</span>
                <span class="ls">{{ money(l.subtotal) }}</span>
              </div>

              <div class="acciones">
                <button class="pdf-b" :disabled="descargando === v.id" @click="descargarPdf(v)">
                  <ion-icon :icon="documentTextOutline" />{{ descargando === v.id ? 'Generando…' : 'PDF' }}
                </button>
                <button class="print-b" :disabled="imprimiendo === v.id" @click="imprimirTermico(v, detalle)">
                  <ion-icon :icon="printOutline" />{{ imprimiendo === v.id ? 'Imprimiendo…' : 'Ticket térmico' }}
                </button>
                <button v-if="puedeEditar(v)" class="edit-b" @click="iniciarEdicion(v)">
                  <ion-icon :icon="createOutline" /> Corregir
                </button>
              </div>
              <p v-if="printMsg && printId === v.id" class="print-status">{{ printMsg }}</p>

              <p v-if="!puedeEditar(v) && esLaMasReciente(v) && v.corteCajaId" class="hint-nc">
                Ya no se puede corregir: quedó incluida y sellada en tu corte de caja #{{ v.corteCajaId }}.
              </p>
              <p v-else-if="!esLaMasReciente(v)" class="hint-nc">
                Solo puedes corregir tu venta más reciente no cortada.
              </p>
            </template>

            <template v-else>
              <p class="hint-nc">Ajusta la cantidad entregada real al cliente para recalcular el ticket.</p>
              <div class="linea edit" v-for="l in detalle.lineas" :key="l.id">
                <span class="ln">{{ l.productoNombre }}<small v-if="esCajaLinea(l)"> (caja de {{ l.piezasPorCaja }})</small></span>
                <input class="qty" type="number" min="0" :step="esCajaLinea(l) ? 1 : 0.001" v-model.number="cantEdit[l.id]">
                <span class="unit" v-if="esCajaLinea(l)">caja(s)</span>
                <span class="ls">{{ money(piezasDe(l) * l.precioUnitario) }}</span>
              </div>
              <div class="tot-edit">Nuevo total: <b>{{ money(totalEdit) }}</b></div>
              <p v-if="errorEdit" class="err">{{ errorEdit }}</p>
              <div class="acciones">
                <button class="cancel-b" @click="cancelarEdicion()">Cancelar</button>
                <button class="save-b" :disabled="guardando" @click="guardarEdicion(v)">{{ guardando ? 'Guardando…' : 'Guardar corrección' }}</button>
              </div>
            </template>
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

    <!-- Guía interactiva -->
    <div class="guia-card">
      <div class="guia-header" @click="mostrarGuia = !mostrarGuia">
        <div class="guia-icon">💡</div>
        <div class="guia-tit">¿Cómo funciona el Historial y Corrección de Ventas?</div>
        <div class="guia-badge">{{ mostrarGuia ? 'Ocultar guía' : 'Ver guía' }}</div>
      </div>
      <div v-if="mostrarGuia" class="guia-content">
        <div class="guia-item">
          <div class="gi-num">1</div>
          <div class="gi-text">
            <b>Regla de corrección de venta:</b> Solo la venta más reciente registrada por tu usuario y que aún <b>no</b> haya sido cerrada en un corte de caja puede corregirse. Si hubo un error en cantidades, usa el botón "Corregir".
          </div>
        </div>
        <div class="guia-item">
          <div class="gi-num">2</div>
          <div class="gi-text">
            <b>Inclusión en el Corte de caja:</b> Todas las ventas marcadas como "Por cortar" se integrarán automáticamente en tu siguiente corte de caja en el módulo <i>Mi corte</i>. Al cerrar el corte, quedan selladas contablemente.
          </div>
        </div>
        <div class="guia-item">
          <div class="gi-num">3</div>
          <div class="gi-text">
            <b>Impresión Térmica y PDF:</b> Puedes reimprimir cualquier comprobante en cualquier momento. El botón "Ticket térmico" manda la orden directamente a tu impresora portátil Bluetooth MUNBYN 58mm.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { IonIcon } from '@ionic/vue'
import {
  cartOutline,
  cashOutline,
  receiptOutline,
  timeOutline,
  chevronDown,
  chevronUp,
  documentTextOutline,
  createOutline,
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
const editando = ref(null)
const cantEdit = reactive({})
const guardando = ref(false)
const errorEdit = ref('')
const mostrarGuia = ref(false)

// Filtros y búsqueda
const buscar = ref('')
const periodo = ref('todos') // 'hoy' | 'semana' | 'todos'
const soloSinCorte = ref(false)
let timerBusqueda = null

// Paginación local
const pagina = ref(1)
const tamano = ref(18)

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const fmt = (n) => Number(n || 0).toLocaleString('es-MX')
const fecha = (f) => new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function setPeriodo(p) {
  periodo.value = p
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

  // Filtro sin corte
  if (soloSinCorte.value) {
    list = list.filter((v) => !v.corteCajaId)
  }

  return list
})

// KPIs reactivos al conjunto filtrado
const kpiTotalVendido = computed(() => itemsFiltrados.value.reduce((s, v) => s + (v.total || 0), 0))
const kpiTicketPromedio = computed(() => itemsFiltrados.value.length ? kpiTotalVendido.value / itemsFiltrados.value.length : 0)
const kpiPendientes = computed(() => itemsFiltrados.value.filter(v => v.estadoPago === 'Pendiente'))
const kpiPendientesCount = computed(() => kpiPendientes.value.length)
const kpiPendientesMonto = computed(() => kpiPendientes.value.reduce((s, v) => s + (v.total || 0), 0))

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
function piezasDe(l) { const cant = Number(cantEdit[l.id]) || 0; return esCajaLinea(l) ? cant * l.piezasPorCaja : cant }

function esLaMasReciente(v) { return items.value[0]?.id === v.id }
function puedeEditar(v) { return esLaMasReciente(v) && !v.corteCajaId }

async function toggle(v) {
  if (abierta.value === v.id) { abierta.value = null; return }
  abierta.value = v.id
  editando.value = null
  printMsg.value = ''
  await cargarDetalle(v.id)
}

async function cargarDetalle(id) {
  cargandoDetalle.value = true; detalle.value = null
  try { const { data } = await http.get(`/pedidos/${id}`); detalle.value = data }
  catch { /* reintento manual */ }
  finally { cargandoDetalle.value = false }
}

function iniciarEdicion(v) {
  editando.value = v.id
  errorEdit.value = ''
  Object.keys(cantEdit).forEach((k) => delete cantEdit[k])
  detalle.value.lineas.forEach((l) => {
    cantEdit[l.id] = esCajaLinea(l) ? l.cantidadEntregada / l.piezasPorCaja : l.cantidadEntregada
  })
}
function cancelarEdicion() { editando.value = null; errorEdit.value = '' }
const totalEdit = computed(() => detalle.value ? detalle.value.lineas.reduce((s, l) => s + piezasDe(l) * l.precioUnitario, 0) : 0)

async function guardarEdicion(v) {
  guardando.value = true; errorEdit.value = ''
  try {
    const lineas = detalle.value.lineas
      .map((l) => ({ pedidoLineaId: l.id, nuevaCantidad: piezasDe(l), original: l.cantidadEntregada }))
      .filter((l) => l.nuevaCantidad !== l.original)
      .map(({ pedidoLineaId, nuevaCantidad }) => ({ pedidoLineaId, nuevaCantidad }))
    if (!lineas.length) { errorEdit.value = 'No hay cambios que guardar.'; guardando.value = false; return }
    const { data } = await http.put(`/pedidos/${v.id}/editar-venta`, { lineas })
    detalle.value = data
    const idx = items.value.findIndex((x) => x.id === v.id)
    if (idx >= 0) items.value[idx] = { ...items.value[idx], total: data.total, editadoEn: data.editadoEn }
    editando.value = null
  } catch (e) { errorEdit.value = e.response?.data?.mensaje || 'No se pudo guardar la corrección.' }
  finally { guardando.value = false }
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
  } catch { error.value = 'No se pudo generar el ticket PDF.' }
  finally { descargando.value = null }
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
  } catch (e) { error.value = e.response?.data?.mensaje || 'No se pudieron cargar tus ventas.' }
  finally { cargando.value = false }
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
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; margin-bottom: 16px; }
.kpi-card { display: flex; align-items: center; gap: 12px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 13px 15px; box-shadow: var(--shadow); }
.kpi-icon { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; flex: 0 0 auto; }
.kpi-icon ion-icon { font-size: 20px; }
.kpi-icon.pine { background: var(--pine-tint); color: var(--pine); }
.kpi-icon.sky { background: var(--sky-soft); color: var(--sky); }
.kpi-icon.amber { background: var(--amber-soft); color: #B9781F; }
.kpi-icon.clay { background: var(--clay-soft); color: var(--clay); }
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

/* Grid de ventas */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 12px; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow); overflow: hidden; }
.head { display: flex; align-items: center; gap: 13px; padding: 14px; cursor: pointer; }
.chip { width: 42px; height: 42px; border-radius: 11px; background: var(--pine-tint); display: grid; place-items: center; flex: 0 0 auto; }
.chip ion-icon { font-size: 21px; color: var(--pine); }
.info { flex: 1; min-width: 0; }
.top-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.cli { font-weight: 700; font-size: 15px; }
.sub { font-size: 12px; color: var(--muted); margin-top: 3px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.badge-por-cortar { background: var(--amber-soft); color: #9A6512; font-weight: 700; font-size: 10px; padding: 2px 7px; border-radius: 6px; text-transform: uppercase; }
.badge-cortado { background: var(--paper-2); color: var(--muted); font-weight: 600; font-size: 10px; padding: 2px 7px; border-radius: 6px; }
.badge-pend { background: #FDE8E4; color: var(--clay); font-weight: 700; font-size: 10px; padding: 2px 7px; border-radius: 6px; }
.badge-ed { background: var(--amber-soft); color: #B9781F; font-weight: 700; font-size: 10px; text-transform: uppercase; padding: 2px 7px; border-radius: 6px; }
.total { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; font-variant-numeric: tabular-nums; flex: 0 0 auto; }
.arrow { color: var(--muted); font-size: 18px; flex: 0 0 auto; }

.detalle { border-top: 1px solid var(--line); padding: 12px 14px; background: var(--paper); }
.linea { display: flex; align-items: center; gap: 10px; font-size: 12.5px; padding: 6px 0; }
.linea .ln { flex: 1; min-width: 0; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.linea .lc { color: var(--muted); flex: 0 0 auto; }
.linea .ls { font-weight: 700; flex: 0 0 auto; min-width: 64px; text-align: right; font-variant-numeric: tabular-nums; }
.linea.edit .qty { width: 70px; border: 1px solid var(--line); background: var(--surface); border-radius: 8px; padding: 5px 7px; font-weight: 700; text-align: center; }
.linea.edit .ln small { color: var(--muted); font-weight: 500; }
.linea .unit { color: var(--muted); font-size: 11px; font-weight: 600; flex: 0 0 auto; }

.acciones { display: flex; gap: 7px; margin-top: 10px; flex-wrap: wrap; }
.pdf-b, .print-b, .edit-b, .cancel-b, .save-b { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 100px; background: var(--surface); border: 1px solid var(--line); color: var(--ink-soft); border-radius: 11px; padding: 9px 10px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12px; cursor: pointer; justify-content: center; }
.pdf-b ion-icon { font-size: 16px; color: var(--sky); }
.print-b ion-icon { font-size: 16px; color: var(--pine); }
.edit-b ion-icon { font-size: 16px; color: #B9781F; }
.pdf-b:disabled, .print-b:disabled, .save-b:disabled { opacity: .6; }
.save-b { background: var(--pine); color: #fff; border-color: var(--pine); }
.print-status { font-size: 11.5px; font-weight: 600; color: var(--pine); margin-top: 6px; }
.hint-nc { font-size: 11.5px; color: var(--muted); margin-top: 9px; line-height: 1.4; }
.tot-edit { font-size: 13.5px; font-weight: 600; margin-top: 10px; text-align: right; }
.tot-edit b { font-family: "Bricolage Grotesque"; font-size: 16px; }

/* Paginación */
.pager { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 22px; }
.pg { min-width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); display: grid; place-items: center; cursor: pointer; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; color: var(--ink-soft); padding: 0 6px; }
.pg svg { width: 17px; height: 17px; stroke: var(--ink-soft); fill: none; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.pg:disabled { opacity: .4; cursor: default; }
.pg.num.on { background: var(--pine); color: #fff; border-color: var(--pine); }
.cuenta { text-align: center; color: var(--muted); font-size: 12px; font-weight: 600; margin-top: 10px; }

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
