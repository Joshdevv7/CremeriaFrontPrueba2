<template>
  <div>
    <div class="filtros">
      <select class="inp sel" v-model="repartidorId" @change="cargar">
        <option :value="null" disabled>Repartidor</option>
        <option v-for="r in repartidores" :key="r.id" :value="r.id">{{ r.nombre }}</option>
      </select>
      <input class="inp" type="date" v-model="fecha" @change="cargar">
    </div>

    <div class="cols">
      <div class="mapwrap">
        <div ref="mapRef" class="map"></div>
        <div v-if="!cargando && !paradas.length && !traza.length" class="nogeo">{{ repartidorId ? 'Sin recorrido ni entregas ese día' : 'Elige un repartidor' }}</div>
        <div class="leyenda"><span><i class="ln"></i> Recorrido</span><span><i class="pn"></i> Entregas</span></div>
      </div>
      <div class="lista">
        <div class="resumen" v-if="paradas.length"><span><b>{{ paradas.length }}</b> paradas</span><span><b>{{ money(totalDia) }}</b> entregado</span></div>
        <div v-for="(p, i) in paradas" :key="p.id" class="stop">
          <div class="idx">{{ i + 1 }}</div>
          <div class="info"><div class="n">{{ p.clienteNombre }}</div><div class="meta">{{ hora(p.fechaEntrega) }} · {{ estadoTxt(p.estado) }}</div></div>
          <div class="total">{{ money(p.total) }}</div>
        </div>
        <p v-if="error" class="err">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import http from '@/api/http'

const emit = defineEmits(['ctx'])
const repartidores = ref([])
const repartidorId = ref(null)
const fecha = ref(new Date().toISOString().slice(0, 10))
const paradas = ref([])
const traza = ref([])
const cargando = ref(false)
const error = ref('')
const mapRef = ref(null)
let map = null, capa = null
const CULIACAN = [24.8091, -107.394]
const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const hora = (f) => f ? new Date(f).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' }) : ''
const estadoTxt = (e) => ({ CerradoCompleto: 'Completa', CerradoParcial: 'Parcial', CerradoNoEntregado: 'No entregado' }[e] || e)
const totalDia = computed(() => paradas.value.reduce((s, p) => s + p.total, 0))

function pin(num) {
  return L.divIcon({ className: '', html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 2px;background:#0E5C4A;transform:rotate(45deg);box-shadow:0 6px 12px -4px rgba(0,0,0,.45);display:grid;place-items:center;"><span style="transform:rotate(-45deg);color:#fff;font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:12px;">${num}</span></div>`, iconSize: [28, 28], iconAnchor: [14, 28] })
}
function initMapa() {
  if (!mapRef.value || map) return
  map = L.map(mapRef.value, { zoomControl: true, attributionControl: false }).setView(CULIACAN, 12)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
  setTimeout(() => map && map.invalidateSize(), 250)
}
function pintar() {
  if (!map) return
  if (capa) { capa.remove(); capa = null }
  capa = L.layerGroup().addTo(map)
  const bounds = []
  // 1) traza continua del recorrido (lo que manejó)
  if (traza.value.length > 1) {
    const linea = traza.value.map((t) => [t.latitud, t.longitud])
    L.polyline(linea, { color: '#0E5C4A', weight: 4, opacity: .75 }).addTo(capa)
    linea.forEach((ll) => bounds.push(ll))
  }
  // 2) pines de entrega encima
  paradas.value.forEach((p, i) => {
    const ll = [p.latitudEntrega, p.longitudEntrega]
    L.marker(ll, { icon: pin(i + 1) }).bindPopup(`<b>${p.clienteNombre}</b><br>${hora(p.fechaEntrega)} · ${money(p.total)}`).addTo(capa)
    bounds.push(ll)
  })
  if (bounds.length) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
  else map.setView(CULIACAN, 12)
  setTimeout(() => map && map.invalidateSize(), 150)
}
async function cargar() {
  if (!repartidorId.value) { paradas.value = []; pintar(); return }
  cargando.value = true; error.value = ''
  try {
    const [ped, rec] = await Promise.all([
      http.get('/pedidos', { params: { repartidorId: repartidorId.value, tamano: 100 } }),
      http.get('/recorridos', { params: { repartidorId: repartidorId.value, fecha: fecha.value } })
    ])
    paradas.value = ped.data.items.filter((p) => p.latitudEntrega != null && p.longitudEntrega != null && p.fechaEntrega && new Date(p.fechaEntrega).toISOString().slice(0, 10) === fecha.value).sort((a, b) => new Date(a.fechaEntrega) - new Date(b.fechaEntrega))
    traza.value = rec.data || []
    await nextTick(); pintar()
  } catch (e) { error.value = e.response?.data?.mensaje || 'No se pudo cargar el historial.' }
  finally { cargando.value = false }
}
onMounted(async () => {
  emit('ctx', { titulo: 'Recorridos', sub: 'La línea es por dónde anduvo; los pines, dónde entregó', back: null })
  try { const r = await http.get('/usuarios/repartidores'); repartidores.value = r.data } catch { repartidores.value = [] }
  await nextTick(); initMapa(); cargar()
})
onUnmounted(() => { if (map) { map.remove(); map = null } })
</script>

<style scoped>
.filtros { display: flex; gap: 10px; margin-bottom: 14px; max-width: 480px; }
.inp { flex: 1; border: 1px solid var(--line); background: var(--surface); border-radius: 12px; padding: 11px 13px; font-family: "Hanken Grotesk"; font-size: 14.5px; font-weight: 600; color: var(--ink); box-shadow: var(--shadow); }
.sel { appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%237C8A82' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; }
.cols { display: grid; grid-template-columns: 1.6fr 1fr; gap: 16px; }
.mapwrap { position: relative; border-radius: 18px; overflow: hidden; border: 1px solid var(--line); box-shadow: var(--shadow); }
.map { height: 420px; width: 100%; background: #ECF2EC; }
.leyenda { position: absolute; left: 12px; bottom: 12px; display: flex; gap: 14px; background: rgba(255,253,248,.92); border: 1px solid var(--line); border-radius: 10px; padding: 7px 11px; font-size: 11.5px; font-weight: 600; color: var(--ink-soft); backdrop-filter: blur(6px); }
.leyenda span { display: flex; align-items: center; gap: 6px; }
.leyenda .ln { width: 16px; height: 3px; border-radius: 2px; background: #0E5C4A; display: inline-block; }
.leyenda .pn { width: 11px; height: 11px; border-radius: 50% 50% 50% 2px; background: #0E5C4A; transform: rotate(45deg); display: inline-block; }
.nogeo { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(236,242,236,.85); color: var(--muted); font-size: 13px; font-weight: 600; pointer-events: none; text-align: center; padding: 20px; }
.lista { } .err { color: var(--clay); font-weight: 600; }
.resumen { display: flex; justify-content: space-between; font-size: 13px; color: var(--muted); font-weight: 600; margin-bottom: 12px; }
.resumen b { font-family: "Bricolage Grotesque"; color: var(--ink); font-size: 16px; }
.stop { display: flex; align-items: center; gap: 13px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 12px 14px; margin-bottom: 9px; box-shadow: var(--shadow); }
.stop .idx { width: 30px; height: 30px; flex: 0 0 auto; border-radius: 50%; background: var(--pine); color: #fff; display: grid; place-items: center; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13px; }
.stop .info { flex: 1; min-width: 0; }
.stop .info .n { font-weight: 700; font-size: 14.5px; }
.stop .info .meta { font-size: 12px; color: var(--muted); font-weight: 500; margin-top: 2px; }
.stop .total { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; font-variant-numeric: tabular-nums; }
@media (max-width: 900px) { .cols { grid-template-columns: 1fr; } .map { height: 300px; } }
</style>
