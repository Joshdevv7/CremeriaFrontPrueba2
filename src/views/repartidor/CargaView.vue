<template>
  <ion-page>
    <ion-content :fullscreen="true" class="cg">
      <div class="bar">
        <div class="ttl"><div class="s">En ruta</div><div class="n">Inventario</div></div>
        <button class="merma-btn" @click="$router.push('/merma')"><svg viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>Reportar merma</button>
      </div>

      <div class="tabs">
        <button class="tab" :class="{ on: tab===1 }" @click="setTab(1)">Mi carga</button>
        <button class="tab" :class="{ on: tab===2 }" @click="setTab(2)">Catálogo</button>
      </div>

      <div class="body" ref="bodyRef">
        <!-- MI CARGA -->
        <div class="view" :class="{ show: tab===1 }">
          <p v-if="cargaCargando" class="muted">Cargando carga…</p>

          <!-- Con carga abierta -->
          <template v-else-if="carga">
            <div class="hero">
              <div class="top"><span class="t">Valor en camioneta</span><span class="tag">{{ horaCarga }}</span></div>
              <div class="val">{{ money(carga.valorRestante) }}<span class="mxn">MXN restante</span></div>
              <div class="bardual"><div class="sold" :style="{ width: pctVendido + '%' }"></div></div>
              <div class="legend">
                <div><span class="k"><span class="dot" style="background:var(--amber)"></span>Vendido</span><span class="v">{{ money(carga.valorVendido) }}</span></div>
                <div><span class="k"><span class="dot" style="background:#7FD3BD"></span>Cargado</span><span class="v">{{ money(carga.valorCargado) }}</span></div>
              </div>
              <div class="reconc">
                <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                <span>Cargué <b>{{ money(carga.valorCargado) }}</b> − Vendí <b>{{ money(carga.valorVendido) }}</b> = debe quedar <b>{{ money(carga.valorRestante) }} MXN</b></span>
              </div>
            </div>

            <div class="eyebrow">Productos en ruta <span class="cnt">{{ carga.lineas.length }}</span></div>
            <div>
              <div v-for="l in carga.lineas" :key="l.id" class="item">
                <div class="row">
                  <div class="emoji"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5v-9z"/><path d="M3 7.5l9 4.5 9-4.5"/><path d="M12 12v9"/></svg></div>
                  <div class="meta">
                    <div class="nm">{{ l.productoNombre }}</div>
                    <div class="pr"><b>{{ money(l.precioVenta) }}</b> / pza · MXN</div>
                  </div>
                  <div class="rem"><div class="q">{{ fmtQty(l.restante) }}</div><div class="l">Quedan</div></div>
                </div>
                <div class="splitbar"><div class="s" :style="{ width: pctLinea(l) + '%' }"></div></div>
                <div class="legend2">
                  <span class="a">Cargué <b>{{ fmtQty(l.cantidadCargada) }}</b></span>
                  <span class="b">Vendí <b>{{ fmtQty(l.cantidadVendida) }}</b></span>
                  <span class="c">Quedan <b>{{ fmtQty(l.restante) }}</b></span>
                </div>
                <div v-if="l.cantidadMermada > 0" class="mermatag">
                  <svg viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>
                  {{ fmtQty(l.cantidadMermada) }} merma reportada
                </div>
              </div>
            </div>

            <div class="acc-row">
              <button class="venta" @click="$router.push('/autoventa')">
                <svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>Venta en ruta
              </button>
              <button class="agregar" @click="$router.push('/reabastecer')">
                <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Agregar carga
              </button>
            </div>
            <button class="cerrar" :disabled="enviando" @click="cerrarCarga">
              {{ enviando ? 'Cerrando…' : 'Cerrar carga del día' }}
            </button>
          </template>

          <!-- Creando carga -->
          <template v-else-if="creando">
            <div class="eyebrow">Selecciona lo que cargas</div>
            <div v-for="p in productos" :key="p.id" class="cat col">
              <div class="crow">
                <div class="emoji"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5v-9z"/><path d="M3 7.5l9 4.5 9-4.5"/><path d="M12 12v9"/></svg></div>
                <div class="meta"><div class="nm">{{ p.nombre }}</div><div class="st">{{ p.categoria || '—' }} · almacén <b>{{ fmtQty(p.stockAlmacen) }}</b><span v-if="unidadNueva[p.id]==='caja' && (nueva[p.id]||0)>0"> · cargas {{ (nueva[p.id]||0)*factorP(p) }} pzas</span></div></div>
                <div class="stepper">
                  <button @click="decNueva(p.id)" :disabled="(nueva[p.id]||0)<=0">−</button>
                  <input class="q" type="number" min="0" inputmode="numeric" :value="nueva[p.id] || 0" @input="setNueva(p.id, $event.target.value)" @focus="$event.target.select()">
                  <button @click="incNueva(p.id)" :disabled="(nueva[p.id]||0) >= maxNueva(p)">+</button>
                </div>
              </div>
              <div v-if="p.vendePorCaja" class="uni">
                <button :class="{ on: unidadNueva[p.id] !== 'caja' }" @click="setUnidadNueva(p.id, 'pza')">Pieza</button>
                <button :class="{ on: unidadNueva[p.id] === 'caja' }" @click="setUnidadNueva(p.id, 'caja')">Caja ({{ p.piezasPorCaja }})</button>
              </div>
            </div>
            <p v-if="error" class="err">{{ error }}</p>
            <div class="dual">
              <button class="ghost" @click="creando=false">Cancelar</button>
              <button class="primary" :disabled="enviando || totalNueva===0" @click="abrirCarga">
                {{ enviando ? 'Abriendo…' : `Abrir carga (${totalNueva})` }}
              </button>
            </div>
          </template>

          <!-- Sin carga -->
          <template v-else>
            <div class="empty">
              <div class="ico"><svg viewBox="0 0 24 24"><path d="M21 8l-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg></div>
              <div class="et">Sin carga abierta</div>
              <div class="es">Carga producto del almacén para salir a ruta.</div>
              <button class="primary" @click="iniciarCreacion">Abrir carga del día</button>
            </div>
          </template>
        </div>

        <!-- CATÁLOGO -->
        <div class="view" :class="{ show: tab===2 }">
          <div class="search">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
            <input v-model="busqueda" placeholder="Buscar producto…">
          </div>
          <div class="ro">
            <svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
            Solo lectura · los precios los define el administrador
          </div>
          <div class="eyebrow">Catálogo · precios en MXN</div>
          <div>
            <div v-for="p in catalogoFiltrado" :key="p.id" class="cat">
              <div class="emoji"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5v-9z"/><path d="M3 7.5l9 4.5 9-4.5"/><path d="M12 12v9"/></svg></div>
              <div class="meta"><div class="nm">{{ p.nombre }}</div><div class="st">{{ p.categoria || '—' }} · almacén <b>{{ fmtQty(p.stockAlmacen) }}</b></div></div>
              <div class="price">
                <div class="p">{{ money(p.precioVenta) }}<svg class="lock" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></div>
                <div class="u">MXN / pza</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { IonPage, IonContent, onIonViewWillEnter } from '@ionic/vue'
import http from '@/api/http'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const tab = ref(1)
const carga = ref(null)
const cargaCargando = ref(true)
const productos = ref([])
const creando = ref(false)
const nueva = reactive({})
const unidadNueva = reactive({}) // productoId -> 'pza' | 'caja'
function factorP(p) { return p && p.vendePorCaja && p.piezasPorCaja > 0 ? p.piezasPorCaja : 1 }
function maxNueva(p) { return unidadNueva[p.id] === 'caja' ? Math.floor(p.stockAlmacen / factorP(p)) : p.stockAlmacen }
function setUnidadNueva(pid, u) { unidadNueva[pid] = u; nueva[pid] = 0 }
const busqueda = ref('')
const enviando = ref(false)
const error = ref('')
const bodyRef = ref(null)

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const fmtQty = (n) => Number(n || 0).toLocaleString('es-MX')

const horaCarga = computed(() => carga.value
  ? 'Cargado ' + new Date(carga.value.fecha).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' })
  : '')
const pctVendido = computed(() => {
  const c = carga.value
  return c && c.valorCargado > 0 ? Math.round(c.valorVendido / c.valorCargado * 100) : 0
})
function pctLinea(l) { return l.cantidadCargada > 0 ? Math.round(l.cantidadVendida / l.cantidadCargada * 100) : 0 }

const catalogoFiltrado = computed(() => {
  const t = busqueda.value.trim().toLowerCase()
  return t ? productos.value.filter((p) => p.nombre.toLowerCase().includes(t)) : productos.value
})
const totalNueva = computed(() => Object.values(nueva).reduce((s, n) => s + (n || 0), 0))

function setTab(n) { tab.value = n; bodyRef.value?.scrollTo({ top: 0 }) }
function incNueva(id) { const p = productos.value.find((x) => x.id === id); if (p && (nueva[id] || 0) < maxNueva(p)) nueva[id] = (nueva[id] || 0) + 1 }
function decNueva(id) { if (nueva[id] > 0) nueva[id]-- }
function setNueva(id, val) {
  const p = productos.value.find((x) => x.id === id)
  let n = parseInt(String(val).replace(/[^\d]/g, ''), 10)
  if (isNaN(n) || n < 0) n = 0
  if (p) n = Math.min(n, maxNueva(p))
  nueva[id] = n
}
function iniciarCreacion() { creando.value = true; tab.value = 1 }

async function cargarCarga() {
  cargaCargando.value = true; error.value = ''
  try {
    const { data } = await http.get(`/cargas/repartidor/${auth.usuarioId}/abierta`)
    carga.value = data
  } catch (e) {
    if (e.response?.status === 404) carga.value = null
    else error.value = e.response?.data?.mensaje || 'No se pudo cargar.'
  } finally { cargaCargando.value = false }
}
async function cargarProductos() {
  try {
    const { data } = await http.get('/productos', { params: { tamano: 100 } })
    productos.value = data.items
  } catch { /* noop */ }
}
async function abrirCarga() {
  error.value = ''
  const lineas = Object.entries(nueva).filter(([, q]) => q > 0).map(([productoId, cantidad]) => {
    const prod = productos.value.find((x) => x.id === Number(productoId))
    const factor = (unidadNueva[productoId] === 'caja') ? factorP(prod) : 1
    return { productoId: Number(productoId), cantidad: cantidad * factor }
  })
  if (!lineas.length) return
  enviando.value = true
  try {
    await http.post('/cargas', { repartidorId: auth.usuarioId, lineas })
    Object.keys(nueva).forEach((k) => delete nueva[k])
    creando.value = false
    await cargarCarga()
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudo abrir la carga.'
  } finally { enviando.value = false }
}
async function cerrarCarga() {
  enviando.value = true; error.value = ''
  try {
    await http.post(`/cargas/${carga.value.id}/cerrar`)
    await cargarCarga()
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudo cerrar la carga.'
  } finally { enviando.value = false }
}

onMounted(async () => { await Promise.all([cargarCarga(), cargarProductos()]) })
onIonViewWillEnter(() => { if (!cargaCargando.value) cargarCarga() })
</script>

<style scoped>
.cg { --background: var(--paper); --padding-top: 0; --padding-bottom: 0; }
.muted { color: var(--muted); text-align: center; margin-top: 30px; }
.err { color: var(--clay); font-size: 13px; font-weight: 600; margin: 10px 4px; text-align: center; }

.bar { display: flex; align-items: center; gap: 12px; padding: 14px 18px 10px; }
.bar .ttl { flex: 1; }
.bar .ttl .s { font-size: 11.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--pine); }
.bar .ttl .n { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 19px; letter-spacing: -.01em; margin-top: 1px; }

.tabs { display: flex; gap: 6px; margin: 2px 18px 12px; background: var(--paper-2); border: 1px solid var(--line); border-radius: 14px; padding: 4px; }
.tab { flex: 1; text-align: center; padding: 9px; border-radius: 10px; font-weight: 700; font-size: 13.5px; color: var(--muted); cursor: pointer; transition: .2s; border: none; background: transparent; font-family: "Hanken Grotesk"; }
.tab.on { background: var(--surface); color: var(--ink); box-shadow: 0 2px 6px rgba(0,0,0,.08); }

.body { padding: 2px 18px calc(86px + env(safe-area-inset-bottom)); }
.view { display: none; animation: fade .32s ease; }
.view.show { display: block; }
@keyframes fade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.eyebrow { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 11.5px; letter-spacing: .13em; text-transform: uppercase; color: var(--muted); margin: 18px 4px 11px; display: flex; align-items: center; justify-content: space-between; }
.eyebrow .cnt { color: var(--pine); }

/* hero */
.hero { background: linear-gradient(155deg,var(--pine),var(--pine-deep)); border-radius: 24px; padding: 20px; color: #fff; position: relative; overflow: hidden; box-shadow: 0 20px 40px -22px rgba(10,63,51,.9); }
.hero::before { content: ""; position: absolute; inset: 0; background: radial-gradient(140px 140px at 90% 8%,rgba(232,151,46,.28),transparent 70%); }
.hero .top { display: flex; justify-content: space-between; align-items: center; position: relative; }
.hero .top .t { font-size: 12.5px; font-weight: 600; color: #BFE0D5; }
.hero .top .tag { font-size: 11px; font-weight: 700; color: #9FC9BC; background: rgba(255,255,255,.10); padding: 5px 10px; border-radius: 999px; }
.hero .val { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 40px; letter-spacing: -.02em; margin: 10px 0 2px; position: relative; font-variant-numeric: tabular-nums; }
.hero .val .mxn { font-size: 14px; color: #9FC9BC; font-weight: 600; margin-left: 6px; }
.hero .bardual { height: 9px; border-radius: 6px; background: rgba(255,255,255,.16); overflow: hidden; display: flex; margin: 14px 0; position: relative; }
.hero .bardual .sold { background: var(--amber); height: 100%; border-radius: 6px; }
.hero .legend { display: flex; gap: 16px; position: relative; }
.hero .legend div { display: flex; flex-direction: column; gap: 2px; }
.hero .legend .k { font-size: 11px; color: #A9D2C6; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.hero .legend .v { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; font-variant-numeric: tabular-nums; }
.dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
.reconc { display: flex; align-items: center; gap: 9px; background: var(--amber-soft); border: 1px solid #F0D9AE; border-radius: 13px; padding: 11px 13px; margin-top: 13px; font-size: 12.5px; font-weight: 600; color: #7A4E14; }
.reconc svg { width: 17px; height: 17px; stroke: var(--amber); fill: none; stroke-width: 2.2; flex: 0 0 auto; }
.reconc b { font-family: "Bricolage Grotesque"; }

/* cargo item */
.item { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 14px; margin-bottom: 11px; box-shadow: var(--shadow); }
.item .row { display: flex; align-items: center; gap: 12px; }
.emoji { width: 44px; height: 44px; border-radius: 13px; background: var(--paper-2); display: grid; place-items: center; color: var(--ink-soft); flex: 0 0 auto; }
.emoji svg { width: 23px; height: 23px; }
.item .meta { flex: 1; min-width: 0; }
.item .meta .nm { font-weight: 700; font-size: 15px; letter-spacing: -.01em; }
.item .meta .pr { font-size: 12.5px; color: var(--muted); font-weight: 600; margin-top: 1px; }
.item .meta .pr b { color: var(--ink-soft); font-variant-numeric: tabular-nums; }
.rem { text-align: right; flex: 0 0 auto; }
.rem .q { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 24px; letter-spacing: -.01em; line-height: 1; font-variant-numeric: tabular-nums; }
.rem .l { font-size: 10.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--muted); margin-top: 3px; }
.splitbar { height: 6px; border-radius: 5px; background: var(--pine-tint); overflow: hidden; display: flex; margin: 13px 0 9px; }
.splitbar .s { background: var(--amber); height: 100%; }
.legend2 { display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; }
.legend2 .a { color: var(--ink-soft); }
.legend2 .a b, .legend2 .b b, .legend2 .c b { font-variant-numeric: tabular-nums; }
.legend2 .b { color: var(--amber); }
.legend2 .c { color: var(--pine); }
.mermatag { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; color: var(--clay); background: var(--clay-soft); padding: 3px 8px; border-radius: 7px; margin-top: 9px; }
.mermatag svg { width: 12px; height: 12px; stroke: var(--clay); fill: none; stroke-width: 2.4; }

/* catálogo */
.search { display: flex; align-items: center; gap: 10px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; margin: 4px 0; box-shadow: var(--shadow); }
.search svg { width: 18px; height: 18px; stroke: var(--muted); fill: none; stroke-width: 2; flex: 0 0 auto; }
.search input { border: none; background: transparent; outline: none; font-family: "Hanken Grotesk"; font-size: 14.5px; font-weight: 500; color: var(--ink); width: 100%; }
.ro { display: flex; align-items: center; gap: 9px; background: var(--sky-soft); border: 1px solid #C7DDE7; border-radius: 12px; padding: 10px 13px; margin: 12px 0; font-size: 12.5px; font-weight: 600; color: #1F5269; }
.ro svg { width: 16px; height: 16px; stroke: var(--sky); fill: none; stroke-width: 2.2; flex: 0 0 auto; }
.cat { display: flex; align-items: center; gap: 13px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 12px 14px; margin-bottom: 9px; box-shadow: var(--shadow); }
.cat .meta { flex: 1; min-width: 0; }
.cat .meta .nm { font-weight: 700; font-size: 14.5px; letter-spacing: -.01em; }
.cat .meta .st { font-size: 12px; color: var(--muted); font-weight: 500; margin-top: 2px; }
.cat .meta .st b { color: var(--ink-soft); font-variant-numeric: tabular-nums; }
.cat .price { text-align: right; flex: 0 0 auto; }
.cat .price .p { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 17px; font-variant-numeric: tabular-nums; }
.cat .price .u { font-size: 10.5px; color: var(--muted); font-weight: 600; }
.lock { width: 15px; height: 15px; stroke: var(--muted); fill: none; stroke-width: 2; vertical-align: -2px; margin-left: 4px; opacity: .7; }

/* item de abrir carga en columna (para el selector pza/caja) */
.cat.col { flex-direction: column; align-items: stretch; gap: 0; }
.cat.col .crow { display: flex; align-items: center; gap: 13px; }
.uni { display: flex; gap: 6px; margin-top: 10px; }
.uni button { flex: 1; border: 1px solid var(--line); background: var(--paper); color: var(--muted); border-radius: 9px; padding: 7px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12px; cursor: pointer; }
.uni button.on { background: var(--pine); color: #fff; border-color: var(--pine); }

/* stepper (creación) */
.stepper { display: flex; align-items: center; background: var(--paper); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; flex: 0 0 auto; }
.stepper button { width: 32px; height: 34px; border: none; background: transparent; font-size: 19px; color: var(--pine); cursor: pointer; font-weight: 600; display: grid; place-items: center; }
.stepper button:disabled { color: #C7CFC9; }
.stepper .q { width: 48px; height: 34px; min-width: 48px; text-align: center; border: none; background: transparent; outline: none; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; color: var(--ink); -moz-appearance: textfield; }
.stepper .q::-webkit-outer-spin-button, .stepper .q::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

/* botones */
.acc-row { display: flex; gap: 10px; margin: 4px 0 10px; }
.acc-row button { flex: 1; }
.venta { border: none; background: var(--pine); color: #fff; border-radius: 15px; padding: 14px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 12px 22px -12px rgba(14,92,74,.8); }
.venta svg { width: 18px; height: 18px; stroke: #fff; fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.agregar { border: 1px solid var(--pine); background: var(--pine-tint); color: var(--pine-deep); border-radius: 15px; padding: 14px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
.agregar svg { width: 18px; height: 18px; stroke: var(--pine); fill: none; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.cerrar { width: 100%; margin-top: 0; border: none; border-radius: 15px; padding: 15px; background: var(--ink); color: #fff; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; cursor: pointer; }
.cerrar:disabled { opacity: .5; }
.dual { display: flex; gap: 10px; margin-top: 14px; }
.dual .ghost { flex: 1; border: 1px solid var(--line); background: var(--surface); color: var(--ink-soft); border-radius: 14px; padding: 14px; font-family: "Bricolage Grotesque"; font-weight: 700; cursor: pointer; }
.primary { flex: 1; border: none; background: var(--pine); color: #fff; border-radius: 14px; padding: 14px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; cursor: pointer; }
.primary:disabled { opacity: .5; }

.empty { text-align: center; padding: 50px 20px; }
.empty .ico { width: 64px; height: 64px; border-radius: 18px; margin: 0 auto 16px; display: grid; place-items: center; background: var(--pine-tint); }
.empty .ico svg { width: 30px; height: 30px; stroke: var(--pine); fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.empty .et { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; }
.empty .es { color: var(--muted); font-size: 13.5px; margin: 6px 0 20px; }
.empty .primary { display: inline-block; width: auto; padding: 13px 22px; }
.merma-btn { display: flex; align-items: center; gap: 7px; background: var(--clay-soft); color: var(--clay); border: 1px solid #EAC9BC; border-radius: 12px; padding: 9px 13px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13px; cursor: pointer; }
.merma-btn svg { width: 16px; height: 16px; stroke: var(--clay); fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.bar { display: flex; align-items: center; justify-content: space-between; }
</style>
