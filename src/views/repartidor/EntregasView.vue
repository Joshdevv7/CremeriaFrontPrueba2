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

        <!-- HERO: ESTADÍSTICAS Y AVANCE DE LA JORNADA -->
        <div class="hero">
          <div class="hero-top">
            <span class="t">Ruta de hoy</span>
            <span class="date">{{ hoy }}</span>
          </div>
          <div class="count">
            <span class="big">{{ pendientes.length }}</span>
            <span class="lbl">{{ pendientes.length === 1 ? 'parada por entregar' : 'paradas por entregar' }}</span>
          </div>
          <div class="track" v-if="totalTurno > 0">
            <div class="track-bar">
              <div class="track-fill" :style="{ width: pctProgreso + '%' }"></div>
            </div>
          </div>
          <div class="hero-stats">
            <div class="stat">
              <span class="k"><span class="dot" style="background:var(--amber)"></span>Por entregar</span>
              <div class="v">{{ money(totalRuta) }}</div>
            </div>
            <div class="stat">
              <span class="k"><span class="dot" style="background:var(--pine)"></span>Avance</span>
              <div class="v">{{ entregadasHoy }}<small> / {{ totalTurno }} entregadas</small></div>
            </div>
            <div class="stat">
              <span class="k"><span class="dot" style="background:#7FD3BD"></span>Con ubicación</span>
              <div class="v">{{ conCoords }}<small> / {{ pendientes.length }}</small></div>
            </div>
          </div>
        </div>

        <!-- BUSCADOR DE PARADAS EN RUTA -->
        <div class="search-wrap" v-if="pendientes.length > 2">
          <svg class="s-ic" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
          <input v-model="buscar" placeholder="Buscar cliente o dirección en ruta…" />
          <button v-if="buscar" class="clear-b" @click="buscar = ''">✕</button>
        </div>

        <template v-if="pendientes.length">
          <!-- SIGUIENTE PARADA DESTACADA (si no hay filtro activo o coincide) -->
          <template v-if="!buscar && siguiente.id">
            <div class="eyebrow" style="margin-top:20px">Siguiente parada</div>
            <div class="next-card">
              <div class="mapwrap">
                <div ref="mapRef" class="map"></div>
                <div v-if="conCoords === 0" class="nogeo">Aún sin ubicaciones · captúralas en clientes</div>
              </div>
              <div class="next-body">
                <div class="nb-header">
                  <span class="stop-no">Parada 01</span>
                  <!-- Botones directos de contacto -->
                  <div class="direct-acts" v-if="siguiente.clienteTelefono">
                    <a :href="`tel:${siguiente.clienteTelefono}`" class="circ-btn call" title="Llamar al cliente" @click.stop>
                      <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </a>
                    <a :href="whatsappUrl(siguiente)" target="_blank" class="circ-btn wa" title="Enviar WhatsApp" @click.stop>
                      <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.4A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.2 1.1-1.7 1.2-.5.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1-1.4-1-2.6 0-1.2.6-1.8.9-2 .2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2 0 .4-.1.5l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.2.1.4.1.5-.1l.7-.8c.2-.2.4-.2.6-.1l1.8.9c.2.1.4.2.4.3.1.1.1.5-.1 1Z"/></svg>
                    </a>
                  </div>
                </div>

                <div class="nb-top">
                  <div>
                    <div class="cli">{{ siguiente.clienteNombre }}</div>
                    <div class="addr">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7C8A82" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                      {{ siguiente.direccion || 'Sin dirección registrada' }}
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
          </template>

          <!-- LISTA DE PARADAS (Filtradas o Restantes) -->
          <div class="list-head" v-if="listaMostrar.length">
            <div class="h">{{ buscar ? 'Resultados' : 'Pendientes' }} <span>· {{ listaMostrar.length }}</span></div>
          </div>
          <div v-for="(p, i) in listaMostrar" :key="p.id" class="stop" :class="{ lock: !tieneCarga }" @click="iniciar(p.id)">
            <div class="idx">{{ String(buscar ? (i + 1) : (i + 2)).padStart(2, '0') }}</div>
            <div class="info">
              <div class="n">{{ p.clienteNombre }}</div>
              <div class="meta">{{ p.direccion || 'Sin dirección' }}</div>
            </div>
            <div class="right">
              <div class="mm">{{ money(p.total) }}</div>
              <!-- Acciones rápidas de contacto en fila -->
              <div class="row-acts" v-if="p.clienteTelefono">
                <a :href="`tel:${p.clienteTelefono}`" class="mini-act call" title="Llamar" @click.stop>
                  <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </a>
                <a :href="whatsappUrl(p)" target="_blank" class="mini-act wa" title="WhatsApp" @click.stop>
                  <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.4A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.2 1.1-1.7 1.2-.5.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1-1.4-1-2.6 0-1.2.6-1.8.9-2 .2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2 0 .4-.1.5l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.2.1.4.1.5-.1l.7-.8c.2-.2.4-.2.6-.1l1.8.9c.2.1.4.2.4.3.1.1.1.5-.1 1Z"/></svg>
                </a>
                <button class="mini-act nav" @click.stop="navegar(p)" :disabled="!mapsUrl(p)" title="Navegar">
                  <svg viewBox="0 0 24 24"><path d="M3 11l19-9-9 19-2-8-8-2Z"/></svg>
                </button>
              </div>
            </div>
          </div>
        </template>

        <div v-else-if="!cargando" class="empty">
          <div class="ico"><svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg></div>
          <div class="et">¡Ruta completada!</div>
          <div class="es">No hay más pedidos abiertos pendientes de entrega.</div>
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
const tieneCarga = ref(true)
const toast = ref(false)
const buscar = ref('')
const entregadasHoy = ref(0)
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
const totalTurno = computed(() => entregadasHoy.value + pendientes.value.length)
const pctProgreso = computed(() => totalTurno.value > 0 ? Math.round((entregadasHoy.value / totalTurno.value) * 100) : 0)

const listaMostrar = computed(() => {
  const q = buscar.value.trim().toLowerCase()
  if (!q) return resto.value
  return pendientes.value.filter(p =>
    (p.clienteNombre || '').toLowerCase().includes(q) ||
    (p.direccion || '').toLowerCase().includes(q)
  )
})

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

function whatsappUrl(stop) {
  const tel = (stop.clienteTelefono || '').replace(/\D/g, '')
  if (!tel) return '#'
  const num = tel.length === 10 ? '52' + tel : tel
  const msg = encodeURIComponent(`Hola ${stop.clienteNombre}, le saludamos de Distribuidora. Vamos en camino con su pedido #${stop.id} por un total de ${money(stop.total)}. ¿Se encuentra disponible para recibirlo?`)
  return `https://wa.me/${num}?text=${msg}`
}

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
      const nav = u ? `<br><a href="${u}" target="_blank" rel="noopener" style="color:#0E5C4A;font-weight:700;text-decoration:none;">Navegar aquí &#8599;</a>` : ''
      const tel = p.clienteTelefono ? `<br><a href="tel:${p.clienteTelefono}" style="color:#2E6F8E;font-weight:700;text-decoration:none;">📞 Llamar al cliente</a>` : ''
      L.marker([p.latitud, p.longitud], { icon: pinIcon(idx, idx === 1) })
        .bindPopup(`<b>${p.clienteNombre}</b><br>${money(p.total)}${nav}${tel}`)
        .addTo(capaPines)
      puntos.push([p.latitud, p.longitud])
    })
    map.fitBounds(puntos, { padding: [30, 30], maxZoom: 15 })
  } else {
    map.setView(CULIACAN, 12)
  }
  setTimeout(() => map && map.invalidateSize(), 200)
}

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
    const hoyISO = new Date().toISOString().slice(0, 10)
    const [pedidosResp, hoyResp] = await Promise.all([
      http.get('/pedidos', { params: { estado: 'Abierto', repartidorId: auth.usuarioId, tamano: 50 } }),
      http.get('/pedidos', { params: { repartidorId: auth.usuarioId, desde: hoyISO, tamano: 100 } })
    ])
    pendientes.value = pedidosResp.data.items || []
    
    // Contar entregadas hoy
    const cerrados = (hoyResp.data.items || []).filter(p => p.estado === 'CerradoCompleto' || p.estado === 'CerradoParcial')
    entregadasHoy.value = cerrados.length

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
.sc-ic { width: 40px; height: 40px; border-radius: 12px; background: #fff; display: grid; place-items: center; flex: 0 0 auto; color: var(--amber); }
.sc-ic svg { width: 22px; height: 22px; }
.sc-tx { flex: 1; font-size: 13px; }
.sc-tx b { display: block; color: #5A3F0B; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14.5px; }
.sc-tx span { color: #8A641B; font-size: 12px; font-weight: 500; }
.sc-btn { flex: 0 0 auto; background: #B9781F; color: #fff; border: none; border-radius: 11px; padding: 9px 13px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12.5px; cursor: pointer; }

/* hero */
.hero { background: var(--surface); border: 1px solid var(--line); border-radius: 20px; padding: 18px; box-shadow: var(--shadow); position: relative; }
.hero-top { display: flex; align-items: center; justify-content: space-between; }
.hero-top .t { font-size: 12.5px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
.hero-top .date { font-size: 12px; color: var(--muted); font-weight: 600; text-transform: capitalize; }
.count { display: flex; align-items: baseline; gap: 10px; margin: 10px 0 12px; }
.count .big { font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 42px; letter-spacing: -.03em; color: var(--ink); line-height: 1; }
.count .lbl { font-size: 14px; color: var(--muted); font-weight: 600; }

.track-bar { height: 7px; border-radius: 5px; background: var(--paper-2); overflow: hidden; margin-bottom: 12px; }
.track-fill { height: 100%; border-radius: 5px; background: linear-gradient(90deg, var(--pine), #2E6F8E); transition: width 0.4s ease; }

.hero-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding-top: 12px; border-top: 1px solid var(--line); }
.stat .k { font-size: 11px; font-weight: 700; color: var(--muted); display: flex; align-items: center; gap: 5px; }
.stat .dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
.stat .v { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 16px; margin-top: 3px; font-variant-numeric: tabular-nums; }
.stat .v small { font-size: 11px; color: var(--muted); font-weight: 600; }

/* Buscador */
.search-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 10px 14px;
  margin-top: 16px;
  box-shadow: var(--shadow);
}
.search-wrap .s-ic { width: 17px; height: 17px; stroke: var(--muted); fill: none; stroke-width: 2.2; flex: 0 0 auto; }
.search-wrap input { border: none; background: transparent; font-family: "Hanken Grotesk"; font-size: 13.5px; font-weight: 600; color: var(--ink); flex: 1; outline: none; }
.clear-b { border: none; background: var(--paper-2); border-radius: 50%; width: 22px; height: 22px; display: grid; place-items: center; font-size: 11px; color: var(--muted); cursor: pointer; }

/* siguiente parada */
.eyebrow { font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 10px; }
.next-card { background: var(--surface); border: 1px solid var(--line); border-radius: 20px; overflow: hidden; box-shadow: var(--shadow); }
.mapwrap { height: 160px; position: relative; background: #e5ece8; }
.map { width: 100%; height: 100%; }
.nogeo { position: absolute; inset: 0; display: grid; place-content: center; background: rgba(255,253,248,.88); color: var(--muted); font-size: 12.5px; font-weight: 600; text-align: center; padding: 14px; }
.next-body { padding: 16px; }
.nb-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.stop-no { display: inline-block; font-family: "Bricolage Grotesque"; font-size: 11px; font-weight: 800; color: var(--amber); background: var(--amber-soft); padding: 3px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: .05em; }

.direct-acts { display: flex; align-items: center; gap: 8px; }
.circ-btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  cursor: pointer;
  text-decoration: none;
  transition: transform 0.15s;
}
.circ-btn:hover { transform: scale(1.05); }
.circ-btn.call { background: var(--sky-soft); color: var(--sky); border-color: #BDE0EA; }
.circ-btn.call svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2.2; }
.circ-btn.wa { background: #E4F7EB; color: #1AA75A; border-color: #BCE7CC; }
.circ-btn.wa svg { width: 16px; height: 16px; fill: currentColor; }
.circ-btn.nav { background: var(--pine-tint); color: var(--pine); border-color: #B2D8CE; }
.circ-btn.nav svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2.2; }

.nb-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.cli { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 17px; letter-spacing: -.01em; color: var(--ink); }
.addr { display: flex; align-items: center; gap: 5px; font-size: 12.5px; color: var(--muted); margin-top: 3px; font-weight: 500; }
.amount { text-align: right; flex: 0 0 auto; }
.amount .m { font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 18px; color: var(--ink); font-variant-numeric: tabular-nums; }
.amount .c { display: block; font-size: 11px; font-weight: 700; color: var(--amber); }

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

.stop { display: flex; align-items: center; gap: 13px; background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 13px 14px; margin-bottom: 10px; box-shadow: var(--shadow); cursor: pointer; transition: transform 0.15s; }
.stop:hover { transform: translateY(-1px); }
.stop.lock { opacity: .6; }
.stop .idx { width: 38px; height: 38px; flex: 0 0 auto; border-radius: 12px; background: var(--paper-2); display: grid; place-items: center; font-family: "Bricolage Grotesque"; font-weight: 700; color: var(--ink-soft); font-size: 15px; }
.stop .info { flex: 1; min-width: 0; }
.stop .info .n { font-weight: 700; font-size: 15px; letter-spacing: -.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stop .info .meta { font-size: 12.5px; color: var(--muted); font-weight: 500; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stop .right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex: 0 0 auto; }
.stop .right .mm { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15.5px; font-variant-numeric: tabular-nums; }

.row-acts { display: flex; align-items: center; gap: 6px; }
.mini-act {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  cursor: pointer;
  text-decoration: none;
}
.mini-act.call { background: var(--sky-soft); color: var(--sky); border-color: #BDE0EA; }
.mini-act.call svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 2.2; }
.mini-act.wa { background: #E4F7EB; color: #1AA75A; border-color: #BCE7CC; }
.mini-act.wa svg { width: 13px; height: 13px; fill: currentColor; }
.mini-act.nav { background: var(--pine-tint); color: var(--pine); border-color: #B2D8CE; }
.mini-act.nav svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 2.2; }

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
