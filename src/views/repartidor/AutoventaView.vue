<template>
  <ion-page>
    <ion-content :fullscreen="true" class="av">
      <div class="bar">
        <div class="iconbtn" @click="$router.replace('/app/inventario')"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></div>
        <div class="ttl"><div class="s">En ruta</div><div class="n">Venta en ruta</div></div>
        <button class="iconbtn scan" @click="mostrarScan = true" title="Escanear"><svg viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M3 12h18"/></svg></button>
      </div>

      <div class="body" v-show="!exito">
        <p v-if="cargando" class="muted">Cargando…</p>
        <div v-else-if="sinCarga" class="vacio">
          <div class="emoji-big"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg></div>
          <p>No tienes una carga abierta.<br>Abre tu carga del día para vender en ruta.</p>
          <button class="cta-line" @click="$router.replace('/app/inventario')">Ir a inventario</button>
        </div>
        <template v-else>
          <!-- Cliente -->
          <div class="sec">Cliente</div>
          <div v-if="cliente" class="cli-sel" @click="cliente = null">
            <div class="av-ic">{{ ini(cliente.nombre) }}</div>
            <div class="info"><div class="nm">{{ cliente.nombre }}</div><div class="sub">Toca para cambiar</div></div>
            <ion-icon :icon="swapHorizontal" />
          </div>
          <template v-else>
            <div class="search">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
              <input v-model="buscarCli" placeholder="Buscar cliente…">
            </div>
            <div class="cli-lista">
              <div v-for="c in clientesFiltrados" :key="c.id" class="cli-op" @click="cliente = c">
                <div class="av-ic">{{ ini(c.nombre) }}</div><div class="nm">{{ c.nombre }}</div>
              </div>
              <p v-if="!clientesFiltrados.length" class="muted2">Sin clientes. Regístralos primero.</p>
            </div>
          </template>

          <!-- Productos -->
          <div class="sec">¿Qué vende?</div>
          <div v-for="l in lineasCarga" :key="l.productoId" class="prod" :class="{ flash: resaltado===l.productoId }" :ref="(el)=>setRef(l.productoId, el)">
            <div class="top">
              <div class="emoji"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5v-9z"/><path d="M3 7.5l9 4.5 9-4.5"/><path d="M12 12v9"/></svg></div>
              <div class="info">
                <div class="nm">{{ l.productoNombre }}</div>
                <div class="pr">
                  <template v-if="esCaja(l)"><b>{{ money(precioL(l)) }}</b> / caja · te quedan {{ maxUnidad(l) }} caja(s)</template>
                  <template v-else><b>{{ money(precioL(l)) }}</b> · te quedan {{ fmt(l.restante) }}</template>
                </div>
              </div>
              <div class="stepper">
                <button @click="set(l, (cant[l.productoId]||0) - 1)" :disabled="(cant[l.productoId]||0)<=0">−</button>
                <span class="q">{{ cant[l.productoId] || 0 }}</span>
                <button @click="set(l, (cant[l.productoId]||0) + 1)" :disabled="(cant[l.productoId]||0) >= maxUnidad(l)">+</button>
              </div>
            </div>
            <div v-if="info(l.productoId).vendePorCaja" class="uni">
              <button :class="{ on: !esCaja(l) }" @click="setUnidad(l, 'pza')">Pieza</button>
              <button :class="{ on: esCaja(l) }" @click="setUnidad(l, 'caja')">Caja ({{ info(l.productoId).piezasPorCaja }})</button>
            </div>
          </div>
          <p v-if="!lineasCarga.length" class="muted2">No traes productos disponibles en la carga.</p>

          <!-- Pago -->
          <div class="sec">Método de pago</div>
          <div class="pagos">
            <button v-for="m in metodos" :key="m.k" :class="{ on: metodo === m.k }" @click="metodo = m.k">
              <ion-icon :icon="m.icon" />{{ m.t }}
            </button>
          </div>
          <div v-if="metodo === 2" class="field"><input class="inp" v-model="referencia" placeholder="Referencia de la terminal (opcional)"></div>
          <div v-if="metodo === 3" class="field credito">
            <div class="fl">Días para pagar</div>
            <div class="dias">
              <button v-for="d in [7,15,30]" :key="d" :class="{ on: diasCredito === d }" @click="diasCredito = d">{{ d }} días</button>
            </div>
            <div class="hint">Vence el {{ fechaLimiteTxt }}. Se registrará como cuenta por cobrar.</div>
          </div>
        </template>
      </div>

      <transition name="fadem"><div v-if="scanMsg" class="scanmsg" :class="scanTipo">{{ scanMsg }}</div></transition>
      <BarcodeScanner :show="mostrarScan" continuo :resultado="scanResult" @scan="onScan" @close="mostrarScan = false" />

      <div class="footer" v-if="!sinCarga && !cargando && !exito">
        <div class="tot"><span>Total</span><b>{{ money(total) }}</b></div>
        <p v-if="error" class="err">{{ error }}</p>
        <button class="cta" :disabled="enviando || !valido" @click="vender()">{{ enviando ? 'Registrando…' : 'Cobrar y registrar venta' }}</button>
      </div>

      <!-- ÉXITO + TICKET -->
      <div class="done-view" :class="{ show: exito }">
        <div class="check"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></div>
        <h2>Venta registrada</h2>
        <p>{{ cliente?.nombre }} · {{ ticket ? metodoTxt(ticket.metodoPago) : '' }}</p>
        <div class="ticket" v-if="ticket">
          <div class="th"><div class="b">DISTRIBUIDORA</div><small>Venta en ruta · Ticket #{{ ticket.id }} · {{ ticket.fecha }}</small></div>
          <div class="tr" v-for="t in ticket.lineas" :key="t.nombre"><span>{{ t.nombre }} ({{ t.cant }})</span><span>{{ money2(t.sub) }}</span></div>
          <div class="tr muted"><span>Cliente</span><span>{{ cliente?.nombre }}</span></div>
          <div class="tr muted"><span>Atendió</span><span>{{ ticket.repartidor }}</span></div>
          <div class="tt"><span>TOTAL</span><span>{{ money2(ticket.total) }}</span></div>
          <div class="credit" v-if="ticket.credito">CRÉDITO · vence {{ ticket.vence }}</div>
          <div style="height:14px"></div>
        </div>
        <div class="done-actions">
          <button class="da ghost" :disabled="imprimiendo" @click="imprimirTicket()">
            <svg viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5h20v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>
            {{ imprimiendo ? 'Imprimiendo…' : 'Imprimir ticket' }}
          </button>
          <button class="da solid" @click="$router.replace('/app/inventario')">Listo <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
        </div>
        <p v-if="printMsg" class="print-msg">{{ printMsg }}</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { IonPage, IonContent, IonIcon } from '@ionic/vue'
import { cashOutline, swapHorizontalOutline, cardOutline, timeOutline, swapHorizontal } from 'ionicons/icons'
import http from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import BarcodeScanner from '@/components/BarcodeScanner.vue'

const auth = useAuthStore()
const cargando = ref(true)
const sinCarga = ref(false)
const lineasCarga = ref([])
const clientes = ref([])
const cliente = ref(null)
const buscarCli = ref('')
const cant = reactive({})
const metodo = ref(0)
const referencia = ref('')
const diasCredito = ref(7)
const enviando = ref(false)
const error = ref('')
const exito = ref(false)
const exitoDet = ref([])
const ticket = ref(null)
const imprimiendo = ref(false)
const printMsg = ref('')
const METODO_TXT = { 0: 'Efectivo', 1: 'Transferencia', 2: 'Tarjeta', 3: 'Crédito', Efectivo: 'Efectivo', Transferencia: 'Transferencia', Tarjeta: 'Tarjeta', Credito: 'Crédito' }
function metodoTxt(m) { return METODO_TXT[m] || String(m || '') }
const mostrarScan = ref(false)
const scanMsg = ref('')
const scanTipo = ref('') // '' | 'err'
const scanResult = ref(null) // { texto, tipo } -> se muestra DENTRO del escáner
let scanResultTimer = null
const resaltado = ref(null)
const refs = {}
const codMap = ref({})   // codigoBarras NORMALIZADO -> productoId
const nombreMap = ref({}) // productoId -> nombre (para mensajes)
const infoMap = ref({})  // productoId -> { vendePorCaja, piezasPorCaja, precioCaja, precioVenta }
const unidad = reactive({}) // productoId -> 'pza' | 'caja'

const metodos = [
  { k: 0, t: 'Efectivo', icon: cashOutline },
  { k: 1, t: 'Transfer.', icon: swapHorizontalOutline },
  { k: 2, t: 'Tarjeta', icon: cardOutline },
  { k: 3, t: 'Crédito', icon: timeOutline }
]
const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const money2 = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt = (n) => Number(n || 0).toLocaleString('es-MX')
const ini = (n) => (n || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
const clientesFiltrados = computed(() => { const t = buscarCli.value.trim().toLowerCase(); return t ? clientes.value.filter((c) => c.nombre.toLowerCase().includes(t)) : clientes.value })
const total = computed(() => lineasCarga.value.reduce((s, l) => s + (cant[l.productoId] || 0) * precioL(l), 0))
const valido = computed(() => cliente.value && total.value > 0)
const fechaLimite = computed(() => { const d = new Date(); d.setDate(d.getDate() + diasCredito.value); return d })
const fechaLimiteTxt = computed(() => fechaLimite.value.toLocaleDateString('es-MX', { day: '2-digit', month: 'long' }))

function info(pid) { return infoMap.value[pid] || {} }
function esCaja(l) { return unidad[l.productoId] === 'caja' }
function factorL(l) { const f = info(l.productoId).piezasPorCaja; return f && f > 0 ? f : 1 }
function precioL(l) { return esCaja(l) ? (info(l.productoId).precioCaja || 0) : l.precioVenta }
function maxUnidad(l) { return esCaja(l) ? Math.floor(l.restante / factorL(l)) : l.restante }
function setUnidad(l, u) { unidad[l.productoId] = u; cant[l.productoId] = 0 }
function set(l, val) { cant[l.productoId] = Math.max(0, Math.min(val, maxUnidad(l))) }
function setRef(id, el) { if (el) refs[id] = el }

// Normaliza un código: deja solo dígitos y quita ceros a la izquierda (EAN-13 vs UPC-A)
function normCod(x) { const d = String(x || '').replace(/\D/g, ''); return d.replace(/^0+/, '') || d }

function aviso(msg, tipo = '') {
  // Si el escáner está abierto, el mensaje se muestra DENTRO de él; si no, como toast inferior.
  if (mostrarScan.value) {
    scanResult.value = { texto: msg, tipo }
    clearTimeout(scanResultTimer)
    scanResultTimer = setTimeout(() => { scanResult.value = null }, 2200)
  } else {
    scanMsg.value = msg; scanTipo.value = tipo
    setTimeout(() => { scanMsg.value = '' }, 2500)
  }
}

function onScan(code) {
  const key = normCod(code)
  const pid = codMap.value[key]
  if (!pid) { aviso(`Código ${code}: no está en el catálogo`, 'err'); return }
  const l = lineasCarga.value.find((x) => x.productoId === pid)
  if (!l) { aviso(`${nombreMap.value[pid] || 'Ese producto'}: no lo traes en la carga`, 'err'); return }
  if ((cant[l.productoId] || 0) >= maxUnidad(l)) { aviso(`${l.productoNombre}: ya alcanzaste lo disponible`, 'err'); return }
  set(l, (cant[l.productoId] || 0) + 1)
  aviso(`${l.productoNombre} agregado (${cant[l.productoId]})`)
  // resaltar la tarjeta y hacer scroll a ella
  resaltado.value = l.productoId
  setTimeout(() => { if (resaltado.value === l.productoId) resaltado.value = null }, 1200)
  nextTick(() => { refs[l.productoId]?.scrollIntoView({ behavior: 'smooth', block: 'center' }) })
}
async function vender() {
  if (!valido.value) return
  const lineas = lineasCarga.value.filter((l) => (cant[l.productoId] || 0) > 0).map((l) => ({ productoId: l.productoId, cantidad: cant[l.productoId], esCaja: esCaja(l) }))
  if (!lineas.length) { error.value = 'Agrega al menos un producto.'; return }
  enviando.value = true; error.value = ''
  const body = { clienteId: cliente.value.id, metodoPago: metodo.value, lineas }
  if (metodo.value === 2 && referencia.value.trim()) body.referenciaPago = referencia.value.trim()
  if (metodo.value === 3) body.fechaLimiteCredito = fechaLimite.value.toISOString()
  try {
    const { data } = await http.post('/pedidos/autoventa', body)
    armarTicket(data)
    exito.value = true
  } catch (e) { error.value = e.response?.data?.mensaje || 'No se pudo registrar la venta.' }
  finally { enviando.value = false }
}
function armarTicket(d) {
  ticket.value = {
    id: d.id,
    fecha: new Date(d.fecha).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    lineas: (d.lineas || []).filter((l) => l.cantidadEntregada > 0).map((l) => ({ nombre: l.productoNombre, cant: fmt(l.cantidadEntregada), sub: l.subtotal })),
    total: d.total,
    metodoPago: d.metodoPago,
    repartidor: d.repartidorNombre,
    credito: d.metodoPago === 'Credito',
    vence: fechaLimite.value.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
  }
}

// Placeholder: se conectará a la impresora Bluetooth (MUNBYN, ESC/POS) cuando esté disponible.
async function imprimirTicket() {
  imprimiendo.value = true; printMsg.value = ''
  try {
    // TODO: integrar impresión Bluetooth ESC/POS aquí (misma lógica que en EntregaView).
    await new Promise((r) => setTimeout(r, 600))
    printMsg.value = 'La impresión por Bluetooth se activará al conectar la impresora.'
  } finally { imprimiendo.value = false }
}

onMounted(async () => {
  try {
    const cg = await http.get(`/cargas/repartidor/${auth.usuarioId}/abierta`)
    lineasCarga.value = (cg.data.lineas || []).filter((l) => l.restante > 0)
    const cl = await http.get('/clientes', { params: { tamano: 200 } })
    clientes.value = cl.data.items
    try {
      const pr = await http.get('/productos', { params: { tamano: 200 } })
      const m = {}, info = {}, nom = {}
      pr.data.items.forEach((x) => {
        if (x.codigoBarras) m[normCod(x.codigoBarras)] = x.id
        info[x.id] = { vendePorCaja: x.vendePorCaja, piezasPorCaja: x.piezasPorCaja, precioCaja: x.precioCaja, precioVenta: x.precioVenta }
        nom[x.id] = x.nombre
      })
      codMap.value = m; infoMap.value = info; nombreMap.value = nom
    } catch { /* el escaneo por código quedará limitado, no es crítico */ }
  } catch (e) {
    if (e.response?.status === 404) sinCarga.value = true
    else error.value = 'No se pudo cargar la información.'
  } finally { cargando.value = false }
})
</script>

<style scoped>
.av { --background: var(--paper); }
.err { color: var(--clay); font-size: 13px; font-weight: 600; margin: 8px 2px; }
.muted { color: var(--muted); padding: 16px 2px; }
.muted2 { color: var(--muted); font-size: 13px; padding: 8px 2px; }
.bar { display: flex; align-items: center; gap: 12px; padding: 14px 18px 10px; }
.iconbtn { width: 40px; height: 40px; border-radius: 13px; border: 1px solid var(--line); background: var(--surface); display: grid; place-items: center; cursor: pointer; flex: 0 0 auto; }
.iconbtn.ghost { border-color: transparent; background: transparent; }
.iconbtn svg { width: 20px; height: 20px; stroke: var(--ink); fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.ttl { flex: 1; }
.ttl .s { font-size: 11.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--pine); }
.ttl .n { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 19px; margin-top: 1px; }
.body { padding: 6px 18px 160px; }
.vacio { text-align: center; padding: 50px 20px; }
.emoji-big { margin-bottom: 14px; color: var(--muted); text-align: center; }
.emoji-big svg { width: 52px; height: 52px; }
.vacio p { color: var(--muted); font-weight: 500; line-height: 1.5; margin-bottom: 18px; }
.cta-line { background: var(--pine); color: #fff; border: none; border-radius: 13px; padding: 13px 22px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; }
.sec { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 11.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); margin: 20px 2px 10px; }
.search { display: flex; align-items: center; gap: 10px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; box-shadow: var(--shadow); }
.search svg { width: 18px; height: 18px; stroke: var(--muted); fill: none; stroke-width: 2; flex: 0 0 auto; }
.search input { border: none; background: transparent; outline: none; font-size: 14.5px; font-weight: 500; color: var(--ink); width: 100%; }
.cli-lista { margin-top: 8px; max-height: 230px; overflow: auto; }
.cli-op { display: flex; align-items: center; gap: 11px; background: var(--surface); border: 1px solid var(--line); border-radius: 13px; padding: 11px 13px; margin-bottom: 7px; cursor: pointer; }
.cli-sel { display: flex; align-items: center; gap: 12px; background: var(--pine-tint); border: 1px solid #BFD8CD; border-radius: 14px; padding: 13px; cursor: pointer; }
.cli-sel ion-icon { font-size: 19px; color: var(--pine); }
.av-ic { width: 38px; height: 38px; border-radius: 11px; background: var(--amber-soft); display: grid; place-items: center; color: #B9781F; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; flex: 0 0 auto; }
.cli-op .nm, .cli-sel .nm { font-weight: 700; font-size: 14.5px; }
.cli-sel .info { flex: 1; } .cli-sel .sub { font-size: 12px; color: var(--muted); }
.prod { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; margin-bottom: 9px; box-shadow: var(--shadow); transition: background .3s, border-color .3s; }
.prod.flash { background: var(--pine-tint); border-color: var(--pine); }
.prod .top { display: flex; align-items: center; gap: 12px; }
.uni { display: flex; gap: 6px; margin-top: 10px; }
.uni button { flex: 1; border: 1px solid var(--line); background: var(--paper); color: var(--muted); border-radius: 9px; padding: 7px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12px; cursor: pointer; }
.uni button.on { background: var(--pine); color: #fff; border-color: var(--pine); }
.emoji { width: 42px; height: 42px; border-radius: 11px; background: var(--paper-2); display: grid; place-items: center; color: var(--ink-soft); flex: 0 0 auto; }
.emoji svg { width: 22px; height: 22px; }
.prod .info { flex: 1; min-width: 0; }
.prod .nm { font-weight: 700; font-size: 14.5px; }
.prod .pr { font-size: 12px; color: var(--muted); margin-top: 1px; }
.prod .pr b { color: var(--ink-soft); font-variant-numeric: tabular-nums; }
.stepper { display: flex; align-items: center; background: var(--paper); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; flex: 0 0 auto; }
.stepper button { width: 38px; height: 40px; border: none; background: transparent; font-size: 20px; color: var(--pine); cursor: pointer; }
.stepper button:disabled { color: #C7CFC9; }
.stepper .q { min-width: 30px; text-align: center; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 16px; }
.pagos { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.pagos button { display: flex; flex-direction: column; align-items: center; gap: 5px; border: 1px solid var(--line); background: var(--surface); color: var(--ink-soft); border-radius: 13px; padding: 12px 4px; font-family: "Hanken Grotesk"; font-weight: 700; font-size: 12px; cursor: pointer; }
.pagos button ion-icon { font-size: 20px; }
.pagos button.on { background: var(--pine); color: #fff; border-color: var(--pine); }
.field { margin-top: 10px; }
.inp { width: 100%; border: 1px solid var(--line); background: var(--surface); border-radius: 12px; padding: 12px 13px; font-family: "Hanken Grotesk"; font-size: 14.5px; font-weight: 600; color: var(--ink); }
.credito { background: var(--amber-soft); border: 1px solid #EAD9B8; border-radius: 14px; padding: 13px; }
.credito .fl { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #8A6516; margin-bottom: 9px; }
.dias { display: flex; gap: 8px; }
.dias button { flex: 1; border: 1px solid #EAD9B8; background: var(--surface); color: var(--ink-soft); border-radius: 10px; padding: 9px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13px; cursor: pointer; }
.dias button.on { background: var(--amber); color: #fff; border-color: var(--amber); }
.credito .hint { font-size: 12px; color: #8A6516; margin-top: 9px; font-weight: 600; }
.footer { position: fixed; left: 0; right: 0; bottom: 0; background: var(--surface); border-top: 1px solid var(--line); padding: 14px 18px calc(14px + env(safe-area-inset-bottom)); box-shadow: 0 -10px 24px -16px rgba(0,0,0,.3); }
.tot { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
.tot span { font-size: 13px; color: var(--muted); font-weight: 600; }
.tot b { font-family: "Bricolage Grotesque"; font-size: 26px; font-variant-numeric: tabular-nums; }
.cta { width: 100%; background: var(--pine); color: #fff; border: none; border-radius: 14px; padding: 15px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; cursor: pointer; box-shadow: 0 12px 22px -12px rgba(14,92,74,.8); }
.cta:disabled { opacity: .5; }
.iconbtn.scan svg { width: 21px; height: 21px; }
.scanmsg { position: fixed; left: 50%; transform: translateX(-50%); bottom: 96px; z-index: 4500; background: var(--ink); color: #fff; border-radius: 12px; padding: 10px 16px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; box-shadow: 0 12px 24px -10px rgba(0,0,0,.5); max-width: 86vw; text-align: center; }
.scanmsg.err { background: var(--clay); }
.fadem-enter-active, .fadem-leave-active { transition: opacity .2s; } .fadem-enter-from, .fadem-leave-to { opacity: 0; }

/* éxito + ticket (igual que en la entrega) */
.done-view { position: fixed; inset: 0; background: linear-gradient(160deg,var(--pine),var(--pine-deep)); display: none; flex-direction: column; align-items: center; justify-content: flex-start; padding: 60px 26px 26px; z-index: 50; overflow: auto; }
.done-view.show { display: flex; animation: fadev .4s ease; }
@keyframes fadev { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.done-view .check { width: 78px; height: 78px; border-radius: 50%; background: rgba(255,255,255,.14); display: grid; place-items: center; margin-bottom: 18px; position: relative; }
.done-view .check::before { content: ""; position: absolute; inset: -8px; border-radius: 50%; border: 2px solid rgba(255,255,255,.2); animation: ring 1.6s ease-out infinite; }
@keyframes ring { 0% { transform: scale(.85); opacity: .8; } 100% { transform: scale(1.35); opacity: 0; } }
.done-view .check svg { width: 40px; height: 40px; stroke: #fff; fill: none; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 40; stroke-dashoffset: 40; animation: draw .5s ease .2s forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }
.done-view h2 { color: #fff; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 24px; letter-spacing: -.01em; }
.done-view p { color: #A9D2C6; font-size: 14px; font-weight: 500; margin-top: 6px; text-align: center; }
.ticket { background: #fff; width: 240px; border-radius: 4px; margin-top: 24px; padding: 18px 18px 8px; font-family: "Hanken Grotesk"; color: #1c1c1c; position: relative; box-shadow: 0 20px 40px -16px rgba(0,0,0,.5); }
.ticket .th { text-align: center; border-bottom: 1.5px dashed #c9c9c9; padding-bottom: 11px; }
.ticket .th .b { font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 17px; letter-spacing: .02em; }
.ticket .th small { font-size: 10.5px; color: #777; display: block; margin-top: 2px; }
.ticket .tr { display: flex; justify-content: space-between; font-size: 11.5px; margin: 7px 0; font-variant-numeric: tabular-nums; }
.ticket .tr.muted { color: #888; }
.ticket .tt { border-top: 1.5px dashed #c9c9c9; margin-top: 9px; padding-top: 9px; display: flex; justify-content: space-between; font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 14px; }
.ticket .credit { background: #f0f6f3; border: 1px dashed #9cc5b6; border-radius: 6px; font-size: 10.5px; text-align: center; padding: 7px; margin-top: 10px; color: #0A3F33; font-weight: 600; }
.done-actions { display: flex; gap: 10px; margin-top: 26px; width: 100%; max-width: 360px; }
.da { flex: 1; border: none; border-radius: 14px; padding: 14px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
.da.ghost { background: rgba(255,255,255,.12); color: #fff; }
.da.ghost:disabled { opacity: .6; }
.da.solid { background: var(--amber); color: #3a2607; }
.da svg { width: 17px; height: 17px; stroke: currentColor; fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.print-msg { color: #BFE0D5; font-size: 12.5px; margin-top: 14px; text-align: center; max-width: 320px; }
</style>
