<template>
  <div class="editor" :data-paso="paso" :style="{ '--teclado': teclado + 'px' }">
    <p v-if="cargando" class="muted">Cargando…</p>
    <div v-else-if="errorCatalogos">
      <p class="err" role="alert">No se pudo cargar el catálogo de Ventas. Revisa tu conexión e inténtalo de nuevo.</p>
      <button type="button" class="pf-chip" @click="cargarCatalogos">Reintentar</button>
    </div>
    <template v-else>
      <header v-show="!exito" class="paso-venta">
        <p>Paso {{ paso }} de {{ pasos.length }}</p>
        <h2 ref="tituloPaso" tabindex="-1">{{ pasos[paso - 1] }}</h2>
      </header>
      <div v-show="!exito" class="form" :inert="enviando ? true : undefined">
        <div class="col prods-col">
          <div class="eyebrow-bar">
            <span class="eyebrow">Catálogo de Almacén</span>
            <span v-if="lineasActivas.length" class="badge-activos">
              🛒 {{ lineasActivas.length }} en ticket · {{ money(total) }}
            </span>
          </div>

          <div class="search">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
            <input v-model="buscar" type="search" aria-label="Buscar producto" placeholder="Buscar por nombre de producto…">
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
                <button type="button" :aria-label="'Quitar una unidad de ' + p.nombre" @click="dec(p)" :disabled="(cant[p.id]||0)<=0">−</button>
                <span class="q">{{ cant[p.id] || 0 }}</span>
                <button type="button" :aria-label="'Agregar una unidad de ' + p.nombre" @click="inc(p)" :disabled="(cant[p.id]||0) >= maxUnidad(p)">+</button>
              </div>
            </div>
            <div v-if="p.vendePorCaja" class="uni">
              <button :class="{ on: !esCaja(p.id) }" :aria-pressed="!esCaja(p.id)" @click="setUnidad(p, 'pza')">Pieza</button>
              <button :class="{ on: esCaja(p.id) }" :aria-pressed="esCaja(p.id)" @click="setUnidad(p, 'caja')">Caja ({{ p.piezasPorCaja }})</button>
            </div>
          </div>
          <p v-if="!filtrados.length" class="muted">No hay productos que coincidan con la búsqueda o filtro.</p>
        </div>

        <div class="col selects-col">
          <div class="field cliente-venta">
            <div class="fl">Cliente</div>
            <div class="modo-cli">
              <button :class="{ on: !ocasional }" :aria-pressed="!ocasional" @click="setOcasional(false)">Registrado</button>
              <button :class="{ on: ocasional }" :aria-pressed="ocasional" @click="setOcasional(true)">Clientes varios</button>
            </div>
            <template v-if="!ocasional">
              <button v-if="cliente" type="button" class="cli-sel" @click="cliente = null">
                <span class="av-ic" aria-hidden="true">{{ ini(cliente.nombre) }}</span>
                <span class="info">
                  <span class="nm">{{ cliente.nombre }}</span>
                  <span class="sub">Cambiar cliente</span>
                  <span v-if="cliente.saldoDeuda > 0" class="cli-deuda-pill">
                    Adeudo actual: <b>{{ money(cliente.saldoDeuda) }}</b>
                  </span>
                </span>
              </button>
              <template v-else>
                <input class="inp" type="search" v-model="buscarCli" aria-label="Buscar cliente" placeholder="Buscar cliente…" style="margin-top:9px">
                <div class="cli-lista">
                  <button v-for="c in clientesFiltrados" :key="c.id" type="button" class="cli-op" @click="cliente = c">
                    <span class="c-nm">{{ c.nombre }}</span>
                    <span v-if="c.saldoDeuda > 0" class="c-deuda-tag">Debe {{ money(c.saldoDeuda) }}</span>
                  </button>
                  <p v-if="!clientesFiltrados.length" class="muted2">Sin clientes registrados coincidentes.</p>
                </div>
              </template>
            </template>
            <template v-else>
              <input class="inp" v-model="nombreOcasional" aria-label="Nombre del comprador (opcional)" placeholder="Nombre del comprador (opcional)" maxlength="80" style="margin-top:9px">
              <p class="hint2">Venta de mostrador a clientes varios. No genera historial de cliente ni admite venta a crédito.</p>
            </template>
          </div>

          <div class="field pago-venta">
            <div class="fl">Método de pago</div>
            <div class="pagos">
              <button v-for="m in metodosDisponibles" :key="m.k" :class="{ on: metodo === m.k && (!movil || metodoElegido) }" :aria-pressed="metodo === m.k && (!movil || metodoElegido)" @click="elegirMetodo(m.k)">{{ m.t }}</button>
            </div>

            <div class="datos-pago" :class="{ 'sin-metodo': !metodoElegido }">
              <!-- Alerta si selecciona crédito a cliente con adeudo previo -->
              <div v-if="metodo === 3 && cliente?.saldoDeuda > 0" class="alerta-riesgo">
                <div class="alerta-t">⚠️ Cliente con saldo pendiente previo</div>
                <div class="alerta-b">Este cliente ya debe <b>{{ money(cliente.saldoDeuda) }}</b>. Esta venta sumará <b>{{ money(total) }}</b> a su saldo deudor en Kardex.</div>
              </div>

              <div v-if="metodo === 0 && !pagoPendiente" class="sub-field">
                <div class="fl2">
                  <span>¿Con cuánto paga?</span>
                  <span class="tot-hint" v-if="total > 0">A cobrar: <b>{{ money(total) }}</b></span>
                </div>
                <input class="inp" type="number" min="0" step="0.01" inputmode="decimal" v-model.number="pagaCon" aria-label="¿Con cuánto paga el cliente?" placeholder="¿Con cuánto paga el cliente?" @input="onPagaConInput">

                <!-- Atajos de billetes para agilizar en mostrador -->
                <div class="billetes-grid" v-if="total > 0">
                  <button type="button" class="btn-bill" :class="{ on: pagaCon === total && !pagaConEditado }" @click="fijarExacto()">
                    Exacto ({{ money(total) }})
                  </button>
                  <button v-for="b in billetesSugeridos" :key="b" type="button" class="btn-bill" :class="{ on: pagaCon === b }" @click="fijarPagaCon(b)">
                    ${{ b }}
                  </button>
                </div>

                <div v-if="pagaCon > 0" class="feria" :class="{ falta: pagaCon < total }">
                  <template v-if="pagaCon === total">
                    <span class="tag-exacto">✓ Importe exacto (sin cambio)</span>
                  </template>
                  <template v-else-if="pagaCon > total">
                    Feria / Cambio a entregar: <b>{{ money(pagaCon - total) }}</b>
                  </template>
                  <template v-else>
                    Faltan {{ money(total - pagaCon) }} para cubrir el total.
                  </template>
                </div>
              </div>
              <div v-if="(metodo === 1 || metodo === 2) && !pagoPendiente" class="sub-field">
                <div class="fl2">Folio / referencia (opcional)</div>
                <input class="inp" v-model="referencia" aria-label="Folio o referencia (opcional)" placeholder="Ej. Folio de transferencia o voucher">
              </div>
              <div v-if="metodo === 3" class="sub-field credito">
                <div class="fl2">Días para pagar</div>
                <div class="dias">
                  <button v-for="d in [7,15,30]" :key="d" :class="{ on: diasCredito === d }" :aria-pressed="diasCredito === d" @click="diasCredito = d">{{ d }} días</button>
                </div>
                <div class="hint2">Vence el {{ fechaLimiteTxt }}. Se registrará en Cuentas por Cobrar y afectará el saldo deudor del cliente.</div>
              </div>
              <button v-if="metodo !== 3" type="button" role="checkbox" :aria-checked="pagoPendiente" class="pend-toggle" :class="{ on: pagoPendiente }" @click="pagoPendiente = !pagoPendiente">
                <span class="pt-check" aria-hidden="true"><svg v-if="pagoPendiente" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></span>
                <span class="pt-tx">
                  <span class="pt-t">Pago pendiente</span>
                  <span class="pt-s">{{ ocasional ? 'Se entrega la mercancía ahora; el cobro se registra después.' : 'Registra cada abono en Deudas de clientes con el método que recibas.' }}</span>
                </span>
              </button>
            </div>
          </div>

          <div class="totcard">
            <div class="k">Total de la venta<b>{{ lineasActivas.length }} producto(s) en ticket</b></div>
            <div class="v">{{ money(total) }}</div>
            <button class="cta" :disabled="enviando || !puede" @click="vender()">{{ enviando ? 'Registrando…' : 'Cobrar y registrar venta' }}</button>
            <p v-if="error" role="alert" class="err">{{ error }}</p>
          </div>
          <div class="field confirmar-venta">
            <dl class="resumen-pago">
              <div><dt>Cliente</dt><dd>{{ nombreMostrar }}</dd></div>
              <div><dt>Método de pago</dt><dd>{{ nombreMetodo }}</dd></div>
              <div v-if="metodo === 3"><dt>Fecha límite</dt><dd>{{ fechaLimiteTxt }}</dd></div>
              <div v-else-if="pagoPendiente"><dt>Estado</dt><dd>Pago pendiente</dd></div>
              <template v-else-if="metodo === 0">
                <div><dt>Efectivo recibido</dt><dd>{{ money(pagaCon) }}</dd></div>
                <div><dt>Cambio a entregar</dt><dd>{{ money(pagaCon - total) }}</dd></div>
              </template>
              <div v-else-if="referencia.trim()"><dt>Referencia</dt><dd>{{ referencia.trim() }}</dd></div>
            </dl>
            <ul class="resumen-productos" aria-label="Productos del ticket">
              <li v-for="id in lineasActivas" :key="id">
                <span>{{ cant[id] }} × {{ pmap[id]?.nombre }}{{ esCaja(id) ? ' (caja)' : '' }}</span>
                <b>{{ money(cant[id] * precioL(pmap[id])) }}</b>
              </li>
            </ul>
            <p v-if="error" role="alert" class="err">{{ error }}</p>
          </div>
        </div>
      </div>

      <footer v-show="!exito" class="acciones-venta">
        <div v-if="paso > 1" class="resumen-total" aria-live="polite"><span>Total</span><b>{{ money(total) }}</b></div>
        <div class="botones-venta">
          <button v-if="paso > 1" type="button" class="volver-paso" :disabled="enviando" @click="irAPaso(paso - 1)">Atrás</button>
          <button type="button" class="cta" :disabled="!puedeAvanzar || enviando" @click="continuar">{{ enviando ? 'Registrando…' : accionPaso }}</button>
        </div>
      </footer>

      <!-- Guía educativa interactiva -->
      <div v-show="!exito" class="guia-card guia-venta">
        <div class="guia-header" @click="mostrarGuia = !mostrarGuia">
          <div class="guia-icon">💡</div>
          <div class="guia-tit">¿Cómo funciona el módulo de Ventas en Mostrador?</div>
          <div class="guia-badge">{{ mostrarGuia ? 'Ocultar guía' : 'Ver guía' }}</div>
        </div>
        <div v-if="mostrarGuia" class="guia-content">
          <div class="guia-item">
            <div class="gi-num">1</div>
            <div class="gi-text">
              <b>Clientes Registrados vs Clientes Varios:</b>
              Los clientes registrados permiten acumular historial, controlar geolocalización y autorizar venta a crédito. Las ventas a clientes varios son para despachos rápidos de paso y no admiten crédito.
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
        <div class="comprobante-grid">
          <button class="btn-act btn-ticket" :disabled="imprimiendoTicket" @click="imprimirTicket()">
            <svg class="btn-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
            </svg>
            <span>{{ imprimiendoTicket ? 'Imprimiendo…' : 'Ticket térmico' }}</span>
          </button>
          <button class="btn-act btn-pdf" :disabled="descargandoPdf" @click="descargarPdf()">
            <svg class="btn-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
            <span>{{ descargandoPdf ? 'Generando…' : 'Descargar PDF' }}</span>
          </button>
        </div>
        <p v-if="ticketMsg" class="ticket-status" :class="{ ok: ticketMsg.includes('correctamente') }">{{ ticketMsg }}</p>
      </div>
    </ExitoOverlay>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import http from '@/api/http'
import { listarPaginas } from '@/api/listarPaginas'
import ExitoOverlay from '@/components/ExitoOverlay.vue'
import { imprimirTicketVenta } from '@/services/printer'

const emit = defineEmits(['ctx'])
const anchoMovil = window.matchMedia('(max-width: 900px)')
const movil = ref(anchoMovil.matches)
const teclado = ref(0)
const pasos = ['Selecciona el cliente', 'Agrega productos', 'Elige el método de pago', 'Confirma la venta']
const paso = ref(1)
const tituloPaso = ref(null)
const productos = ref([]), clientes = ref([])
const cargando = ref(true), enviando = ref(false), error = ref('')
const errorCatalogos = ref(false)
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
    if (metodo.value === 3) {
      metodo.value = 0
      metodoElegido.value = false
    }
  } else {
    nombreOcasional.value = ''
  }
}
const nombreMostrar = computed(() => ocasional.value ? (nombreOcasional.value.trim() || 'Clientes varios') : (cliente.value?.nombre || ''))
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
function setUnidad(p, u) {
  if (esCaja(p.id) === (u === 'caja')) return
  unidad[p.id] = u
  cant[p.id] = 0
}
function inc(p) { cant[p.id] = Math.min((cant[p.id] || 0) + 1, maxUnidad(p)) }
function dec(p) { if (cant[p.id] > 0) cant[p.id]-- }

const total = computed(() => {
  const importe = lineasActivas.value.reduce((s, id) => s + (cant[id] || 0) * precioL(pmap.value[id]), 0)
  return Math.round(importe * 100) / 100
})

const metodosBase = [
  { k: 0, t: 'Efectivo' }, { k: 1, t: 'Transferencia' }, { k: 2, t: 'Tarjeta' }, { k: 3, t: 'Crédito' }
]
const metodosDisponibles = computed(() => ocasional.value ? metodosBase.filter(m => m.k !== 3) : metodosBase)
const metodo = ref(0)
const metodoElegido = ref(false)
const nombreMetodo = computed(() => metodosBase.find(m => m.k === metodo.value)?.t || '')
const referencia = ref('')
const pagaCon = ref(null)
const pagaConEditado = ref(false)
let anteriorTotal = 0

// Precargar automáticamente pagaCon con el total exacto a menos que se haya modificado manualmente
watch(total, (nuevoTotal) => {
  if (!pagaConEditado.value || pagaCon.value === anteriorTotal || !pagaCon.value) {
    pagaCon.value = nuevoTotal > 0 ? nuevoTotal : null
    pagaConEditado.value = false
  }
  anteriorTotal = nuevoTotal
})

watch(metodo, (m) => {
  if (m === 0 && (!pagaCon.value || !pagaConEditado.value)) {
    pagaCon.value = total.value > 0 ? total.value : null
  }
})

function onPagaConInput() {
  pagaConEditado.value = true
}

function fijarPagaCon(monto) {
  pagaCon.value = monto
  pagaConEditado.value = true
}

function fijarExacto() {
  pagaCon.value = total.value > 0 ? total.value : null
  pagaConEditado.value = false
}

const billetesSugeridos = computed(() => {
  const t = total.value
  if (!t || t <= 0) return []
  const denominaciones = [50, 100, 200, 500, 1000]
  const mayores = denominaciones.filter(d => d > t)
  if (mayores.length > 0) return mayores.slice(0, 3)
  const sig500 = Math.ceil((t + 1) / 500) * 500
  const sig1000 = Math.ceil((t + 1) / 1000) * 1000
  const res = [sig500]
  if (sig1000 !== sig500) res.push(sig1000)
  return res
})

function elegirMetodo(valor) {
  metodo.value = valor
  metodoElegido.value = true
}

const pagoPendiente = ref(false)
const diasCredito = ref(7)
const fechaLimite = computed(() => { const d = new Date(); d.setDate(d.getDate() + diasCredito.value); return d })
const fechaLimiteTxt = computed(() => fechaLimite.value.toLocaleDateString('es-MX', { day: '2-digit', month: 'long' }))

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const fmt = (n) => Number(n || 0).toLocaleString('es-MX')
const clienteElegido = computed(() => ocasional.value || !!cliente.value)
const puede = computed(() => total.value > 0 && clienteElegido.value)
const pagoValido = computed(() => metodoElegido.value &&
  (metodo.value !== 0 || pagoPendiente.value || Number(pagaCon.value) >= total.value))
const puedeAvanzar = computed(() => [
  clienteElegido.value,
  puede.value,
  puede.value && pagoValido.value,
  puede.value && pagoValido.value
][paso.value - 1])
const accionFinal = computed(() => {
  if (metodo.value === 3) return 'Registrar a crédito'
  return pagoPendiente.value ? 'Registrar pago pendiente' : 'Cobrar'
})
const accionPaso = computed(() => ['Continuar a productos', 'Continuar al pago', 'Revisar venta', accionFinal.value][paso.value - 1])

async function irAPaso(destino) {
  paso.value = destino
  await nextTick()
  tituloPaso.value?.scrollIntoView({ block: 'start' })
  tituloPaso.value?.focus({ preventScroll: true })
}

function continuar() {
  if (!puedeAvanzar.value || enviando.value) return
  if (paso.value < pasos.length) irAPaso(paso.value + 1)
  else vender()
}

function medirTeclado() {
  const viewport = window.visualViewport
  teclado.value = viewport?.scale === 1 ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0
}

function ajustarFlujo(evento) {
  movil.value = evento.matches
  if (movil.value && paso.value > 1 && !clienteElegido.value) paso.value = 1
  else if (movil.value && paso.value > 2 && !puede.value) paso.value = 2
}

const ultimaVenta = ref(null)
const imprimiendoTicket = ref(false)
const descargandoPdf = ref(false)
const ticketMsg = ref('')

async function vender() {
  if (!puede.value || enviando.value) return
  enviando.value = true; error.value = ''; ticketMsg.value = ''
  const lineas = lineasActivas.value.map((id) => ({ productoId: id, cantidad: cant[id], esCaja: esCaja(id) }))
  const body = { metodoPago: metodo.value, pagoPendiente: metodo.value === 3 ? false : pagoPendiente.value, lineas }
  if (ocasional.value) { body.clienteId = 0; body.nombreOcasional = nombreOcasional.value.trim() || 'Clientes varios' }
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
      { k: 'Método de pago', v: nombreMetodo.value },
      { k: 'Estado de pago', v: body.pagoPendiente ? 'Pago pendiente' : (metodo.value === 3 ? 'A crédito' : 'Pagado') }
    ]
    if (metodo.value === 0 && !body.pagoPendiente && pagaCon.value > 0) {
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

async function descargarPdf() {
  if (!ultimaVenta.value?.id) return
  descargandoPdf.value = true
  ticketMsg.value = ''
  try {
    const res = await http.get(`/pedidos/${ultimaVenta.value.id}/pdf`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Venta_${ultimaVenta.value.id}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    ticketMsg.value = 'PDF descargado correctamente.'
  } catch {
    ticketMsg.value = 'No se pudo generar el PDF de la venta.'
  } finally {
    descargandoPdf.value = false
  }
}

async function nuevaVenta() {
  exito.value = false
  ultimaVenta.value = null
  ticketMsg.value = ''
  descargandoPdf.value = false
  Object.keys(cant).forEach((k) => delete cant[k])
  Object.keys(unidad).forEach((k) => delete unidad[k])
  cliente.value = null; nombreOcasional.value = ''; ocasional.value = false
  buscar.value = ''; buscarCli.value = ''; filtroProd.value = 'todos'; error.value = ''
  metodoElegido.value = false
  metodo.value = 0; referencia.value = ''; pagaCon.value = null; pagaConEditado.value = false; anteriorTotal = 0; pagoPendiente.value = false; diasCredito.value = 7
  paso.value = 1
  await cargarCatalogos()
  if (movil.value) await irAPaso(1)
}

async function cargarCatalogos() {
  cargando.value = true
  errorCatalogos.value = false
  try {
    const [pr, cl] = await Promise.all([
      listarPaginas('/productos'),
      listarPaginas('/clientes')
    ])
    productos.value = pr
    clientes.value = cl
  } catch {
    errorCatalogos.value = true
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  emit('ctx', { titulo: 'Ventas', sub: 'Venta directa a clientes en el local', back: null })
  anchoMovil.addEventListener('change', ajustarFlujo)
  window.visualViewport?.addEventListener('resize', medirTeclado)
  window.visualViewport?.addEventListener('scroll', medirTeclado)
  cargarCatalogos()
})
onUnmounted(() => {
  anchoMovil.removeEventListener('change', ajustarFlujo)
  window.visualViewport?.removeEventListener('resize', medirTeclado)
  window.visualViewport?.removeEventListener('scroll', medirTeclado)
})
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; }
.muted2 { color: var(--muted); font-size: 13px; padding: 6px 2px; }
.err { color: var(--clay); font-size: 13px; font-weight: 600; margin-top: 10px; }
.form { display: grid; grid-template-columns: minmax(0, 1.25fr) 380px; gap: 20px; align-items: start; }
.col { display: flex; flex-direction: column; gap: 11px; }
.selects-col { position: sticky; top: 16px; display: flex; flex-direction: column; gap: 14px; }
.eyebrow-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.badge-activos { font-size: 11.5px; font-weight: 700; color: var(--pine); background: var(--pine-tint); padding: 4px 10px; border-radius: 999px; }
.eyebrow { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 11.5px; letter-spacing: .13em; text-transform: uppercase; color: var(--muted); margin: 4px 2px; }
.field { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px; box-shadow: var(--shadow); }
.fl { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 9px; }
.fl2 { font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
.tot-hint { font-size: 11.5px; color: var(--muted); font-weight: 600; text-transform: none; letter-spacing: 0; }
.tot-hint b { color: var(--pine); }
.inp { width: 100%; border: 1px solid var(--line); background: var(--paper); border-radius: 11px; padding: 12px 13px; font-family: "Hanken Grotesk"; font-size: 15px; font-weight: 600; color: var(--ink); }
.modo-cli { display: flex; gap: 6px; background: var(--paper); border: 1px solid var(--line); border-radius: 12px; padding: 3px; }
.modo-cli button { flex: 1; border: none; background: transparent; color: var(--muted); border-radius: 9px; padding: 8px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12.5px; cursor: pointer; }
.modo-cli button.on { background: var(--surface); color: var(--ink); box-shadow: 0 1px 3px rgba(0,0,0,.1); }
.cli-lista { margin-top: 8px; max-height: 180px; overflow: auto; }
.cli-op { background: var(--paper); border: 1px solid var(--line); border-radius: 11px; padding: 10px 12px; margin-bottom: 6px; cursor: pointer; font: inherit; font-weight: 600; font-size: 13.5px; }
.cli-sel { display: flex; align-items: center; gap: 11px; background: var(--pine-tint); border: 1px solid #BFD8CD; border-radius: 13px; padding: 11px; margin-top: 9px; cursor: pointer; }
.cli-sel, .cli-op, .pend-toggle { width: 100%; text-align: left; color: var(--ink); }
.cli-sel .info { min-width: 0; }
.cli-sel .nm, .cli-sel .sub, .pt-t, .pt-s { display: block; }
.cli-sel .nm, .c-nm, .meta .nm { overflow-wrap: anywhere; }
.av-ic { width: 34px; height: 34px; border-radius: 10px; background: var(--amber-soft); display: grid; place-items: center; color: #B9781F; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13px; flex: 0 0 auto; }
.cli-sel .nm { font-weight: 700; font-size: 14px; } .cli-sel .sub { font-size: 11.5px; color: var(--muted); }
.hint2 { font-size: 11.5px; color: var(--muted); margin-top: 8px; line-height: 1.4; }
.pagos { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
.pagos button { border: 1px solid var(--line); background: var(--paper); color: var(--ink-soft); border-radius: 11px; padding: 10px 4px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 11.5px; cursor: pointer; }
.pagos button.on { background: var(--pine); color: #fff; border-color: var(--pine); }
.sub-field { margin-top: 11px; }
.billetes-grid { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
.btn-bill { border: 1px solid var(--line); background: var(--surface); color: var(--ink-soft); border-radius: 9px; padding: 6px 10px; font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 12px; cursor: pointer; transition: all .15s ease; }
.btn-bill:hover { border-color: var(--pine); color: var(--pine); background: var(--pine-tint); }
.btn-bill.on { background: var(--pine); color: #fff; border-color: var(--pine); }
.tag-exacto { color: var(--pine); font-weight: 700; font-size: 12.5px; }
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
.exito-extra-acts {
  width: 100%;
  max-width: 340px;
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.comprobante-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  width: 100%;
}
.btn-act {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1.5px solid rgba(255, 255, 255, 0.22);
  color: #ffffff;
  border-radius: 12px;
  padding: 10px 8px;
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: all .18s ease;
  user-select: none;
}
.btn-act:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.22);
  border-color: rgba(255, 255, 255, 0.38);
  transform: translateY(-1px);
}
.btn-act:active:not(:disabled) {
  transform: translateY(0);
}
.btn-act:disabled {
  opacity: .5;
  cursor: not-allowed;
}
.btn-ic {
  width: 18px !important;
  height: 18px !important;
  min-width: 18px !important;
  max-width: 18px !important;
  flex: 0 0 18px !important;
  stroke: currentColor;
}
.ticket-status {
  font-size: 12px;
  font-weight: 600;
  color: #FDE68A;
  text-align: center;
  margin-top: 2px;
}
.ticket-status.ok {
  color: #A7F3D0;
}

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

/* Responsive celular / tablet */
.paso-venta, .confirmar-venta, .acciones-venta { display: none; }

@media (max-width: 900px) {
  .form { grid-template-columns: minmax(0, 1fr); padding-bottom: calc(106px + var(--teclado) + env(safe-area-inset-bottom)); }
  .selects-col { position: static; }
  .paso-venta { display: block; margin: 0 0 14px; }
  .paso-venta p { margin: 0 0 4px; color: var(--ink-soft); font-size: 12px; font-weight: 700; }
  .paso-venta h2 { margin: 0; font-size: 22px; scroll-margin-block-start: 12px; }
  .paso-venta h2:focus { outline: none; }
  .totcard, .guia-venta, .datos-pago.sin-metodo,
  .prods-col, .cliente-venta, .pago-venta, .confirmar-venta { display: none; }
  .cliente-venta > .fl, .pago-venta > .fl, .prods-col .badge-activos { display: none; }
  [data-paso="1"] .cliente-venta, [data-paso="3"] .pago-venta, [data-paso="4"] .confirmar-venta { display: block; }
  [data-paso="2"] .prods-col { display: flex; }
  [data-paso="2"] .selects-col { display: none; }
  .cli-lista { max-height: min(36dvh, 350px); }
  .modo-cli button, .cli-op, .pf-chip, .stepper button, .uni button,
  .pagos button, .dias button, .btn-bill, .volver-paso, .btn-act { min-height: 44px; }
  .stepper button { width: 44px; }
  .prod .emoji { display: none; }
  .search input, .inp { font-size: 16px; }
  .search input { min-height: 22px; min-width: 0; }
  .search:focus-within { outline: 2px solid var(--pine); outline-offset: 2px; }
  .pagos { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pagos button { font-size: 14px; }
  .resumen-pago, .resumen-productos { margin: 0; padding: 0; }
  .resumen-pago div, .resumen-productos li { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 10px 0; }
  .resumen-pago div + div, .resumen-productos li { border-top: 1px solid var(--line); }
  .resumen-pago dt { color: var(--ink-soft); }
  .resumen-pago dd { margin: 0; text-align: right; font-weight: 700; }
  .resumen-pago dd, .resumen-productos span { min-width: 0; overflow-wrap: anywhere; }
  .resumen-productos b { white-space: nowrap; }

  .acciones-venta {
    display: grid;
    gap: 8px;
    position: fixed;
    inset-inline: max(12px, env(safe-area-inset-left)) max(12px, env(safe-area-inset-right));
    bottom: calc(8px + var(--teclado) + env(safe-area-inset-bottom));
    max-width: 680px;
    margin-inline: auto;
    padding: 10px 12px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 18px;
    box-shadow: 0 4px 24px rgba(21,42,36,.24);
    z-index: 30;
  }
  .resumen-total { display: flex; align-items: baseline; justify-content: space-between; font-size: 13px; color: var(--ink-soft); }
  .resumen-total b { font-size: 20px; color: var(--ink); }
  .botones-venta { display: flex; gap: 8px; min-width: 0; }
  .botones-venta .cta { min-height: 44px; padding: 10px; box-shadow: none; }
  .volver-paso { padding: 0 12px; font: inherit; font-weight: 700; border: 1px solid var(--line); border-radius: 12px; background: var(--paper); color: var(--ink); }
}

@media (max-width: 900px) and (max-height: 480px) and (min-width: 480px) {
  .acciones-venta { display: flex; align-items: center; }
  .resumen-total { gap: 12px; }
  .botones-venta { flex: 1; }
}
</style>
