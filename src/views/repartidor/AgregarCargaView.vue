<template>
  <ion-page>
    <ion-content :fullscreen="true" class="ac">
      <div class="bar">
        <div class="iconbtn" @click="$router.replace('/app/inventario')"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></div>
        <div class="ttl"><div class="s">En ruta</div><div class="n">Agregar a mi carga</div></div>
        <button class="iconbtn scan" @click="mostrarScan = true" title="Escanear"><svg viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M3 12h18"/></svg></button>
      </div>

      <div class="body" v-show="!exito">
        <p v-if="cargando" class="muted">Cargando…</p>
        <div v-else-if="sinCarga" class="vacio">
          <div class="emoji-big"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5v-9z"/><path d="M3 7.5l9 4.5 9-4.5"/><path d="M12 12v9"/></svg></div>
          <p>No tienes una carga abierta.<br>Abre tu carga del día para poder reabastecer.</p>
          <button class="cta-line" @click="$router.replace('/app/inventario')">Ir a inventario</button>
        </div>
        <template v-else>
          <p class="intro">Pasa por la bodega y agrega lo que vas a llevar de más. Se descuenta del almacén y se suma a tu carga actual, sin cerrar tu jornada.</p>
          <div class="search">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
            <input v-model="buscar" placeholder="Buscar producto…">
          </div>
          <div class="lista">
            <div v-for="p in filtrados" :key="p.id" class="prod">
              <div class="top">
                <div class="emoji"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5v-9z"/><path d="M3 7.5l9 4.5 9-4.5"/><path d="M12 12v9"/></svg></div>
                <div class="info"><div class="nm">{{ p.nombre }}</div><div class="pr">almacén {{ fmt(p.stockAlmacen) }} · {{ p.unidad }}<span v-if="unidad[p.id]==='caja' && (cant[p.id]||0)>0"> · cargas {{ (cant[p.id]||0)*p.piezasPorCaja }} pzas</span></div></div>
                <div class="stepper">
                  <button @click="set(p.id, (cant[p.id]||0) - 1)" :disabled="(cant[p.id]||0)<=0">−</button>
                  <input class="q" type="number" min="0" inputmode="numeric" :value="cant[p.id] || 0" @input="set(p.id, parseInt(String($event.target.value).replace(/[^\d]/g,''),10) || 0)" @focus="$event.target.select()">
                  <button @click="set(p.id, (cant[p.id]||0) + 1)" :disabled="(cant[p.id]||0) >= maxUnidad(p)">+</button>
                </div>
              </div>
              <div v-if="p.vendePorCaja" class="uni">
                <button :class="{ on: unidad[p.id] !== 'caja' }" @click="setUnidad(p.id, 'pza')">Pieza</button>
                <button :class="{ on: unidad[p.id] === 'caja' }" @click="setUnidad(p.id, 'caja')">Caja ({{ p.piezasPorCaja }})</button>
              </div>
            </div>
            <p v-if="!filtrados.length" class="muted">Sin productos.</p>
          </div>
        </template>
      </div>

      <transition name="fade"><div v-if="scanMsg" class="scanmsg">{{ scanMsg }}</div></transition>
      <BarcodeScanner :show="mostrarScan" continuo @scan="onScan" @close="mostrarScan = false" />

      <div class="footer" v-if="!sinCarga && !cargando && !exito">
        <div class="resumen"><b>{{ totalItems }}</b> producto(s) a agregar</div>
        <p v-if="error" class="err">{{ error }}</p>
        <button class="cta" :disabled="enviando || totalItems === 0" @click="agregar()">{{ enviando ? 'Agregando…' : 'Agregar a mi carga' }}</button>
      </div>

      <ExitoOverlay :show="exito" titulo="Carga reabastecida" subtitulo="Tu carga se actualizó" :detalle="exitoDet" cta-texto="Volver al inventario" @done="$router.replace('/app/inventario')" />
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { IonPage, IonContent } from '@ionic/vue'
import http from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import ExitoOverlay from '@/components/ExitoOverlay.vue'
import BarcodeScanner from '@/components/BarcodeScanner.vue'

const auth = useAuthStore()
const productos = ref([])
const cargaLineas = ref([])
const cargando = ref(true)
const sinCarga = ref(false)
const buscar = ref('')
const cant = reactive({})
const unidad = reactive({}) // productoId -> 'pza' | 'caja'
const enviando = ref(false)
const error = ref('')
const exito = ref(false)
const exitoDet = ref([])
const mostrarScan = ref(false)
const scanMsg = ref('')

const fmt = (n) => Number(n || 0).toLocaleString('es-MX')
const filtrados = computed(() => { const t = buscar.value.trim().toLowerCase(); return t ? productos.value.filter((p) => p.nombre.toLowerCase().includes(t)) : productos.value })
const totalItems = computed(() => Object.values(cant).filter((q) => q > 0).length)
function enCarga(pid) { const l = cargaLineas.value.find((x) => x.productoId === pid); return l ? l.cantidadCargada : 0 }
function factorP(p) { return p && p.vendePorCaja && p.piezasPorCaja > 0 ? p.piezasPorCaja : 1 }
function maxUnidad(p) { return unidad[p.id] === 'caja' ? Math.floor(p.stockAlmacen / factorP(p)) : p.stockAlmacen }
function setUnidad(pid, u) { unidad[pid] = u; cant[pid] = 0 }
function set(pid, val) {
  const prod = productos.value.find((p) => p.id === pid)
  const max = prod ? maxUnidad(prod) : 0
  cant[pid] = Math.max(0, Math.min(val, max))
}
function normCod(x) { return String(x || '').replace(/\s/g, '') }
function onScan(code) {
  const p = productos.value.find((x) => x.codigoBarras && normCod(x.codigoBarras) === normCod(code))
  if (!p) { scanMsg.value = `Código ${code} no está en el catálogo`; return }
  if ((cant[p.id] || 0) >= maxUnidad(p)) { scanMsg.value = `${p.nombre}: no hay más en almacén`; return }
  set(p.id, (cant[p.id] || 0) + 1)
  scanMsg.value = `+1 ${p.nombre} (${cant[p.id]})`
  setTimeout(() => { scanMsg.value = '' }, 2500)
}
async function agregar() {
  const lineas = Object.entries(cant).filter(([, q]) => q > 0).map(([productoId, cantidad]) => {
    const prod = productos.value.find((x) => x.id === Number(productoId))
    const factor = (unidad[productoId] === 'caja') ? factorP(prod) : 1
    return { productoId: Number(productoId), cantidad: cantidad * factor }
  })
  if (!lineas.length) return
  enviando.value = true; error.value = ''
  try {
    await http.post('/cargas/reabastecer', { lineas })
    exitoDet.value = [{ k: 'Productos', v: String(lineas.length) }, { k: 'Piezas', v: fmt(lineas.reduce((s, l) => s + l.cantidad, 0)) }]
    exito.value = true
  } catch (e) { error.value = e.response?.data?.mensaje || 'No se pudo agregar a la carga.' }
  finally { enviando.value = false }
}
onMounted(async () => {
  try {
    const cg = await http.get(`/cargas/repartidor/${auth.usuarioId}/abierta`)
    cargaLineas.value = cg.data.lineas || []
    const pr = await http.get('/productos', { params: { tamano: 100 } })
    productos.value = pr.data.items
  } catch (e) {
    if (e.response?.status === 404) sinCarga.value = true
    else error.value = 'No se pudieron cargar los productos.'
  } finally { cargando.value = false }
})
</script>

<style scoped>
.ac { --background: var(--paper); }
.err { color: var(--clay); font-size: 13px; font-weight: 600; margin: 8px 2px; }
.muted { color: var(--muted); padding: 16px 2px; }
.bar { display: flex; align-items: center; gap: 12px; padding: 14px 18px 10px; }
.iconbtn { width: 40px; height: 40px; border-radius: 13px; border: 1px solid var(--line); background: var(--surface); display: grid; place-items: center; cursor: pointer; flex: 0 0 auto; }
.iconbtn.ghost { border-color: transparent; background: transparent; }
.iconbtn svg { width: 20px; height: 20px; stroke: var(--ink); fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.ttl { flex: 1; }
.ttl .s { font-size: 11.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--pine); }
.ttl .n { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 19px; margin-top: 1px; }
.body { padding: 6px 18px 140px; }
.vacio { text-align: center; padding: 50px 20px; }
.emoji-big { margin-bottom: 14px; color: var(--muted); text-align: center; }
.emoji-big svg { width: 52px; height: 52px; }
.vacio p { color: var(--muted); font-weight: 500; line-height: 1.5; margin-bottom: 18px; }
.cta-line { background: var(--pine); color: #fff; border: none; border-radius: 13px; padding: 13px 22px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; }
.intro { font-size: 13px; color: var(--muted); font-weight: 500; line-height: 1.5; margin-bottom: 14px; }
.search { display: flex; align-items: center; gap: 10px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; margin-bottom: 14px; box-shadow: var(--shadow); }
.search svg { width: 18px; height: 18px; stroke: var(--muted); fill: none; stroke-width: 2; flex: 0 0 auto; }
.search input { border: none; background: transparent; outline: none; font-size: 14.5px; font-weight: 500; color: var(--ink); width: 100%; }
.prod .top { display: flex; align-items: center; gap: 12px; }
.uni { display: flex; gap: 6px; margin-top: 10px; }
.uni button { flex: 1; border: 1px solid var(--line); background: var(--paper); color: var(--muted); border-radius: 9px; padding: 7px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12px; cursor: pointer; }
.uni button.on { background: var(--pine); color: #fff; border-color: var(--pine); }
.prod { gap: 12px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; margin-bottom: 9px; box-shadow: var(--shadow); }
.emoji { width: 42px; height: 42px; border-radius: 11px; background: var(--paper-2); display: grid; place-items: center; color: var(--ink-soft); flex: 0 0 auto; }
.emoji svg { width: 22px; height: 22px; }
.info { flex: 1; min-width: 0; }
.nm { font-weight: 700; font-size: 14.5px; }
.pr { font-size: 12px; color: var(--muted); margin-top: 1px; }
.stepper { display: flex; align-items: center; background: var(--paper); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; flex: 0 0 auto; }
.stepper button { width: 38px; height: 40px; border: none; background: transparent; font-size: 20px; color: var(--pine); cursor: pointer; }
.stepper button:disabled { color: #C7CFC9; }
.stepper .q { width: 48px; height: 34px; min-width: 48px; text-align: center; border: none; background: transparent; outline: none; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; color: var(--ink); -moz-appearance: textfield; }
.stepper .q::-webkit-outer-spin-button, .stepper .q::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.footer { position: fixed; left: 0; right: 0; bottom: 0; background: var(--surface); border-top: 1px solid var(--line); padding: 14px 18px calc(14px + env(safe-area-inset-bottom)); box-shadow: 0 -10px 24px -16px rgba(0,0,0,.3); }
.resumen { font-size: 13px; color: var(--muted); font-weight: 600; margin-bottom: 8px; }
.resumen b { font-family: "Bricolage Grotesque"; color: var(--ink); font-size: 16px; }
.cta { width: 100%; background: var(--pine); color: #fff; border: none; border-radius: 14px; padding: 15px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; cursor: pointer; box-shadow: 0 12px 22px -12px rgba(14,92,74,.8); }
.cta:disabled { opacity: .5; }
.iconbtn.scan svg { width: 21px; height: 21px; }
.scanmsg { position: fixed; left: 50%; transform: translateX(-50%); bottom: 96px; z-index: 4500; background: var(--ink); color: #fff; border-radius: 12px; padding: 10px 16px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; box-shadow: 0 12px 24px -10px rgba(0,0,0,.5); }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; } .fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
