<template>
  <div class="editor">

    <div class="form" v-show="!exito && !cargando">
      <div class="col">
        <div class="field"><div class="fl">Nombre del cliente *</div><input class="inp" v-model="form.nombre" placeholder="Ej. Abarrotes La Bendición"></div>
        <div class="field"><div class="fl">Teléfono</div><input class="inp" v-model="form.telefono" placeholder="Ej. 667 123 4567" inputmode="tel" maxlength="15" @input="filtrarTel"></div>
        <div class="field"><div class="fl">Dirección</div><input class="inp" v-model="form.direccion" placeholder="Calle, número, colonia"></div>
        <div class="field"><div class="fl">Repartidor asignado</div>
          <select class="inp sel" v-model="form.repartidorId"><option :value="null">Sin asignar</option><option v-for="r in repartidores" :key="r.id" :value="r.id">{{ r.nombre }}</option></select>
        </div>
      </div>
      <div class="col">
        <div class="mapcard">
          <div ref="mapRef" class="map"></div>
          <div class="maptools">
            <button class="gps" @click="usarMiUbicacion" :disabled="gpsCargando"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>{{ gpsCargando ? 'Localizando…' : 'Usar mi ubicación actual' }}</button>
            <span class="hint">o toca el mapa para colocar el pin</span>
          </div>
        </div>
        <div class="coords">
          <div class="cfield"><div class="fl">Latitud</div><input class="inp" v-model.number="form.latitud" type="number" step="any" placeholder="—" @change="desdeManual"></div>
          <div class="cfield"><div class="fl">Longitud</div><input class="inp" v-model.number="form.longitud" type="number" step="any" placeholder="—" @change="desdeManual"></div>
        </div>
        <p class="geohint" v-if="form.latitud == null">Sin ubicación: el cliente no aparecerá en el mapa de ruta hasta capturarla.</p>
      </div>
    </div>

    <p v-if="error" class="err">{{ error }}</p>
    <div class="guardar-bar" v-show="!exito && !cargando">
      <button class="cta" :disabled="enviando || !form.nombre.trim()" @click="guardar()">{{ enviando ? 'Guardando…' : (esNuevo ? 'Crear cliente' : 'Guardar cambios') }}</button>
      <button v-if="!esNuevo" class="trash" @click="desactivar()">Desactivar</button>
    </div>

    <ExitoOverlay :show="exito" :titulo="exitoTit" :subtitulo="exitoSub" :detalle="exitoDet" cta-texto="Ver clientes" @done="salir" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import http from '@/api/http'
import ExitoOverlay from '@/components/ExitoOverlay.vue'

const emit = defineEmits(['ctx'])
const route = useRoute()
const router = useRouter()
const esNuevo = computed(() => route.params.id === 'nuevo')
const form = reactive({ nombre: '', telefono: '', direccion: '', repartidorId: null, latitud: null, longitud: null })
const repartidores = ref([])
const cargando = ref(true)
const enviando = ref(false)
const gpsCargando = ref(false)
const error = ref('')
const mapRef = ref(null)
let map = null, marker = null
const exito = ref(false), exitoTit = ref(''), exitoSub = ref(''), exitoDet = ref([])
const CULIACAN = [24.8091, -107.394]

function pin() { return L.divIcon({ className: '', html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 2px;background:#0E5C4A;transform:rotate(45deg);box-shadow:0 8px 14px -6px rgba(10,63,51,.8);"></div>`, iconSize: [30, 30], iconAnchor: [15, 30] }) }
function ponerMarker(lat, lng, centrar) {
  form.latitud = Number(lat.toFixed(6)); form.longitud = Number(lng.toFixed(6))
  if (!map) return
  if (!marker) { marker = L.marker([lat, lng], { icon: pin(), draggable: true }).addTo(map); marker.on('dragend', () => { const p = marker.getLatLng(); form.latitud = Number(p.lat.toFixed(6)); form.longitud = Number(p.lng.toFixed(6)) }) }
  else marker.setLatLng([lat, lng])
  if (centrar) map.setView([lat, lng], Math.max(map.getZoom(), 15))
}
function initMapa() {
  if (!mapRef.value || map) return
  const centro = (form.latitud != null && form.longitud != null) ? [form.latitud, form.longitud] : CULIACAN
  map = L.map(mapRef.value, { zoomControl: true, attributionControl: false }).setView(centro, form.latitud != null ? 15 : 12)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
  if (form.latitud != null) ponerMarker(form.latitud, form.longitud, false)
  map.on('click', (e) => ponerMarker(e.latlng.lat, e.latlng.lng, false))
  setTimeout(() => map && map.invalidateSize(), 250)
}
function desdeManual() { if (form.latitud != null && form.longitud != null) ponerMarker(Number(form.latitud), Number(form.longitud), true) }
function usarMiUbicacion() {
  if (!navigator.geolocation) { error.value = 'Este dispositivo no permite geolocalización.'; return }
  gpsCargando.value = true; error.value = ''
  navigator.geolocation.getCurrentPosition((pos) => { ponerMarker(pos.coords.latitude, pos.coords.longitude, true); gpsCargando.value = false }, (err) => { error.value = err.code === 1 ? 'Permiso de ubicación denegado.' : 'No se pudo obtener la ubicación.'; gpsCargando.value = false }, { enableHighAccuracy: true, timeout: 10000 })
}
function filtrarTel() { form.telefono = (form.telefono || '').replace(/[^\d ]/g, '').slice(0, 15) }
function salir() { router.replace('/panel/clientes') }

async function guardar() {
  if (!form.nombre.trim()) return
  enviando.value = true; error.value = ''
  const payload = { nombre: form.nombre.trim(), telefono: form.telefono?.trim() || null, direccion: form.direccion?.trim() || null, latitud: form.latitud, longitud: form.longitud, repartidorId: form.repartidorId || null }
  try {
    if (esNuevo.value) await http.post('/clientes', payload)
    else await http.put(`/clientes/${route.params.id}`, { ...payload, activo: true })
    const rep = repartidores.value.find((r) => r.id === form.repartidorId)
    exitoTit.value = esNuevo.value ? 'Cliente creado' : 'Cliente actualizado'
    exitoSub.value = form.nombre
    exitoDet.value = [{ k: 'Repartidor', v: rep?.nombre || 'Sin asignar' }, { k: 'Ubicación', v: form.latitud != null ? 'Capturada' : 'Pendiente' }]
    exito.value = true
  } catch (e) { error.value = e.response?.data?.mensaje || 'No se pudo guardar el cliente.' }
  finally { enviando.value = false }
}
async function desactivar() { if (!confirm('¿Desactivar este cliente?')) return; try { await http.delete(`/clientes/${route.params.id}`); salir() } catch (e) { error.value = e.response?.data?.mensaje || 'No se pudo desactivar.' } }

onMounted(async () => {
  emit('ctx', { titulo: esNuevo.value ? 'Nuevo cliente' : 'Editar cliente', sub: '', back: '/panel/clientes' })
  try { const reps = await http.get('/usuarios/repartidores'); repartidores.value = reps.data } catch { repartidores.value = [] }
  if (!esNuevo.value) {
    try { const { data } = await http.get(`/clientes/${route.params.id}`); Object.assign(form, { nombre: data.nombre, telefono: data.telefono || '', direccion: data.direccion || '', repartidorId: data.repartidorId || null, latitud: data.latitud, longitud: data.longitud }) }
    catch { error.value = 'No se pudo cargar el cliente.' }
  }
  cargando.value = false
  await nextTick(); initMapa()
})
onUnmounted(() => { if (map) { map.remove(); map = null } })
</script>

<style scoped>
.err { color: var(--clay); font-size: 13px; font-weight: 600; margin: 12px 2px; }
.form { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
.col { display: flex; flex-direction: column; gap: 11px; }
.field { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px; box-shadow: var(--shadow); }
.fl { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 9px; }
.inp { width: 100%; border: 1px solid var(--line); background: var(--paper); border-radius: 11px; padding: 12px 13px; font-family: "Hanken Grotesk"; font-size: 15px; font-weight: 600; color: var(--ink); }
.sel { appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%237C8A82' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; }
.mapcard { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; overflow: hidden; box-shadow: var(--shadow); }
.map { height: 280px; width: 100%; background: #ECF2EC; }
.maptools { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.gps { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; background: var(--pine-tint); color: var(--pine); border: 1px solid #C8E0D6; border-radius: 12px; padding: 12px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; }
.gps:disabled { opacity: .6; }
.gps svg { width: 17px; height: 17px; stroke: var(--pine); fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.hint { text-align: center; font-size: 12px; color: var(--muted); font-weight: 500; }
.coords { display: flex; gap: 10px; margin-top: 11px; }
.cfield { flex: 1; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px; box-shadow: var(--shadow); }
.geohint { font-size: 12px; color: var(--muted); font-weight: 500; margin: 10px 2px 0; }
.guardar-bar { margin-top: 18px; max-width: 360px; display: flex; gap: 10px; }
.guardar-bar .cta { flex: 1; }
.trash { border: 1px solid var(--clay-soft); background: var(--clay-soft); color: var(--clay); border-radius: 14px; padding: 15px 18px; font-family: 'Bricolage Grotesque'; font-weight: 700; cursor: pointer; }
.cta { width: 100%; background: var(--pine); color: #fff; border: none; border-radius: 14px; padding: 15px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; cursor: pointer; box-shadow: 0 12px 22px -12px rgba(14,92,74,.8); }
.cta:disabled { opacity: .5; }

@media (max-width: 860px) { .form { grid-template-columns: 1fr; } }
</style>
