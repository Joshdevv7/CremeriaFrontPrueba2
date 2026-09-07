<template>
  <div class="editor">
    <p v-if="cargando" class="muted">Cargando…</p>
    <template v-else>
      <div class="form" v-show="!exito">
        <div class="col selects">
          <div class="field">
            <div class="fl">Cliente</div>
            <div class="modo-cli">
              <button :class="{ on: !ocasional }" @click="setOcasional(false)">Registrado</button>
              <button :class="{ on: ocasional }" @click="setOcasional(true)">Ocasional</button>
            </div>
            <template v-if="!ocasional">
              <div v-if="cliente" class="cli-sel" @click="cliente = null">
                <div class="av-ic">{{ ini(cliente.nombre) }}</div>
                <div class="info">
                  <div class="nm">{{ cliente.nombre }}</div>
                  <div class="sub">Clic para cambiar de cliente</div>
                  <div v-if="cliente.saldoDeuda > 0" class="cli-deuda-pill">
                    ⚠️ Adeudo actual: <b>{{ money(cliente.saldoDeuda) }}</b>
                  </div>
                </div>
              </div>
              <template v-else>
                <input class="inp" v-model="buscarCli" placeholder="Buscar cliente…" style="margin-top:9px">
                <div class="cli-lista">
                  <div v-for="c in clientesFiltrados" :key="c.id" class="cli-op" @click="cliente = c">
                    <span class="c-nm">{{ c.nombre }}</span>
                    <span v-if="c.saldoDeuda > 0" class="c-deuda-tag">Debe {{ money(c.saldoDeuda) }}</span>
                  </div>
                  <p v-if="!clientesFiltrados.length" class="muted2">Sin clientes registrados coincidentes.</p>
                </div>
              </template>
            </template>
            <template v-else>
              <input class="inp" v-model="nombreOcasional" placeholder="Nombre del comprador" maxlength="80" style="margin-top:9px">
              <p class="hint2">Venta de mostrador rápida. No genera historial de cliente ni admite venta a crédito.</p>
            </template>
          </div>

          <div class="field">
            <div class="fl">Método de pago</div>
            <div class="pagos">
              <button v-for="m in metodosDisponibles" :key="m.k" :class="{ on: metodo === m.k }" @click="metodo = m.k">{{ m.t }}</button>
            </div>

            <!-- Alerta si selecciona crédito a cliente con adeudo previo -->
            <div v-if="metodo === 3 && cliente?.saldoDeuda > 0" class="alerta-riesgo">
              <div class="alerta-t">⚠️ Cliente con saldo pendiente previo</div>
              <div class="alerta-b">Este cliente ya debe <b>{{ money(cliente.saldoDeuda) }}</b>. Esta venta sumará <b>{{ money(total) }}</b> a su saldo deudor en Kardex.</div>
            </div>

            <div v-if="metodo === 0" class="sub-field">
              <div class="fl2">¿Con cuánto paga? (opcional)</div>
              <input class="inp" type="number" min="0" step="0.01" v-model.number="pagaCon" placeholder="Ej. 200">
              <div v-if="pagaCon > 0" class="feria" :class="{ falta: pagaCon < total }">
                <template v-if="pagaCon >= total">Feria / Cambio a entregar: <b>{{ money(pagaCon - total) }}</b></template>
                <template v-else>Faltan {{ money(total - pagaCon) }} para cubrir el total.</template>
              </div>
            </div>
            <div v-if="metodo === 1 || metodo === 2" class="sub-field">
              <div class="fl2">Folio / referencia (opcional)</div>
              <input class="inp" v-model="referencia" placeholder="Ej. Folio de transferencia o voucher" :disabled="pagoPendiente">
            </div>
            <div v-if="metodo === 3" class="sub-field credito">
              <div class="fl2">Días para pagar</div>
              <div class="dias">
                <button v-for="d in [7,15,30]" :key="d" :class="{ on: diasCredito === d }" @click="diasCredito = d">{{ d }} días</button>
              </div>
              <div class="hint2">Vence el {{ fechaLimiteTxt }}. Se registrará en Cuentas por Cobrar y afectará el saldo deudor del cliente.</div>
            </div>
            <div v-if="metodo !== 3" class="pend-toggle" :class="{ on: pagoPendiente }" @click="pagoPendiente = !pagoPendiente">
              <div class="pt-check"><svg v-if="pagoPendiente" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></div>
              <div class="pt-tx">
                <div class="pt-t">Pago pendiente</div>
                <div class="pt-s">Se entrega la mercancía ahora; el cobro en efectivo/transferencia se registra después.</div>
              </div>
            </div>
          </div>

          <div class="totcard">
            <div class="k">Total de la venta<b>{{ lineasActivas.length }} producto(s) en ticket</b></div>
            <div class="v">{{ money(total) }}</div>
            <button class="cta" :disabled="enviando || !puede" @click="vender()">{{ enviando ? 'Registrando…' : 'Cobrar y registrar venta' }}</button>
            <p v-if="error" class="err">{{ error }}</p>
          </div>
        </div>

        <div class="col">
          <div class="eyebrow"><span>Catálogo de Almacén</span></div>
          <div class="search">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
            <input v-model="buscar" placeholder="Buscar por nombre de producto…">
          </div>

          <div class="prod-filtros">
            <button class="pf-chip" :class="{ on: filtroProd === 'todos' }" @click="filtroProd = 'todos'">Todos ({{ productos.length }})</button>
            <button class="pf-chip" :class="{ on: filtroProd === 'stock' }" @click="filtroProd = 'stock'">Con existencia</button>
            <button class="pf-chip" :class="{ on: filtroProd === 'cajas' }" @click="filtroProd = 'cajas'">Venta por caja</button>
          </div>

          <div v-for="p in filtrados" :key="p.id" class="prod" :class="{ act: (cant[p.id]||0)>0 }">
            <div class="top">
              <div class="emoji"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5v-9z"/><path d="M3 7.5l9 4.5 9-4.5"/><path d="M12 12v9"/></svg></div>
              <div class="meta">
                <div class="nm">{{ p.nombre }}</div>
                <div class="pr">
                  <template v-if="esCaja(p.id)">
                    {{ money(p.precioCaja) }} / caja · disponible <b>{{ Math.floor((p.stockAlmacen||0) / (p.piezasPorCaja||1)) }}</b> caja(s)
                  </template>
                  <template v-else>
                    {{ money(p.precioVenta) }} · disponible <b>{{ fmt(p.stockAlmacen) }}</b> pzas
                  </template>
                </div>
              </div>
              <div class="stepper">
                <button @click="dec(p)" :disabled="(cant[p.id]||0)<=0">−</button>
                <span class="q">{{ cant[p.id] || 0 }}</span>
                <button @click="inc(p)" :disabled="(cant[p.id]||0) >= maxUnidad(p)">+</button>
              </div>
            </div>
            <div v-if="p.vendePorCaja" class="uni">
              <button :class="{ on: !esCaja(p.id) }" @click="setUnidad(p, 'pza')">Pieza</button>
              <button :class="{ on: esCaja(p.id) }" @click="setUnidad(p, 'caja')">Caja ({{ p.piezasPorCaja }})</button>
            </div>
          </div>
          <p v-if="!filtrados.length" class="muted">No hay productos que coincidan con la búsqueda o filtro.</p>
        </div>
      </div>

      <!-- Guía educativa interactiva -->
      <div class="guia-card">
        <div class="guia-header" @click="mostrarGuia = !mostrarGuia">
          <div class="guia-icon">💡</div>
          <div class="guia-tit">¿Cómo funciona el módulo de Ventas en Mostrador?</div>
          <div class="guia-badge">{{ mostrarGuia ? 'Ocultar guía' : 'Ver guía' }}</div>
        </div>
        <div v-if="mostrarGuia" class="guia-content">
          <div class="guia-item">
            <div class="gi-num">1</div>
            <div class="gi-text">
              <b>Clientes Registrados vs Ocasionales:</b>
              Los clientes registrados permiten acumular historial, controlar geolocalización y autorizar venta a crédito. Los clientes ocasionales son para despachos rápidos de paso y no admiten crédito.
            </div>
          </div>
          <div class="guia-item">
            <div class="gi-num">2</div>
            <div class="gi-text">
              <b>Venta por Caja vs Pieza:</b>
              Si el producto tiene venta por caja habilitada, puedes alternar entre ambas unidades con un clic. El stock se valida y descuenta con precisión en piezas del almacén central.
            </div>
          </div>
          <div class="guia-item">
            <div class="gi-num">3</div>
            <div class="gi-text">
              <b>Crédito vs Pago Pendiente:</b>
              La venta a crédito genera una Cuenta por Cobrar formal con días límite e incrementa el saldo deudor en Kardex. El Pago Pendiente es una entrega inmediata con liquidación diferida en el corte de caja.
            </div>
          </div>
          <div class="guia-item">
            <div class="gi-num">4</div>
            <div class="gi-text">
              <b>Ticket Térmico Bluetooth:</b>
              Al completar la venta podrás imprimir directamente el ticket en tu impresora térmica portátil Bluetooth (MUNBYN 58mm) sin necesidad de cables ni configuraciones complejas.
            </div>
          </div>
        </div>
      </div>
    </template>

    <ExitoOverlay :show="exito" titulo="Venta registrada con éxito" :subtitulo="nombreMostrar" :detalle="exitoDet" cta-texto="Nueva venta" @done="nuevaVenta">
      <div class="exito-extra-acts">
        <button class="btn-ticket" :disabled="imprimiendoTicket" @click="imprimirTicket()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          {{ imprimiendoTicket ? 'Imprimiendo ticket…' : 'Imprimir ticket térmico' }}
        </button>
        <p v-if="ticketMsg" class="ticket-status" :class="{ ok: ticketMsg.includes('correctamente') }">{{ ticketMsg }}</p>
      </div>
    </ExitoOverlay>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import http from '@/api/http'
import ExitoOverlay from '@/components/ExitoOverlay.vue'
import { imprimirTicketVenta } from '@/services/printer'

const emit = defineEmits(['ctx'])
const productos = ref([]), clientes = ref([])
const cargando = ref(true), enviando = ref(false), error = ref('')
const exito = ref(false), exitoDet = ref([])
const mostrarGuia = ref(false)

const ocasional = ref(false)
const cliente = ref(null)
const buscarCli = ref('')
const nombreOcasional = ref('')
function setOcasional(v) {
  ocasional.value = v
  if (v) {
    cliente.value = null
    if (metodo.value === 3) metodo.value = 0
  } else {
    nombreOcasional.value = ''
  }
}
const nombreMostrar = computed(() => ocasional.value ? (nombreOcasional.value.trim() || 'Cliente ocasional') : (cliente.value?.nombre || ''))
const ini = (n) => (n || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
const clientesFiltrados = computed(() => {
  const t = buscarCli.value.trim().toLowerCase()
  return t ? clientes.value.filter((c) => c.nombre.toLowerCase().includes(t)) : clientes.value
})

const buscar = ref('')
const filtroProd = ref('todos') // 'todos' | 'stock' | 'cajas'
const cant = reactive({})
const unidad = reactive({}) // productoId -> 'pza' | 'caja'
const pmap = computed(() => Object.fromEntries(productos.value.map((p) => [p.id, p])))

const filtrados = computed(() => {
  let list = productos.value
  const t = buscar.value.trim().toLowerCase()
  if (t) list = list.filter((p) => p.nombre.toLowerCase().includes(t))
  if (filtroProd.value === 'stock') {
    list = list.filter((p) => (p.stockAlmacen || 0) > 0)
  } else if (filtroProd.value === 'cajas') {
    list = list.filter((p) => p.vendePorCaja)
  }
  return list
})

const lineasActivas = computed(() => Object.entries(cant).filter(([, q]) => q > 0).map(([id]) => Number(id)))

function esCaja(id) { return unidad[id] === 'caja' }
function factor(p) { return p?.vendePorCaja && p.piezasPorCaja > 0 ? p.piezasPorCaja : 1 }
function precioL(p) { return esCaja(p.id) ? (p.precioCaja || 0) : p.precioVenta }
function maxUnidad(p) { return esCaja(p.id) ? Math.floor((p.stockAlmacen || 0) / factor(p)) : (p.stockAlmacen || 0) }
function setUnidad(p, u) { unidad[p.id] = u; cant[p.id] = 0 }
function inc(p) { cant[p.id] = Math.min((cant[p.id] || 0) + 1, maxUnidad(p)) }
function dec(p) { if (cant[p.id] > 0) cant[p.id]-- }

const total = computed(() => lineasActivas.value.reduce((s, id) => s + (cant[id] || 0) * precioL(pmap.value[id]), 0))

const metodosBase = [
  { k: 0, t: 'Efectivo' }, { k: 1, t: 'Transferencia' }, { k: 2, t: 'Tarjeta' }, { k: 3, t: 'Crédito' }
]
const metodosDisponibles = computed(() => ocasional.value ? metodosBase.filter(m => m.k !== 3) : metodosBase)
const metodo = ref(0)
const referencia = ref('')
const pagaCon = ref(null)
const pagoPendiente = ref(false)
const diasCredito = ref(7)
const fechaLimite = computed(() => { const d = new Date(); d.setDate(d.getDate() + diasCredito.value); return d })
const fechaLimiteTxt = computed(() => fechaLimite.value.toLocaleDateString('es-MX', { day: '2-digit', month: 'long' }))

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const fmt = (n) => Number(n || 0).toLocaleString('es-MX')
const puede = computed(() => total.value > 0 && (ocasional.value ? nombreOcasional.value.trim().length > 1 : !!cliente.value))

const ultimaVenta = ref(null)
const imprimiendoTicket = ref(false)
const ticketMsg = ref('')

async function vender() {
  if (!puede.value) return
  enviando.value = true; error.value = ''; ticketMsg.value = ''
  const lineas = lineasActivas.value.map((id) => ({ productoId: id, cantidad: cant[id], esCaja: esCaja(id) }))
  const body = { metodoPago: metodo.value, pagoPendiente: metodo.value === 3 ? false : pagoPendiente.value, lineas }
  if (ocasional.value) { body.clienteId = 0; body.nombreOcasional = nombreOcasional.value.trim() }
  else body.clienteId = cliente.value.id
  if (!body.pagoPendiente && (metodo.value === 1 || metodo.value === 2) && referencia.value.trim()) body.referenciaPago = referencia.value.trim()
  if (metodo.value === 3) body.fechaLimiteCredito = fechaLimite.value.toISOString()

  try {
    const { data } = await http.post('/pedidos/autoventa', body)
    ultimaVenta.value = {
      ...data,
      lineasSnapshot: lineasActivas.value.map(id => ({
        nombre: (pmap.value[id]?.nombre || 'Producto') + (esCaja(id) ? ' (Caja)' : ''),
        cantidad: cant[id],
        precio: precioL(pmap.value[id])
      }))
    }
    exitoDet.value = [
      { k: 'Ticket / Folio', v: `#${data.id}` },
      { k: 'Productos', v: String(lineas.length) },
      { k: 'Total', v: money(data.total) },
      { k: 'Método de pago', v: metodosBase.find((m) => m.k === metodo.value)?.t || '' },
      { k: 'Estado de pago', v: body.pagoPendiente ? 'Pago pendiente' : (metodo.value === 3 ? 'A crédito' : 'Pagado') }
    ]
    if (metodo.value === 0 && pagaCon.value > 0) {
      exitoDet.value.push({ k: 'Pagó con', v: money(pagaCon.value) })
      if (pagaCon.value >= data.total) exitoDet.value.push({ k: 'Feria entregada', v: money(pagaCon.value - data.total) })
    }
    exito.value = true
  } catch (e) { error.value = e.response?.data?.mensaje || 'No se pudo registrar la venta.' }
  finally { enviando.value = false }
}

async function imprimirTicket() {
  if (!ultimaVenta.value) return
  imprimiendoTicket.value = true
  ticketMsg.value = ''
  try {
    const res = await imprimirTicketVenta({
      ticketId: ultimaVenta.value.id || 'VENTA',
      fecha: new Date(),
      cliente: nombreMostrar.value,
      total: ultimaVenta.value.total,
      metodo: metodosBase.find(m => m.k === metodo.value)?.t || 'Efectivo',
      pagoPendiente: ultimaVenta.value.pagoPendiente,
      credito: metodo.value === 3,
      vence: metodo.value === 3 ? fechaLimiteTxt.value : null,
      items: ultimaVenta.value.lineasSnapshot || []
    })
    if (res && res.error) {
      ticketMsg.value = 'Aviso: ' + res.error
    } else {
      ticketMsg.value = 'Ticket impreso correctamente.'
    }
  } catch (e) {
    ticketMsg.value = 'Error al imprimir: ' + (e.message || 'Verifique impresora Bluetooth.')
  } finally {
    imprimiendoTicket.value = false
  }
}

function nuevaVenta() {
  exito.value = false
  ultimaVenta.value = null
  ticketMsg.value = ''
  Object.keys(cant).forEach((k) => delete cant[k])
  Object.keys(unidad).forEach((k) => delete unidad[k])
  cliente.value = null; nombreOcasional.value = ''; ocasional.value = false
  metodo.value = 0; referencia.value = ''; pagaCon.value = null; pagoPendiente.value = false; diasCredito.value = 7
  cargarCatalogos()
}

async function cargarCatalogos() {
  try {
    const [pr, cl] = await Promise.all([
      http.get('/productos', { params: { tamano: 200 } }),
      http.get('/clientes', { params: { tamano: 200 } })
    ])
    productos.value = pr.data.items || []
    clientes.value = cl.data.items || []
  } catch { /* se conserva catálogo anterior */ }
}

onMounted(async () => {
  emit('ctx', { titulo: 'Ventas', sub: 'Venta directa a clientes en el local', back: null })
  try {
    await cargarCatalogos()
  } catch { error.value = 'No se pudieron cargar los datos.' }
  finally { cargando.value = false }
})
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; }
.muted2 { color: var(--muted); font-size: 13px; padding: 6px 2px; }
.err { color: var(--clay); font-size: 13px; font-weight: 600; margin-top: 10px; }
.form { display: grid; grid-template-columns: 1fr 1.2fr; gap: 16px; align-items: start; }
.col { display: flex; flex-direction: column; gap: 11px; }
.eyebrow { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 11.5px; letter-spacing: .13em; text-transform: uppercase; color: var(--muted); margin: 4px 2px; }
.field { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px; box-shadow: var(--shadow); }
.fl { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 9px; }
.fl2 { font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
.inp { width: 100%; border: 1px solid var(--line); background: var(--paper); border-radius: 11px; padding: 12px 13px; font-family: "Hanken Grotesk"; font-size: 15px; font-weight: 600; color: var(--ink); }
.modo-cli { display: flex; gap: 6px; background: var(--paper); border: 1px solid var(--line); border-radius: 12px; padding: 3px; }
.modo-cli button { flex: 1; border: none; background: transparent; color: var(--muted); border-radius: 9px; padding: 8px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12.5px; cursor: pointer; }
.modo-cli button.on { background: var(--surface); color: var(--ink); box-shadow: 0 1px 3px rgba(0,0,0,.1); }
.cli-lista { margin-top: 8px; max-height: 180px; overflow: auto; }
.cli-op { background: var(--paper); border: 1px solid var(--line); border-radius: 11px; padding: 10px 12px; margin-bottom: 6px; cursor: pointer; font-weight: 600; font-size: 13.5px; }
.cli-sel { display: flex; align-items: center; gap: 11px; background: var(--pine-tint); border: 1px solid #BFD8CD; border-radius: 13px; padding: 11px; margin-top: 9px; cursor: pointer; }
.av-ic { width: 34px; height: 34px; border-radius: 10px; background: var(--amber-soft); display: grid; place-items: center; color: #B9781F; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13px; flex: 0 0 auto; }
.cli-sel .nm { font-weight: 700; font-size: 14px; } .cli-sel .sub { font-size: 11.5px; color: var(--muted); }
.hint2 { font-size: 11.5px; color: var(--muted); margin-top: 8px; line-height: 1.4; }
.pagos { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
.pagos button { border: 1px solid var(--line); background: var(--paper); color: var(--ink-soft); border-radius: 11px; padding: 10px 4px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 11.5px; cursor: pointer; }
.pagos button.on { background: var(--pine); color: #fff; border-color: var(--pine); }
.sub-field { margin-top: 11px; }
.feria { margin-top: 9px; font-size: 13.5px; font-weight: 700; color: var(--pine); }
.feria b { font-variant-numeric: tabular-nums; }
.feria.falta { color: var(--clay); font-weight: 600; }
.sub-field.credito { background: var(--amber-soft); border: 1px solid #EAD9B8; border-radius: 12px; padding: 12px; }
.dias { display: flex; gap: 7px; }
.dias button { flex: 1; border: 1px solid #EAD9B8; background: var(--surface); color: var(--ink-soft); border-radius: 9px; padding: 8px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12.5px; cursor: pointer; }
.dias button.on { background: var(--amber); color: #fff; border-color: var(--amber); }
.pend-toggle { display: flex; align-items: center; gap: 11px; background: var(--paper); border: 1.5px solid var(--line); border-radius: 13px; padding: 12px; margin-top: 11px; cursor: pointer; }
.pend-toggle.on { border-color: var(--amber); background: var(--amber-soft); }
.pt-check { width: 22px; height: 22px; border-radius: 6px; border: 2px solid var(--line); display: grid; place-items: center; flex: 0 0 auto; }
.pend-toggle.on .pt-check { background: var(--amber); border-color: var(--amber); }
.pt-check svg { width: 13px; height: 13px; stroke: #fff; fill: none; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.pt-t { font-weight: 700; font-size: 13px; } .pt-s { font-size: 11.5px; color: var(--muted); margin-top: 1px; }
.totcard { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 16px; box-shadow: var(--shadow); position: sticky; top: 0; }
.totcard .k { font-size: 12.5px; color: var(--muted); font-weight: 600; }
.totcard .k b { display: block; color: var(--ink); font-size: 11px; font-weight: 600; margin-top: 1px; }
.totcard .v { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 30px; letter-spacing: -.02em; font-variant-numeric: tabular-nums; margin: 6px 0 12px; }
.cta { width: 100%; background: var(--pine); color: #fff; border: none; border-radius: 14px; padding: 15px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; cursor: pointer; box-shadow: 0 12px 22px -12px rgba(14,92,74,.8); }
.cta:disabled { opacity: .5; }
.search { display: flex; align-items: center; gap: 10px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 11px 14px; box-shadow: var(--shadow); }
.search svg { width: 18px; height: 18px; stroke: var(--muted); fill: none; stroke-width: 2; flex: 0 0 auto; }
.search input { border: none; background: transparent; outline: none; font-size: 14.5px; font-weight: 500; color: var(--ink); width: 100%; }
.prod { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 12px 14px; box-shadow: var(--shadow); transition: border-color .2s; }
.prod.act { border-color: var(--pine); }
.prod .top { display: flex; align-items: center; gap: 12px; }
.emoji { width: 42px; height: 42px; border-radius: 12px; background: var(--paper-2); display: grid; place-items: center; flex: 0 0 auto; color: var(--ink-soft); }
.emoji svg { width: 22px; height: 22px; }
.meta { flex: 1; min-width: 0; }
.meta .nm { font-weight: 700; font-size: 14.5px; }
.meta .pr { font-size: 12px; color: var(--muted); font-weight: 600; margin-top: 1px; }
.stepper { display: flex; align-items: center; background: var(--paper); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; flex: 0 0 auto; }
.stepper button { width: 32px; height: 34px; border: none; background: transparent; font-size: 19px; color: var(--pine); cursor: pointer; font-weight: 600; }
.stepper button:disabled { color: #C7CFC9; }
.stepper .q { min-width: 30px; text-align: center; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; }
.uni { display: flex; gap: 6px; margin-top: 10px; }
.uni button { flex: 1; border: 1px solid var(--line); background: var(--paper); color: var(--muted); border-radius: 9px; padding: 7px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12px; cursor: pointer; }
.uni button.on { background: var(--pine); color: #fff; border-color: var(--pine); }

/* Indicadores de adeudo de cliente */
.cli-deuda-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; color: var(--clay); font-weight: 700; background: var(--clay-soft); padding: 3px 8px; border-radius: 6px; margin-top: 5px; }
.cli-op { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.c-nm { flex: 1; min-width: 0; }
.c-deuda-tag { font-size: 11px; font-weight: 700; color: var(--clay); background: var(--clay-soft); padding: 2px 7px; border-radius: 6px; flex: 0 0 auto; }
.alerta-riesgo { background: #FDF2E9; border: 1.5px solid #F5C6A5; border-radius: 12px; padding: 11px 13px; margin-top: 11px; }
.alerta-t { font-family: "Bricolage Grotesque"; font-size: 12px; font-weight: 800; color: #C0573B; text-transform: uppercase; letter-spacing: .04em; }
.alerta-b { font-size: 12px; color: #8C3922; margin-top: 3px; line-height: 1.4; }

/* Filtros de productos */
.prod-filtros { display: flex; gap: 6px; margin: 4px 0 6px; flex-wrap: wrap; }
.pf-chip { border: 1px solid var(--line); background: var(--surface); color: var(--muted); border-radius: 999px; padding: 6px 12px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 11.5px; cursor: pointer; transition: .15s; }
.pf-chip.on { background: var(--pine); color: #fff; border-color: var(--pine); }

/* Acciones en modal de éxito */
.exito-extra-acts { display: flex; flex-direction: column; gap: 8px; width: 100%; margin-bottom: 12px; }
.btn-ticket { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--surface); border: 1.5px solid var(--line); color: var(--ink); border-radius: 14px; padding: 13px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; transition: background .15s; }
.btn-ticket:hover { background: var(--paper-2); }
.btn-ticket:disabled { opacity: .5; }
.ticket-status { font-size: 12px; font-weight: 600; color: var(--amber); text-align: center; }
.ticket-status.ok { color: var(--pine); }

/* Guía interactiva */
.guia-card { margin-top: 24px; background: var(--surface); border: 1px solid var(--line); border-radius: 18px; overflow: hidden; box-shadow: var(--shadow); }
.guia-header { display: flex; align-items: center; gap: 10px; padding: 14px 18px; cursor: pointer; user-select: none; background: var(--paper); }
.guia-icon { font-size: 19px; }
.guia-tit { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; color: var(--ink); flex: 1; }
.guia-badge { font-size: 11.5px; font-weight: 700; color: var(--pine); background: var(--pine-tint); padding: 4px 10px; border-radius: 999px; }
.guia-content { padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; border-top: 1px solid var(--line); }
.guia-item { display: flex; gap: 12px; align-items: flex-start; }
.gi-num { width: 22px; height: 22px; border-radius: 50%; background: var(--pine-tint); color: var(--pine); display: grid; place-items: center; font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 11.5px; flex: 0 0 auto; margin-top: 2px; }
.gi-text { font-size: 12.5px; color: var(--ink-soft); line-height: 1.45; }
.gi-text b { color: var(--ink); font-weight: 700; }

@media (max-width: 860px) { .form { grid-template-columns: 1fr; } .totcard { position: static; } }
</style>
