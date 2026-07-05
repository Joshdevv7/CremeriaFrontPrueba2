<template>
  <ion-page>
    <ion-content :fullscreen="true" class="rt">
      <ion-refresher slot="fixed" @ionRefresh="recargar($event)"><ion-refresher-content /></ion-refresher>

      <div class="scroll">
        <div class="head">
          <div class="brand">
            <div class="logo">D</div>
            <div class="hello">Buen día,<b>{{ auth.usuario?.nombre }}</b></div>
          </div>
          <div class="head-r"><CampanaNotif /><div class="avatar">{{ iniciales }}</div></div>
        </div>

        <!-- Aviso: sin carga abierta -->
        <div class="sincarga" v-if="!cargando && !tieneCarga">
          <div class="sc-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5v-9z"/><path d="M3 7.5l9 4.5 9-4.5"/><path d="M12 12v9"/></svg></div>
          <div class="sc-tx">
            <b>No has levantado tu carga</b>
            <span>Levanta tu carga del día para poder iniciar entregas.</span>
          </div>
          <button class="sc-btn" @click="irACargar()">Ir a cargar</button>
        </div>

        <div class="hero">
          <div class="hero-top">
            <span class="t">Ruta de hoy</span>
            <span class="date">{{ hoy }}</span>
          </div>
          <div class="count">
            <span class="big">{{ pendientes.length }}</span>
            <span class="lbl">{{ pendientes.length === 1 ? 'parada por entregar' : 'paradas por entregar' }}</span>
          </div>
          <div class="track" v-if="pendientes.length">
            <div v-for="(p, i) in pendientes" :key="p.id" class="seg" :class="{ next: i === 0 }"></div>
          </div>
          <div class="hero-stats">
            <div class="stat">
              <span class="k"><span class="dot" style="background:var(--amber)"></span>Por entregar</span>
              <div class="v">{{ money(totalRuta) }}</div>
            </div>
            <div class="stat">
              <span class="k"><span class="dot" style="background:#7FD3BD"></span>Con ubicación</span>
              <div class="v">{{ conCoords }}<small> / {{ pendientes.length }}</small></div>
            </div>
          </div>
        </div>

        <template v-if="pendientes.length">
          <div class="eyebrow" style="margin-top:22px">Siguiente parada</div>
          <div class="next-card">
            <div class="mapwrap">
              <div ref="mapRef" class="map"></div>
              <div v-if="conCoords === 0" class="nogeo">Aún sin ubicaciones · captúralas en clientes</div>
            </div>
            <div class="next-body">
              <span class="stop-no">Parada 01</span>
              <div class="nb-top">
                <div>
                  <div class="cli">{{ siguiente.clienteNombre }}</div>
                  <div class="addr">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7C8A82" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    {{ siguiente.direccion || 'Sin direccion registrada' }}
                  </div>
                </div>
                <div class="amount">
                  <div class="m">{{ money(siguiente.total) }}</div>
                  <span class="c">Pendiente</span>
                </div>
              </div>
              <div class="items" v-if="itemsSiguiente.length">
                <span v-for="(it, i) in itemsSiguiente.slice(0, 2)" :key="i" class="chip"><svg class="pkg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5v-9z"/><path d="M3 7.5l9 4.5 9-4.5"/><path d="M12 12v9"/></svg> <b>{{ fmtQty(it.cantidadPedida) }}</b> {{ it.productoNombre }}</span>
                <span v-if="itemsSiguiente.length > 2" class="chip more">+{{ itemsSiguiente.length - 2 }} más</span>
              </div>
              <div class="acts">
                <button class="cta" :class="{ lock: !tieneCarga }" @click="iniciar(siguiente.id)">
                  {{ tieneCarga ? 'Iniciar entrega' : 'Levanta tu carga primero' }}
                  <svg class="arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </button>
                <button class="navbtn" @click="navegar(siguiente)" :disabled="!mapsUrl(siguiente)" title="Navegar con Google Maps">
                  <svg viewBox="0 0 24 24"><path d="M3 11l19-9-9 19-2-8-8-2Z"/></svg>
                </button>
              </div>
            </div>
          </div>

          <div class="list-head" v-if="resto.length">
            <div class="h">Pendientes <span>· {{ resto.length }}</span></div>
          </div>
          <div v-for="(p, i) in resto" :key="p.id" class="stop" :class="{ lock: !tieneCarga }" @click="iniciar(p.id)">
            <div class="idx">{{ String(i + 2).padStart(2, '0') }}</div>
            <div class="info">
              <div class="n">{{ p.clienteNombre }}</div>
              <div class="meta">{{ p.direccion || 'Sin direccion' }}</div>
            </div>
            <div class="right"><div class="mm">{{ money(p.total) }}</div></div>
          </div>
        </template>

        <div v-else-if="!cargando" class="empty">
          <div class="ico"><svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg></div>
          <div class="et">Sin paradas por hoy</div>
          <div class="es">No hay pedidos abiertos asignados.</div>
        </div>
        <p v-if="cargando" class="muted">Cargando ruta...</p>
        <p v-if="error" class="err">{{ error }}</p>
      </div>

      <!-- Toast de aviso al tocar sin carga -->
      <div class="toast" :class="{ show: toast }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>
        <div class="toast-tx">Primero levanta tu carga del día para poder entregar.</div>
        <button class="toast-go" @click="irACargar()">Cargar</button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import CampanaNotif from '@/components/CampanaNotif.vue'
import { ref, computed, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { IonPage, IonContent, IonRefresher, IonRefresherContent, onIonViewWillEnter } from '@ionic/vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import http from '@/api/http'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const pendientes = ref([])
const itemsSiguiente = ref([])
const cargando = ref(true)
const error = ref('')
const tieneCarga = ref(true)   // hasta confirmar, no bloqueamos (se corrige al cargar)
const toast = ref(false)
let toastTimer = null
const mapRef = ref(null)
let map = null
let capaPines = null

const CULIACAN = [24.8091, -107.394]
const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const fmtQty = (n) => Number(n || 0).toLocaleString('es-MX')
const hoy = new Date().toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' })
const iniciales = computed(() => (auth.usuario?.nombre || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase())

const siguiente = computed(() => pendientes.value[0] || {})
const resto = computed(() => pendientes.value.slice(1))
const totalRuta = computed(() => pendientes.value.reduce((s, p) => s + p.total, 0))
const conCoords = computed(() => pendientes.value.filter((p) => p.latitud != null && p.longitud != null).length)

function iniciar(id) {
  if (!tieneCarga.value) { mostrarToast(); return }
  router.push(`/entrega/${id}`)
}
function irACargar() { router.push('/app/inventario') }
function mostrarToast() {
  toast.value = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = false }, 3500)
}

function mapsUrl(stop) {
  if (!stop) return null
  if (stop.latitud != null && stop.longitud != null)
    return `https://www.google.com/maps/dir/?api=1&destination=${stop.latitud},${stop.longitud}`
  if (stop.direccion)
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.direccion)}`
  return null
}
function navegar(stop) { const u = mapsUrl(stop); if (u) window.open(u, '_blank') }

function pinIcon(num, esSiguiente) {
  const bg = esSiguiente ? '#E8972E' : '#0E5C4A'
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 2px;background:${bg};transform:rotate(45deg);box-shadow:0 6px 12px -4px rgba(0,0,0,.45);display:grid;place-items:center;"><span style="transform:rotate(-45deg);color:#fff;font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:12px;">${num}</span></div>`,
    iconSize: [28, 28], iconAnchor: [14, 28]
  })
}

function pintarMapa() {
  if (!mapRef.value) return
  if (!map) {
    map = L.map(mapRef.value, { zoomControl: false, attributionControl: false }).setView(CULIACAN, 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
  }
  if (capaPines) { capaPines.remove(); capaPines = null }
  const conGeo = pendientes.value.filter((p) => p.latitud != null && p.longitud != null)
  if (conGeo.length) {
    capaPines = L.layerGroup().addTo(map)
    const puntos = []
    conGeo.forEach((p) => {
      const idx = pendientes.value.indexOf(p) + 1
      const u = mapsUrl(p)
      const nav = u ? `<br><a href="${u}" target="_blank" rel="noopener" style="color:#0E5C4A;font-weight:700;text-decoration:none;">Navegar aqui &#8599;</a>` : ''
      L.marker([p.latitud, p.longitud], { icon: pinIcon(idx, idx === 1) })
        .bindPopup(`<b>${p.clienteNombre}</b><br>${money(p.total)}${nav}`)
        .addTo(capaPines)
      puntos.push([p.latitud, p.longitud])
    })
    map.fitBounds(puntos, { padding: [30, 30], maxZoom: 15 })
  } else {
    map.setView(CULIACAN, 12)
  }
  setTimeout(() => map && map.invalidateSize(), 200)
}

// ¿El repartidor tiene carga abierta? Tiene carga si el endpoint devuelve un objeto con id.
// Si da 404 (no hay carga) o vacío, no tiene.
async function verificarCarga() {
  try {
    const { data } = await http.get(`/cargas/repartidor/${auth.usuarioId}/abierta`)
    tieneCarga.value = !!(data && data.id)
  } catch {
    tieneCarga.value = false
  }
}

async function cargar() {
  cargando.value = true; error.value = ''
  try {
    await verificarCarga()
    const { data } = await http.get('/pedidos', { params: { estado: 'Abierto', repartidorId: auth.usuarioId, tamano: 50 } })
    pendientes.value = data.items
    if (pendientes.value.length) {
      try {
        const det = await http.get(`/pedidos/${pendientes.value[0].id}`)
        itemsSiguiente.value = det.data.lineas
      } catch { itemsSiguiente.value = [] }
      await nextTick()
      pintarMapa()
    }
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudo cargar la ruta.'
  } finally { cargando.value = false }
}
async function recargar(ev) { await cargar(); ev.target.complete() }

onIonViewWillEnter(cargar)
onUnmounted(() => { if (map) { map.remove(); map = null }; clearTimeout(toastTimer) })
</script>

<style scoped>
.rt { --background: var(--paper); }
.scroll { padding: 8px 18px 24px; }
.muted { color: var(--muted); text-align: center; margin-top: 24px; }
.err { color: var(--clay); text-align: center; margin-top: 16px; font-weight: 600; }

.head { display: flex; align-items: flex-start; justify-content: space-between; padding: 6px 2px 14px; }
.brand { display: flex; align-items: center; gap: 10px; }
.logo { width: 38px; height: 38px; border-radius: 12px; background: linear-gradient(150deg,var(--pine),var(--pine-deep)); display: grid; place-items: center; color: #fff; font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 20px; box-shadow: 0 6px 14px -6px rgba(14,92,74,.7); }
.hello { font-size: 13px; color: var(--muted); font-weight: 600; }
.hello b { display: block; color: var(--ink); font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 19px; letter-spacing: -.01em; margin-top: 1px; }
.avatar { width: 42px; height: 42px; border-radius: 14px; border: 1.5px solid var(--line); background: var(--amber-soft); display: grid; place-items: center; font-weight: 700; color: #B9781F; font-size: 15px; }

/* aviso sin carga */
.sincarga { display: flex; align-items: center; gap: 12px; background: var(--amber-soft); border: 1px solid #EAD9B8; border-radius: 18px; padding: 14px; margin-bottom: 14px; }
.sc-ic { width: 42px; height: 42px; border-radius: 12px; background: #fff; display: grid; place-items: center; flex: 0 0 auto; }
.sc-ic svg { width: 22px; height: 22px; stroke: var(--amber); fill: none; }
.sc-tx { flex: 1; min-width: 0; }
.sc-tx b { display: block; font-size: 14px; color: #6E500F; }
.sc-tx span { font-size: 12.5px; color: #8A6516; font-weight: 500; }
.sc-btn { flex: 0 0 auto; background: var(--amber); color: #fff; border: none; border-radius: 12px; padding: 11px 15px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13px; cursor: pointer; }

.eyebrow { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); margin: 4px 6px 10px; }

.hero { background: linear-gradient(155deg,var(--pine),var(--pine-deep)); border-radius: 26px; padding: 22px; color: #fff; position: relative; overflow: hidden; box-shadow: 0 20px 40px -22px rgba(10,63,51,.9); }
.hero::before { content: ""; position: absolute; inset: 0; background: radial-gradient(120px 120px at 88% 12%,rgba(232,151,46,.30),transparent 70%); }
.hero-top { display: flex; justify-content: space-between; align-items: center; position: relative; }
.hero-top .t { font-size: 13px; font-weight: 600; color: #BFE0D5; }
.hero-top .date { font-size: 12px; font-weight: 600; color: #9FC9BC; background: rgba(255,255,255,.10); padding: 5px 11px; border-radius: 999px; text-transform: capitalize; }
.count { font-family: "Bricolage Grotesque"; font-weight: 700; line-height: 1; margin: 12px 0 2px; position: relative; display: flex; align-items: baseline; gap: 8px; }
.count .big { font-size: 48px; letter-spacing: -.02em; }
.count .lbl { font-size: 13px; color: #BFE0D5; font-weight: 600; }
.track { display: flex; gap: 5px; margin: 16px 0 2px; position: relative; flex-wrap: wrap; }
.seg { height: 7px; border-radius: 6px; flex: 1; min-width: 18px; background: rgba(255,255,255,.16); }
.seg.next { background: var(--amber); }
.hero-stats { display: flex; gap: 10px; margin-top: 18px; position: relative; }
.stat { flex: 1; background: rgba(255,255,255,.09); border: 1px solid rgba(255,255,255,.12); border-radius: 16px; padding: 12px 13px; }
.stat .k { font-size: 11px; color: #A9D2C6; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; display: flex; align-items: center; gap: 5px; }
.stat .v { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 21px; margin-top: 5px; font-variant-numeric: tabular-nums; }
.stat .v small { font-size: 13px; color: #9FC9BC; font-weight: 600; }
.dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }

.next-card { background: var(--surface); border: 1px solid var(--line); border-radius: 24px; margin-top: 8px; box-shadow: var(--shadow); overflow: hidden; }
.mapwrap { position: relative; }
.map { height: 160px; width: 100%; background: #ECF2EC; }
.nogeo { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(236,242,236,.85); color: var(--muted); font-size: 12.5px; font-weight: 600; pointer-events: none; }
.next-body { padding: 15px 16px 16px; }
.stop-no { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--pine); background: var(--pine-tint); padding: 5px 10px; border-radius: 8px; display: inline-block; margin-bottom: 9px; }
.nb-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.cli { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 20px; letter-spacing: -.01em; line-height: 1.15; }
.addr { font-size: 13px; color: var(--muted); font-weight: 500; margin-top: 3px; display: flex; align-items: center; gap: 5px; }
.amount { text-align: right; flex: 0 0 auto; }
.amount .m { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 23px; letter-spacing: -.01em; font-variant-numeric: tabular-nums; }
.amount .c { font-size: 11px; font-weight: 700; letter-spacing: .04em; color: var(--sky); background: var(--sky-soft); padding: 3px 8px; border-radius: 7px; display: inline-block; margin-top: 4px; }
.items { display: flex; gap: 7px; flex-wrap: wrap; margin: 14px 0 16px; }
.chip { font-size: 12.5px; font-weight: 600; color: var(--ink-soft); background: var(--paper-2); border: 1px solid var(--line); padding: 6px 11px; border-radius: 10px; display: flex; align-items: center; gap: 6px; }
.chip .pkg { width: 15px; height: 15px; stroke: var(--ink-soft); fill: none; flex: 0 0 auto; }
.chip b { color: var(--ink); font-variant-numeric: tabular-nums; }
.chip.more { color: var(--muted); background: transparent; }
.cta { display: flex; align-items: center; justify-content: center; gap: 9px; width: 100%; background: var(--ink); color: #fff; border: none; border-radius: 15px; padding: 15px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15.5px; cursor: pointer; box-shadow: 0 12px 22px -12px rgba(21,42,36,.7); }
.cta.lock { background: #9AA6A0; box-shadow: none; }
.acts { display: flex; gap: 10px; }
.acts .cta { flex: 1; }
.navbtn { flex: 0 0 auto; width: 54px; border: 1px solid var(--line); background: var(--surface); border-radius: 15px; display: grid; place-items: center; cursor: pointer; }
.navbtn:disabled { opacity: .4; }
.navbtn svg { width: 22px; height: 22px; fill: none; stroke: var(--pine); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.cta .arrow { transition: transform .2s; }
.cta:hover .arrow { transform: translateX(3px); }

.list-head { display: flex; align-items: center; justify-content: space-between; margin: 24px 6px 12px; }
.list-head .h { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 17px; letter-spacing: -.01em; }
.list-head .h span { color: var(--muted); font-weight: 600; }
.stop { display: flex; align-items: center; gap: 13px; background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 13px 14px; margin-bottom: 10px; box-shadow: var(--shadow); cursor: pointer; }
.stop.lock { opacity: .6; }
.stop .idx { width: 38px; height: 38px; flex: 0 0 auto; border-radius: 12px; background: var(--paper-2); display: grid; place-items: center; font-family: "Bricolage Grotesque"; font-weight: 700; color: var(--ink-soft); font-size: 15px; }
.stop .info { flex: 1; min-width: 0; }
.stop .info .n { font-weight: 700; font-size: 15px; letter-spacing: -.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stop .info .meta { font-size: 12.5px; color: var(--muted); font-weight: 500; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stop .right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex: 0 0 auto; }
.stop .right .mm { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15.5px; font-variant-numeric: tabular-nums; }

.empty { text-align: center; padding: 50px 20px; }
.empty .ico { width: 64px; height: 64px; border-radius: 18px; margin: 0 auto 16px; display: grid; place-items: center; background: var(--pine-tint); }
.empty .ico svg { width: 30px; height: 30px; stroke: var(--pine); fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.empty .et { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; }
.empty .es { color: var(--muted); font-size: 13.5px; margin-top: 6px; }
.head-r { display: flex; align-items: center; gap: 10px; }

/* toast */
.toast { position: fixed; left: 16px; right: 16px; bottom: calc(16px + env(safe-area-inset-bottom)); background: var(--ink); color: #fff; border-radius: 15px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; box-shadow: 0 16px 32px -12px rgba(0,0,0,.5); transform: translateY(140%); transition: transform .32s cubic-bezier(.2,.9,.3,1.2); z-index: 9999; }
.toast.show { transform: translateY(0); }
.toast svg { width: 22px; height: 22px; stroke: var(--amber); fill: none; flex: 0 0 auto; }
.toast-tx { flex: 1; font-size: 13.5px; font-weight: 600; line-height: 1.35; }
.toast-go { flex: 0 0 auto; background: var(--amber); color: #3a2607; border: none; border-radius: 10px; padding: 9px 14px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13px; cursor: pointer; }
</style>
