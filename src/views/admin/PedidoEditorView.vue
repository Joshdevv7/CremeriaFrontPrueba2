<template>
  <div class="editor">
    <p v-if="cargando" class="muted">Cargando…</p>
    <template v-else>
      <div class="form" v-show="!exito">
        <div class="col selects">
          <div class="field"><div class="fl">Cliente *</div>
            <select class="inp sel" v-model="clienteId" @change="autoRepartidor"><option :value="null" disabled>Selecciona un cliente</option><option v-for="c in clientes" :key="c.id" :value="c.id">{{ c.nombre }}</option></select>
          </div>
          <div class="field"><div class="fl">Repartidor *</div>
            <select class="inp sel" v-model="repartidorId"><option :value="null" disabled>Selecciona un repartidor</option><option v-for="r in repartidores" :key="r.id" :value="r.id">{{ r.nombre }}</option></select>
          </div>
          <div class="totcard">
            <div class="k">Total del pedido<b>{{ totalLineas }} productos</b></div>
            <div class="v">{{ money(total) }}</div>
            <button class="cta" :disabled="enviando || !puedeCrear" @click="guardar()">{{ enviando ? 'Guardando…' : (esNuevo ? 'Crear pedido' : 'Guardar cambios') }}</button>
            <p v-if="error" class="err">{{ error }}</p>
          </div>
        </div>
        <div class="col">
          <div class="eyebrow">
            <span>Productos</span>
            <button class="scan-b" type="button" @click="mostrarScan = true"><svg viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M3 12h18"/></svg>Escanear</button>
          </div>
          <div v-for="p in productos" :key="p.id" class="prod" :class="{ flash: resaltado === p.id }" :ref="(el) => setProdRef(p.id, el)">
            <div class="top">
              <div class="emoji"><svg class="pkg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5v-9z"/><path d="M3 7.5l9 4.5 9-4.5"/><path d="M12 12v9"/></svg></div>
              <div class="meta">
                <div class="nm">{{ p.nombre }}</div>
                <div class="pr">
                  <template v-if="unidad[p.id] === 'caja'">{{ money(p.precioCaja) }} / caja · {{ (cant[p.id]||0) * p.piezasPorCaja }} pzas</template>
                  <template v-else>{{ money(p.precioVenta) }} / pza</template>
                </div>
              </div>
              <div class="stepper"><button @click="dec(p.id)" :disabled="(cant[p.id]||0)<=0">−</button><span class="q">{{ cant[p.id] || 0 }}</span><button @click="inc(p.id)">+</button></div>
            </div>
            <div v-if="p.vendePorCaja" class="uni">
              <button :class="{ on: unidad[p.id] !== 'caja' }" @click="setUnidad(p.id, 'pza')">Pieza</button>
              <button :class="{ on: unidad[p.id] === 'caja' }" @click="setUnidad(p.id, 'caja')">Caja ({{ p.piezasPorCaja }})</button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <transition name="fadem"><div v-if="scanMsg" class="scanmsg">{{ scanMsg }}</div></transition>
    <BarcodeScanner :show="mostrarScan" continuo @scan="onScan" @close="mostrarScan = false" />

    <ExitoOverlay :show="exito" :titulo="exitoTit" :subtitulo="exitoSub" :chips="exitoChips" :detalle="exitoDetalle" cta-texto="Ver pedidos" @done="salir" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import http from '@/api/http'
import ExitoOverlay from '@/components/ExitoOverlay.vue'
import BarcodeScanner from '@/components/BarcodeScanner.vue'

const emit = defineEmits(['ctx'])
const route = useRoute()
const router = useRouter()
const esNuevo = computed(() => route.params.id === 'nuevo')
const clientes = ref([]), repartidores = ref([]), productos = ref([])
const clienteId = ref(null), repartidorId = ref(null)
const cant = reactive({})
const unidad = reactive({})  // productoId -> 'pza' | 'caja'
const cargando = ref(true), enviando = ref(false), error = ref('')
const exito = ref(false), exitoChips = ref([]), exitoDetalle = ref([]), exitoSub = ref(''), exitoTit = ref('')
const mostrarScan = ref(false)
const scanMsg = ref('')
const resaltado = ref(null)
const prodRefs = {}

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const productoMap = computed(() => Object.fromEntries(productos.value.map((p) => [p.id, p])))
function precioUnidad(id) { const p = productoMap.value[id]; if (!p) return 0; return unidad[id] === 'caja' ? p.precioCaja : p.precioVenta }
const total = computed(() => Object.entries(cant).reduce((s, [id, q]) => s + (q || 0) * precioUnidad(id), 0))
const totalLineas = computed(() => Object.values(cant).reduce((s, q) => s + (q || 0), 0))
const puedeCrear = computed(() => clienteId.value && repartidorId.value && totalLineas.value > 0)

function inc(id) { cant[id] = (cant[id] || 0) + 1 }
function dec(id) { if (cant[id] > 0) cant[id]-- }
function autoRepartidor() { const c = clientes.value.find((x) => x.id === clienteId.value); if (c?.repartidorId) repartidorId.value = c.repartidorId }
function salir() { router.replace('/panel/pedidos') }
function setProdRef(id, el) { if (el) prodRefs[id] = el }
function setUnidad(id, u) { unidad[id] = u }

function normCod(x) { return String(x || '').replace(/\s/g, '') }
async function onScan(code) {
  const p = productos.value.find((x) => x.codigoBarras && normCod(x.codigoBarras) === normCod(code))
  if (!p) { scanMsg.value = `Código ${code} no está en el catálogo`; setTimeout(() => { scanMsg.value = '' }, 2500); return }
  if (!cant[p.id]) cant[p.id] = 1            // lo agrega en 1; tú ajustas la cantidad
  scanMsg.value = `Agregado: ${p.nombre} — ajusta la cantidad`
  setTimeout(() => { scanMsg.value = '' }, 2500)
  resaltado.value = p.id
  setTimeout(() => { if (resaltado.value === p.id) resaltado.value = null }, 1500)
  await nextTick()
  prodRefs[p.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

async function guardar() {
  if (!puedeCrear.value) return
  enviando.value = true; error.value = ''
  const lineas = Object.entries(cant).filter(([, q]) => q > 0).map(([productoId, cantidad]) => ({ productoId: Number(productoId), cantidad, esCaja: unidad[productoId] === 'caja' }))
  try {
    const body = { clienteId: clienteId.value, repartidorId: repartidorId.value, esVentaLibre: false, lineas }
    if (esNuevo.value) await http.post('/pedidos', body)
    else await http.put(`/pedidos/${route.params.id}`, body)
    const cli = clientes.value.find((c) => c.id === clienteId.value)
    const rep = repartidores.value.find((r) => r.id === repartidorId.value)
    exitoChips.value = lineas.map((l) => `${l.cantidad} ${l.esCaja ? 'caja(s) ' : ''}${productoMap.value[l.productoId]?.nombre || ''}`)
    exitoDetalle.value = [{ k: 'Cliente', v: cli?.nombre || '' }, { k: 'Repartidor', v: rep?.nombre || '' }, { k: 'Total', v: money(total.value) }]
    exitoTit.value = esNuevo.value ? 'Pedido creado' : 'Pedido actualizado'
    exitoSub.value = esNuevo.value ? 'Listo para entregar' : (cli?.nombre || '')
    exito.value = true
  } catch (e) { error.value = e.response?.data?.mensaje || 'No se pudo guardar el pedido.' }
  finally { enviando.value = false }
}
async function cargar() {
  cargando.value = true
  try {
    const [cl, rp, pr] = await Promise.all([http.get('/clientes', { params: { tamano: 100 } }), http.get('/usuarios/repartidores'), http.get('/productos', { params: { tamano: 100 } })])
    clientes.value = cl.data.items; repartidores.value = rp.data; productos.value = pr.data.items
    if (!esNuevo.value) { const { data } = await http.get(`/pedidos/${route.params.id}`); clienteId.value = data.clienteId; repartidorId.value = data.repartidorId; data.lineas.forEach((l) => { cant[l.productoId] = l.cantidadPedida }) }
  } catch (e) { error.value = 'No se pudieron cargar los datos.' }
  finally { cargando.value = false }
}
onMounted(() => { emit('ctx', { titulo: esNuevo.value ? 'Nuevo pedido' : 'Editar pedido', sub: '', back: '/panel/pedidos' }); cargar() })
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; }
.err { color: var(--clay); font-size: 13px; font-weight: 600; margin-top: 10px; }
.form { display: grid; grid-template-columns: 1fr 1.2fr; gap: 16px; align-items: start; }
.col { display: flex; flex-direction: column; gap: 11px; }
.eyebrow { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 11.5px; letter-spacing: .13em; text-transform: uppercase; color: var(--muted); margin: 4px 2px 4px; display: flex; align-items: center; justify-content: space-between; }
.scan-b { display: flex; align-items: center; gap: 7px; border: 1px solid var(--line); background: var(--pine-tint); color: var(--pine-deep); border-radius: 10px; padding: 7px 12px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12px; letter-spacing: 0; text-transform: none; cursor: pointer; }
.scan-b svg { width: 17px; height: 17px; stroke: var(--pine); fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
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
.prod { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 12px 14px; box-shadow: var(--shadow); transition: background .3s, border-color .3s; }
.prod .top { display: flex; align-items: center; gap: 12px; }
.uni { display: flex; gap: 6px; margin-top: 10px; }
.uni button { flex: 1; border: 1px solid var(--line); background: var(--paper); color: var(--muted); border-radius: 9px; padding: 7px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12px; cursor: pointer; }
.uni button.on { background: var(--pine); color: #fff; border-color: var(--pine); }
.prod.flash { background: var(--pine-tint); border-color: var(--pine); }
.emoji { width: 42px; height: 42px; border-radius: 12px; background: var(--paper-2); display: grid; place-items: center; flex: 0 0 auto; color: var(--ink-soft); }
.emoji svg { width: 22px; height: 22px; }
.meta { flex: 1; min-width: 0; }
.meta .nm { font-weight: 700; font-size: 14.5px; }
.meta .pr { font-size: 12.5px; color: var(--muted); font-weight: 600; margin-top: 1px; }
.stepper { display: flex; align-items: center; background: var(--paper); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; flex: 0 0 auto; }
.stepper button { width: 32px; height: 34px; border: none; background: transparent; font-size: 19px; color: var(--pine); cursor: pointer; font-weight: 600; display: grid; place-items: center; }
.stepper button:disabled { color: #C7CFC9; }
.stepper .q { min-width: 30px; text-align: center; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; }
.scanmsg { position: fixed; left: 50%; transform: translateX(-50%); bottom: 30px; z-index: 4500; background: var(--ink); color: #fff; border-radius: 12px; padding: 10px 16px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; box-shadow: 0 12px 24px -10px rgba(0,0,0,.5); }
.fadem-enter-active, .fadem-leave-active { transition: opacity .2s; } .fadem-enter-from, .fadem-leave-to { opacity: 0; }
@media (max-width: 860px) { .form { grid-template-columns: 1fr; } .totcard { position: static; } }
</style>
