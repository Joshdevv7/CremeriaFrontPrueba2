<template>
  <div class="editor">
    <p v-if="cargando" class="muted">Cargando…</p>
    <template v-else>
      <div class="form" v-show="!exito">
        <div class="col selects">
          <div class="field"><div class="fl">Proveedor *</div>
            <select class="inp sel" v-model="proveedorId"><option :value="null" disabled>Selecciona un proveedor</option><option v-for="p in proveedores" :key="p.id" :value="p.id">{{ p.nombre }}</option></select>
          </div>
          <div class="field"><div class="fl">Folio / factura (opcional)</div><input class="inp" v-model="referencia" placeholder="Ej. Factura A-1234"></div>
          <div class="totcard">
            <div class="k">Total de la compra<b>{{ lineasActivas.length }} producto(s)</b></div>
            <div class="v">{{ money(total) }}</div>
            <button class="cta" :disabled="enviando || !puede" @click="registrar()">{{ enviando ? 'Registrando…' : 'Registrar compra' }}</button>
            <p class="nota">Al registrar, sube el stock y recalcula el costo promedio ponderado de cada producto.</p>
            <p v-if="error" class="err">{{ error }}</p>
          </div>
        </div>
        <div class="col">
          <div class="eyebrow">
            <span>Productos comprados</span>
            <button class="scan-b" type="button" @click="mostrarScan = true"><svg viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M3 12h18"/></svg>Escanear</button>
          </div>
          <div class="search">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
            <input v-model="buscar" placeholder="Buscar producto…">
          </div>
          <div v-for="p in filtrados" :key="p.id" class="prod" :class="{ act: (cant[p.id]||0)>0, flash: resaltado===p.id }" :ref="(el)=>setRef(p.id, el)">
            <div class="top">
              <div class="emoji"><svg class="pkg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5v-9z"/><path d="M3 7.5l9 4.5 9-4.5"/><path d="M12 12v9"/></svg></div>
              <div class="meta"><div class="nm">{{ p.nombre }}</div><div class="pr">costo actual {{ money(p.costoPromedio) }} · almacén {{ fmt(p.stockAlmacen) }}</div></div>
              <div class="stepper">
                <button @click="dec(p.id)" :disabled="(cant[p.id]||0)<=0">−</button>
                <input class="q" type="number" min="0" inputmode="numeric" :value="cant[p.id] || 0" @input="setCant(p.id, $event.target.value)" @focus="$event.target.select()">
                <button @click="inc(p.id)">+</button>
              </div>
            </div>
            <div v-if="p.vendePorCaja" class="uni">
              <button :class="{ on: unidad[p.id] !== 'caja' }" @click="setUnidad(p.id, 'pza')">Pieza</button>
              <button :class="{ on: unidad[p.id] === 'caja' }" @click="setUnidad(p.id, 'caja')">Caja ({{ p.piezasPorCaja }})</button>
            </div>
            <div v-if="(cant[p.id]||0)>0" class="costo">
              <span>{{ unidad[p.id] === 'caja' ? 'Costo por caja de esta compra' : 'Costo unitario de esta compra' }}</span>
              <div class="cinp"><span>$</span><input v-model.number="costo[p.id]" type="number" step="any" placeholder="0.00"></div>
            </div>
            <div v-if="(cant[p.id]||0)>0 && unidad[p.id]==='caja'" class="conv">= {{ (cant[p.id]||0) * p.piezasPorCaja }} piezas · costo por pieza {{ money((Number(costo[p.id])||0) / (p.piezasPorCaja||1)) }}</div>
          </div>
          <p v-if="!filtrados.length" class="muted">Sin productos.</p>
        </div>
      </div>
    </template>

    <transition name="fadem"><div v-if="scanMsg" class="scanmsg">{{ scanMsg }}</div></transition>
    <BarcodeScanner :show="mostrarScan" continuo @scan="onScan" @close="mostrarScan = false" />
    <ExitoOverlay :show="exito" titulo="Compra registrada" :subtitulo="provNombre" :detalle="exitoDet" cta-texto="Ver compras" @done="salir" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import http from '@/api/http'
import ExitoOverlay from '@/components/ExitoOverlay.vue'
import BarcodeScanner from '@/components/BarcodeScanner.vue'

const emit = defineEmits(['ctx'])
const router = useRouter()
const proveedores = ref([]), productos = ref([])
const proveedorId = ref(null), referencia = ref('')
const cant = reactive({}), costo = reactive({})
const unidad = reactive({}) // productoId -> 'pza' | 'caja'
const buscar = ref('')
const cargando = ref(true), enviando = ref(false), error = ref('')
const exito = ref(false), exitoDet = ref([])
const mostrarScan = ref(false), scanMsg = ref(''), resaltado = ref(null)
const refs = {}

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const fmt = (n) => Number(n || 0).toLocaleString('es-MX')
const pmap = computed(() => Object.fromEntries(productos.value.map((p) => [p.id, p])))
const filtrados = computed(() => { const t = buscar.value.trim().toLowerCase(); return t ? productos.value.filter((p) => p.nombre.toLowerCase().includes(t)) : productos.value })
const lineasActivas = computed(() => Object.entries(cant).filter(([, q]) => q > 0).map(([id]) => Number(id)))
const total = computed(() => lineasActivas.value.reduce((s, id) => s + (cant[id] || 0) * (Number(costo[id]) || 0), 0))
const provNombre = computed(() => proveedores.value.find((p) => p.id === proveedorId.value)?.nombre || '')
const puede = computed(() => proveedorId.value && lineasActivas.value.length > 0)

function setRef(id, el) { if (el) refs[id] = el }
function setUnidad(id, u) { unidad[id] = u; costo[id] = 0 }
function asegurarCosto(id) { if (costo[id] === undefined) costo[id] = unidad[id] === 'caja' ? 0 : (pmap.value[id]?.costoPromedio || 0) }
function inc(id) { cant[id] = (cant[id] || 0) + 1; asegurarCosto(id) }
function dec(id) { if (cant[id] > 0) cant[id]-- }
function setCant(id, val) {
  let n = parseInt(String(val).replace(/[^\d]/g, ''), 10)
  if (isNaN(n) || n < 0) n = 0
  cant[id] = n
  if (n > 0) asegurarCosto(id)
}
function salir() { router.replace('/panel/compras') }
function normCod(x) { return String(x || '').replace(/\s/g, '') }
async function onScan(code) {
  const p = productos.value.find((x) => x.codigoBarras && normCod(x.codigoBarras) === normCod(code))
  if (!p) { scanMsg.value = `Código ${code} no está en el catálogo`; setTimeout(() => { scanMsg.value = '' }, 2500); return }
  if (!cant[p.id]) { cant[p.id] = 1; costo[p.id] = unidad[p.id] === 'caja' ? 0 : (p.costoPromedio || 0) }
  scanMsg.value = `Agregado: ${p.nombre} — ajusta cantidad y costo`
  setTimeout(() => { scanMsg.value = '' }, 2500)
  resaltado.value = p.id; setTimeout(() => { if (resaltado.value === p.id) resaltado.value = null }, 1500)
  await nextTick(); refs[p.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

async function registrar() {
  if (!puede.value) return
  enviando.value = true; error.value = ''
  const lineas = lineasActivas.value.map((id) => {
    const p = pmap.value[id]; const caja = unidad[id] === 'caja'; const factor = caja ? (p?.piezasPorCaja || 1) : 1
    return { productoId: id, cantidad: (cant[id] || 0) * factor, costoUnitario: (Number(costo[id]) || 0) / factor }
  })
  try {
    await http.post('/compras', { proveedorId: proveedorId.value, referencia: referencia.value.trim() || null, lineas })
    exitoDet.value = [{ k: 'Productos', v: String(lineas.length) }, { k: 'Total', v: money(total.value) }]
    exito.value = true
  } catch (e) { error.value = e.response?.data?.mensaje || 'No se pudo registrar la compra.' }
  finally { enviando.value = false }
}
onMounted(async () => {
  emit('ctx', { titulo: 'Nueva compra', sub: 'Entrada de mercancía', back: '/panel/compras' })
  try {
    const [pv, pr] = await Promise.all([http.get('/proveedores', { params: { tamano: 100 } }), http.get('/productos', { params: { tamano: 200 } })])
    proveedores.value = pv.data.items; productos.value = pr.data.items
  } catch { error.value = 'No se pudieron cargar los datos.' }
  finally { cargando.value = false }
})
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; }
.err { color: var(--clay); font-size: 13px; font-weight: 600; margin-top: 10px; }
.form { display: grid; grid-template-columns: 1fr 1.2fr; gap: 16px; align-items: start; }
.col { display: flex; flex-direction: column; gap: 11px; }
.eyebrow { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 11.5px; letter-spacing: .13em; text-transform: uppercase; color: var(--muted); margin: 4px 2px; display: flex; align-items: center; justify-content: space-between; }
.scan-b { display: flex; align-items: center; gap: 7px; border: 1px solid var(--line); background: var(--sky-soft); color: #1F5269; border-radius: 10px; padding: 7px 12px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12px; letter-spacing: 0; text-transform: none; cursor: pointer; }
.scan-b svg { width: 17px; height: 17px; stroke: var(--sky); fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.field { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px; box-shadow: var(--shadow); }
.fl { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 9px; }
.inp { width: 100%; border: 1px solid var(--line); background: var(--paper); border-radius: 11px; padding: 12px 13px; font-family: "Hanken Grotesk"; font-size: 15px; font-weight: 600; color: var(--ink); }
.sel { appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%237C8A82' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; }
.totcard { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 16px; box-shadow: var(--shadow); position: sticky; top: 0; }
.totcard .k { font-size: 12.5px; color: var(--muted); font-weight: 600; }
.totcard .k b { display: block; color: var(--ink); font-size: 11px; font-weight: 600; margin-top: 1px; }
.totcard .v { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 30px; letter-spacing: -.02em; font-variant-numeric: tabular-nums; margin: 6px 0 12px; }
.cta { width: 100%; background: var(--pine); color: #fff; border: none; border-radius: 14px; padding: 15px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; cursor: pointer; box-shadow: 0 12px 22px -12px rgba(14,92,74,.8); }
.cta:disabled { opacity: .5; }
.nota { font-size: 11.5px; color: var(--muted); margin-top: 10px; line-height: 1.4; }
.search { display: flex; align-items: center; gap: 10px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 11px 14px; box-shadow: var(--shadow); }
.search svg { width: 18px; height: 18px; stroke: var(--muted); fill: none; stroke-width: 2; flex: 0 0 auto; }
.search input { border: none; background: transparent; outline: none; font-size: 14.5px; font-weight: 500; color: var(--ink); width: 100%; }
.prod { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 12px 14px; box-shadow: var(--shadow); transition: background .3s, border-color .3s; }
.prod.act { border-color: var(--sky); }
.prod.flash { background: var(--sky-soft); }
.prod .top { display: flex; align-items: center; gap: 12px; }
.emoji { width: 42px; height: 42px; border-radius: 12px; background: var(--paper-2); display: grid; place-items: center; flex: 0 0 auto; color: var(--ink-soft); }
.emoji svg { width: 22px; height: 22px; }
.meta { flex: 1; min-width: 0; }
.meta .nm { font-weight: 700; font-size: 14.5px; }
.meta .pr { font-size: 12px; color: var(--muted); font-weight: 600; margin-top: 1px; }
.stepper { display: flex; align-items: center; background: var(--paper); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; flex: 0 0 auto; }
.stepper button { width: 32px; height: 34px; border: none; background: transparent; font-size: 19px; color: var(--sky); cursor: pointer; font-weight: 600; }
.stepper button:disabled { color: #C7CFC9; }
.stepper .q { width: 50px; height: 34px; min-width: 50px; text-align: center; border: none; background: transparent; outline: none; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; color: var(--ink); -moz-appearance: textfield; }
.stepper .q::-webkit-outer-spin-button, .stepper .q::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.costo { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 11px; padding-top: 11px; border-top: 1px solid var(--line); }
.costo span { font-size: 12px; color: var(--muted); font-weight: 600; }
.cinp { display: flex; align-items: center; gap: 4px; background: var(--paper); border: 1px solid var(--line); border-radius: 10px; padding: 6px 11px; }
.cinp span { color: var(--ink-soft); font-weight: 700; }
.cinp input { width: 90px; border: none; background: transparent; outline: none; text-align: right; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; color: var(--ink); }
.scanmsg { position: fixed; left: 50%; transform: translateX(-50%); bottom: 30px; z-index: 4500; background: var(--ink); color: #fff; border-radius: 12px; padding: 10px 16px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; box-shadow: 0 12px 24px -10px rgba(0,0,0,.5); }
.fadem-enter-active, .fadem-leave-active { transition: opacity .2s; } .fadem-enter-from, .fadem-leave-to { opacity: 0; }
@media (max-width: 860px) { .form { grid-template-columns: 1fr; } .totcard { position: static; } }
.uni { display: flex; gap: 6px; margin-top: 10px; }
.uni button { flex: 1; border: 1px solid var(--line); background: var(--paper); color: var(--muted); border-radius: 9px; padding: 7px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12px; cursor: pointer; }
.uni button.on { background: var(--sky); color: #fff; border-color: var(--sky); }
.conv { font-size: 12px; color: var(--sky); font-weight: 700; margin-top: 8px; }
</style>
