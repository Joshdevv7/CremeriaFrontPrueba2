<template>
  <div class="historial-wrap">
    <!-- Barra superior de filtros y selección -->
    <div class="top-bar">
      <div class="filtros">
        <select class="inp sel" v-model="repartidorId" @change="cambiarFiltro">
          <option :value="null" disabled>Seleccionar repartidor…</option>
          <option v-for="r in repartidores" :key="r.id" :value="r.id">{{ r.nombre }}</option>
        </select>
        <div class="date-group">
          <button class="btn-d" @click="moverDia(-1)" title="Día anterior">‹</button>
          <input class="inp date-inp" type="date" v-model="fecha" @change="cambiarFiltro">
          <button class="btn-d" @click="moverDia(1)" title="Día siguiente">›</button>
          <button class="btn-hoy" :class="{ act: esHoy }" @click="irAHoy">Hoy</button>
        </div>
      </div>
    </div>

    <!-- Métricas KPI de la jornada -->
    <div class="kpis" v-if="repartidorId">
      <div class="kpi-card">
        <div class="kpi-l">Entregas realizadas</div>
        <div class="kpi-v">{{ paradas.length }}</div>
        <div class="kpi-s">{{ paradas.length === 1 ? '1 parada registrada' : `${paradas.length} paradas registradas` }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-l">Monto total entregado</div>
        <div class="kpi-v money">{{ money(totalDia) }}</div>
        <div class="kpi-s">{{ promedioParada ? `Promedio: ${money(promedioParada)} / entrega` : 'Sin entregas' }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-l">Horario de entregas</div>
        <div class="kpi-v text">{{ horaPrimera ? `${horaPrimera} - ${horaUltima}` : '—' }}</div>
        <div class="kpi-s">{{ duracionJornada ? `Tiempo activo: ${duracionJornada}` : 'Pendiente de inicio' }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-l">Rastreo GPS</div>
        <div class="kpi-v text">
          <span class="status-dot" :class="traza.length > 1 ? 'ok' : (paradas.length ? 'warn' : 'off')"></span>
          {{ traza.length > 1 ? 'Traza continua' : (paradas.length ? 'Por secuencia' : 'Sin puntos') }}
        </div>
        <div class="kpi-s">{{ traza.length > 1 ? `${traza.length} posiciones GPS` : (paradas.length ? 'Línea secuencial entre entregas' : 'Sin actividad') }}</div>
      </div>
    </div>

    <!-- Contenedor principal: Mapa y Lista de Paradas -->
    <div class="cols">
      <div class="mapwrap">
        <div ref="mapRef" class="map"></div>
        <div v-if="!cargando && !repartidorId" class="nogeo">
          <div class="empty-box">
            <span class="ico">🚚</span>
            <div class="et">Selecciona un repartidor</div>
            <div class="es">Elige a un miembro del equipo para ver su recorrido y entregas del día seleccionado.</div>
          </div>
        </div>
        <div v-else-if="!cargando && !paradas.length && !traza.length" class="nogeo">
          <div class="empty-box">
            <span class="ico">📍</span>
            <div class="et">Sin recorrido ni entregas</div>
            <div class="es">No se registraron posiciones GPS ni entregas con ubicación en esta fecha.</div>
          </div>
        </div>
        <div v-if="cargando" class="cargando-overlay">
          <div class="spinner"></div>
          <div>Cargando recorrido y entregas…</div>
        </div>
        <div class="leyenda">
          <span><i class="ln" :class="{ dashed: traza.length <= 1 && paradas.length > 1 }"></i> {{ traza.length > 1 ? 'Traza GPS real' : 'Secuencia de entrega' }}</span>
          <span><i class="pn"></i> Punto de entrega</span>
        </div>
      </div>

      <!-- Lista lateral de entregas ordenadas -->
      <div class="lista">
        <div class="lista-head">
          <div class="lh-tit">Paradas de entrega ({{ paradas.length }})</div>
          <div class="lh-sub">Haz clic en una entrega para centrarla en el mapa</div>
        </div>

        <div v-if="!paradas.length && !cargando" class="sin-paradas">
          No hay paradas de entrega registradas en esta fecha.
        </div>

        <div
          v-for="(p, i) in paradas"
          :key="p.id"
          class="stop"
          :class="{ activa: paradaActiva === i }"
          @click="enfocarParada(i)"
        >
          <div class="idx">{{ i + 1 }}</div>
          <div class="info">
            <div class="n">{{ p.clienteNombre || (p.nombreOcasional ? `${p.nombreOcasional} (Ocasional)` : 'Público General') }}</div>
            <div class="meta">
              <span class="time">{{ hora(p.fechaEntrega || p.fecha) }}</span>
              <span class="dot-sep">·</span>
              <span class="badge-pago">{{ p.metodoPago || 'Efectivo' }}</span>
              <span class="dot-sep">·</span>
              <span class="tag-edo" :class="p.estado">{{ estadoTxt(p.estado) }}</span>
            </div>
          </div>
          <div class="total-col">
            <div class="total">{{ money(p.total) }}</div>
            <div class="id-ped">#{{ p.id }}</div>
          </div>
        </div>

        <p v-if="error" class="err">{{ error }}</p>
      </div>
    </div>

    <!-- Tarjeta explicativa del funcionamiento del módulo de Recorridos -->
    <div class="guia-card">
      <button class="guia-toggle" @click="mostrarGuia = !mostrarGuia">
        <div class="gt-l">
          <span class="gt-ic">💡</span>
          <div>
            <div class="gt-t">¿Cómo funciona el mapa de recorridos a costo $0?</div>
            <div class="gt-s">Conoce cómo se registran los puntos y el trazo de ruta sin pagar APIs costosas de Google</div>
          </div>
        </div>
        <span class="gt-arrow">{{ mostrarGuia ? '▲ Ocultar' : '▼ Ver explicación' }}</span>
      </button>

      <div class="guia-content" v-show="mostrarGuia">
        <div class="gc-grid">
          <div class="gc-item">
            <div class="gc-num">1</div>
            <div class="gc-tx">
              <b>Georreferenciación en cada entrega:</b> Al momento que el repartidor confirma una entrega o realiza una autoventa en calle, su teléfono guarda la coordenada GPS exacta. Es 100% gratuito y no consume créditos de Google Maps.
            </div>
          </div>
          <div class="gc-item">
            <div class="gc-num">2</div>
            <div class="gc-tx">
              <b>Trazado secuencial automático:</b> Cuando el repartidor no tiene GPS continuo de fondo, el sistema genera automáticamente una línea secuencial punteada uniendo las paradas en orden cronológico (1 → 2 → 3...).
            </div>
          </div>
          <div class="gc-item">
            <div class="gc-num">3</div>
            <div class="gc-tx">
              <b>Traza continua por carga abierta:</b> Mientras el repartidor mantenga su carga abierta en la app móvil, el sistema emite su ubicación periódica para pintar la ruta vehicular recorrida en color verde esmeralda.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import http from '@/api/http'

const emit = defineEmits(['ctx'])
const route = useRoute()
const router = useRouter()

const repartidores = ref([])
const repartidorId = ref(null)
const fecha = ref(new Date().toLocaleDateString('en-CA')) // YYYY-MM-DD local
const paradas = ref([])
const traza = ref([])
const cargando = ref(false)
const error = ref('')
const paradaActiva = ref(null)
const mostrarGuia = ref(false)

const mapRef = ref(null)
let map = null, capa = null
let markers = []

const CULIACAN = [24.8091, -107.394]
const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const hora = (f) => f ? new Date(f).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' }) : ''
const estadoTxt = (e) => ({ CerradoCompleto: 'Completa', CerradoParcial: 'Parcial', CerradoNoEntregado: 'No entregado' }[e] || e)

const esHoy = computed(() => fecha.value === new Date().toLocaleDateString('en-CA'))
const totalDia = computed(() => paradas.value.reduce((s, p) => s + (Number(p.total) || 0), 0))
const promedioParada = computed(() => paradas.value.length ? totalDia.value / paradas.value.length : 0)

const horaPrimera = computed(() => {
  if (!paradas.value.length) return ''
  const f = paradas.value[0].fechaEntrega || paradas.value[0].fecha
  return hora(f)
})

const horaUltima = computed(() => {
  if (!paradas.value.length) return ''
  const f = paradas.value[paradas.value.length - 1].fechaEntrega || paradas.value[paradas.value.length - 1].fecha
  return hora(f)
})

const duracionJornada = computed(() => {
  if (paradas.value.length < 2) return ''
  const f1 = new Date(paradas.value[0].fechaEntrega || paradas.value[0].fecha)
  const f2 = new Date(paradas.value[paradas.value.length - 1].fechaEntrega || paradas.value[paradas.value.length - 1].fecha)
  const diffMs = f2 - f1
  if (diffMs <= 0) return ''
  const mins = Math.floor(diffMs / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
})

function pin(num, esActivo = false) {
  const bg = esActivo ? '#D65A31' : '#0E5C4A'
  return L.divIcon({
    className: '',
    html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 2px;background:${bg};transform:rotate(45deg);box-shadow:0 8px 16px -4px rgba(0,0,0,.5);display:grid;place-items:center;border:2px solid #fff;transition:all .2s ease;"><span style="transform:rotate(-45deg);color:#fff;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:12px;">${num}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30]
  })
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
  markers = []
  const bounds = []

  // 1) Traza continua del recorrido GPS (si existe registro continuo)
  if (traza.value.length > 1) {
    const linea = traza.value.map((t) => [t.latitud, t.longitud])
    L.polyline(linea, { color: '#0E5C4A', weight: 4.5, opacity: 0.85, lineJoin: 'round' }).addTo(capa)
    linea.forEach((ll) => bounds.push(ll))
  } else if (paradas.value.length > 1) {
    // 2) Si NO hubo traza continua, unir las entregas cronológicamente con línea punteada
    const seqLinea = paradas.value.map((p) => [p.latitudEntrega, p.longitudEntrega])
    L.polyline(seqLinea, { color: '#0E5C4A', weight: 3, opacity: 0.7, dashArray: '6, 8', lineCap: 'round' }).addTo(capa)
  }

  // 3) Pines de entrega encima
  paradas.value.forEach((p, i) => {
    const ll = [p.latitudEntrega, p.longitudEntrega]
    const cliNom = p.clienteNombre || (p.nombreOcasional ? `${p.nombreOcasional} (Ocasional)` : 'Público General')
    const popHtml = `
      <div style="font-family:'Hanken Grotesk',sans-serif; min-width:160px; padding:2px;">
        <div style="font-size:11px; font-weight:800; color:#0E5C4A; text-transform:uppercase; letter-spacing:.05em; margin-bottom:2px;">Parada #${i + 1}</div>
        <div style="font-weight:700; font-size:14.5px; color:#122019; margin-bottom:4px; line-height:1.2;">${cliNom}</div>
        <div style="font-size:12px; color:#5D6E63; margin-bottom:6px;">${hora(p.fechaEntrega || p.fecha)} · ${estadoTxt(p.estado)}</div>
        <div style="font-weight:800; font-size:15px; color:#0E5C4A;">${money(p.total)} <span style="font-size:11px; font-weight:600; color:#7C8A82;">(${p.metodoPago || 'Efectivo'})</span></div>
      </div>
    `
    const m = L.marker(ll, { icon: pin(i + 1, paradaActiva.value === i) })
      .bindPopup(popHtml)
      .addTo(capa)

    m.on('click', () => {
      paradaActiva.value = i
    })

    markers.push(m)
    bounds.push(ll)
  })

  if (bounds.length) {
    map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 })
  } else {
    map.setView(CULIACAN, 12)
  }
  setTimeout(() => map && map.invalidateSize(), 150)
}

function enfocarParada(idx) {
  paradaActiva.value = idx
  const p = paradas.value[idx]
  if (!p || !map) return

  // Actualizar icono activo en todos los marcadores
  markers.forEach((m, i) => {
    if (m) m.setIcon(pin(i + 1, i === idx))
  })

  map.flyTo([p.latitudEntrega, p.longitudEntrega], 16, { animate: true, duration: 0.8 })
  if (markers[idx]) {
    markers[idx].openPopup()
  }
}

function cambiarFiltro() {
  paradaActiva.value = null
  cargar()
}

function moverDia(delta) {
  const d = new Date(fecha.value + 'T12:00:00')
  d.setDate(d.getDate() + delta)
  fecha.value = d.toLocaleDateString('en-CA')
  cambiarFiltro()
}

function irAHoy() {
  fecha.value = new Date().toLocaleDateString('en-CA')
  cambiarFiltro()
}

async function cargar() {
  if (!repartidorId.value) {
    paradas.value = []
    traza.value = []
    pintar()
    return
  }

  cargando.value = true
  error.value = ''

  try {
    // Calculamos el rango UTC exacto para todo el día local
    const dIni = new Date(fecha.value + 'T00:00:00')
    const dFin = new Date(fecha.value + 'T23:59:59.999')

    const [ped, rec] = await Promise.all([
      http.get('/pedidos', {
        params: {
          repartidorId: repartidorId.value,
          desde: dIni.toISOString(),
          hasta: dFin.toISOString(),
          tamano: 100
        }
      }),
      http.get('/recorridos', {
        params: {
          repartidorId: repartidorId.value,
          fecha: fecha.value,
          desde: dIni.toISOString(),
          hasta: dFin.toISOString()
        }
      })
    ])

    // Filtramos solo los que tienen coordenadas válidas de entrega y ordenamos cronológicamente
    const lista = (ped.data?.items || []).filter((p) => p.latitudEntrega != null && p.longitudEntrega != null)
    lista.sort((a, b) => new Date(a.fechaEntrega || a.fecha) - new Date(b.fechaEntrega || b.fecha))

    paradas.value = lista
    traza.value = rec.data || []

    await nextTick()
    pintar()
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudo cargar el historial del recorrido.'
  } finally {
    cargando.value = false
  }
}

onMounted(async () => {
  emit('ctx', {
    titulo: 'Recorridos',
    sub: 'Visualiza la ruta y los puntos exactos de entrega de cada repartidor',
    back: null
  })

  // Leer repartidorId de la query si se navega desde la lista de Repartidores
  if (route.query.repartidorId) {
    repartidorId.value = Number(route.query.repartidorId)
  }

  try {
    const r = await http.get('/usuarios/repartidores')
    repartidores.value = r.data || []
  } catch {
    repartidores.value = []
  }

  await nextTick()
  initMapa()
  if (repartidorId.value) {
    cargar()
  }
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style scoped>
.historial-wrap { display: flex; flex-direction: column; gap: 16px; }

.top-bar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.filtros { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.inp { border: 1px solid var(--line); background: var(--surface); border-radius: 12px; padding: 10px 14px; font-family: "Hanken Grotesk"; font-size: 14.5px; font-weight: 600; color: var(--ink); box-shadow: var(--shadow); }
.sel { min-width: 230px; appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%237C8A82' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; }

.date-group { display: flex; align-items: center; gap: 4px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 3px 5px; box-shadow: var(--shadow); }
.date-inp { border: none; box-shadow: none; padding: 6px 8px; font-size: 13.5px; }
.btn-d { width: 30px; height: 32px; border: none; background: transparent; color: var(--ink-soft); font-size: 18px; font-weight: 700; cursor: pointer; border-radius: 7px; display: grid; place-items: center; }
.btn-d:hover { background: var(--paper-2); }
.btn-hoy { border: none; background: transparent; color: var(--ink-soft); font-family: "Bricolage Grotesque"; font-size: 12px; font-weight: 700; padding: 5px 9px; border-radius: 8px; cursor: pointer; }
.btn-hoy.act { background: var(--pine-tint); color: var(--pine); }

/* KPIs */
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
.kpi-card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 12px 14px; box-shadow: var(--shadow); }
.kpi-l { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); margin-bottom: 4px; }
.kpi-v { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 20px; color: var(--ink); display: flex; align-items: center; gap: 6px; }
.kpi-v.money { color: var(--pine); }
.kpi-v.text { font-size: 15px; font-weight: 700; }
.kpi-s { font-size: 11.5px; color: var(--muted); margin-top: 3px; }

.status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.status-dot.ok { background: var(--pine); box-shadow: 0 0 0 3px rgba(14,92,74,.2); }
.status-dot.warn { background: #B9781F; }
.status-dot.off { background: var(--muted); }

/* Columnas: Mapa y Lista */
.cols { display: grid; grid-template-columns: 1.65fr 1fr; gap: 16px; }
.mapwrap { position: relative; border-radius: 20px; overflow: hidden; border: 1px solid var(--line); box-shadow: var(--shadow); min-height: 480px; }
.map { height: 100%; min-height: 480px; width: 100%; background: #ECF2EC; }

.cargando-overlay { position: absolute; inset: 0; background: rgba(255,253,248,.8); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; z-index: 1000; font-size: 13.5px; font-weight: 600; color: var(--ink-soft); backdrop-filter: blur(2px); }
.spinner { width: 28px; height: 28px; border: 3px solid var(--line); border-top-color: var(--pine); border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.leyenda { position: absolute; left: 14px; bottom: 14px; display: flex; gap: 14px; background: rgba(255,253,248,.94); border: 1px solid var(--line); border-radius: 11px; padding: 8px 12px; font-size: 11.5px; font-weight: 600; color: var(--ink-soft); backdrop-filter: blur(8px); z-index: 999; box-shadow: 0 6px 14px rgba(0,0,0,.08); }
.leyenda span { display: flex; align-items: center; gap: 6px; }
.leyenda .ln { width: 18px; height: 3px; border-radius: 2px; background: #0E5C4A; display: inline-block; }
.leyenda .ln.dashed { border-top: 3px dashed #0E5C4A; background: transparent; height: 0; }
.leyenda .pn { width: 12px; height: 12px; border-radius: 50% 50% 50% 2px; background: #0E5C4A; transform: rotate(45deg); display: inline-block; }

.nogeo { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(246,248,246,.9); color: var(--muted); pointer-events: none; padding: 24px; z-index: 500; }
.empty-box { text-align: center; max-width: 320px; }
.empty-box .ico { font-size: 34px; display: block; margin-bottom: 8px; }
.empty-box .et { font-family: "Bricolage Grotesque"; font-size: 16px; font-weight: 700; color: var(--ink); margin-bottom: 4px; }
.empty-box .es { font-size: 13px; color: var(--muted); line-height: 1.4; }

/* Lista de paradas */
.lista { display: flex; flex-direction: column; max-height: 520px; overflow-y: auto; padding-right: 4px; }
.lista-head { margin-bottom: 10px; }
.lh-tit { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 16px; color: var(--ink); }
.lh-sub { font-size: 12px; color: var(--muted); margin-top: 1px; }

.sin-paradas { background: var(--surface); border: 1px dashed var(--line); border-radius: 14px; padding: 24px; text-align: center; color: var(--muted); font-size: 13px; font-weight: 500; }

.stop { display: flex; align-items: center; gap: 12px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 11px 13px; margin-bottom: 8px; box-shadow: var(--shadow); cursor: pointer; transition: all .15s ease; }
.stop:hover { border-color: var(--pine); transform: translateY(-1px); }
.stop.activa { border-color: #D65A31; background: #FFF9F6; box-shadow: 0 4px 14px rgba(214,90,49,.15); }
.stop.activa .idx { background: #D65A31; }

.stop .idx { width: 30px; height: 30px; flex: 0 0 auto; border-radius: 50%; background: var(--pine); color: #fff; display: grid; place-items: center; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13px; transition: background .15s ease; }
.stop .info { flex: 1; min-width: 0; }
.stop .info .n { font-weight: 700; font-size: 14px; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stop .info .meta { font-size: 11.5px; color: var(--muted); font-weight: 500; margin-top: 2px; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.time { color: var(--ink-soft); font-weight: 600; }
.badge-pago { font-size: 10.5px; font-weight: 700; color: var(--ink-soft); background: var(--paper-2); padding: 1px 6px; border-radius: 5px; }
.dot-sep { color: var(--muted); }

.tag-edo { font-size: 10.5px; font-weight: 700; }
.tag-edo.CerradoCompleto { color: var(--pine); }
.tag-edo.CerradoParcial { color: #B9781F; }
.tag-edo.CerradoNoEntregado { color: var(--clay); }

.total-col { text-align: right; flex: 0 0 auto; }
.stop .total { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; color: var(--ink); font-variant-numeric: tabular-nums; }
.id-ped { font-size: 11px; color: var(--muted); font-weight: 600; }

.err { color: var(--clay); font-weight: 600; font-size: 13px; margin-top: 8px; }

/* Tarjeta de Guía Explicativa */
.guia-card { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow); overflow: hidden; margin-top: 8px; }
.guia-toggle { width: 100%; border: none; background: transparent; display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; cursor: pointer; text-align: left; }
.gt-l { display: flex; align-items: center; gap: 12px; }
.gt-ic { font-size: 22px; flex: 0 0 auto; }
.gt-t { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14.5px; color: var(--ink); }
.gt-s { font-size: 12px; color: var(--muted); margin-top: 1px; }
.gt-arrow { font-size: 12px; font-weight: 700; color: var(--pine); }
.guia-content { padding: 0 18px 18px; border-top: 1px solid var(--line); background: var(--paper); }
.gc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-top: 14px; }
.gc-item { display: flex; gap: 10px; }
.gc-num { width: 22px; height: 22px; border-radius: 50%; background: var(--pine-tint); color: var(--pine); display: grid; place-items: center; font-weight: 800; font-size: 11.5px; flex: 0 0 auto; margin-top: 2px; }
.gc-tx { font-size: 12.5px; color: var(--ink-soft); line-height: 1.45; }
.gc-tx b { color: var(--ink); }

@media (max-width: 900px) {
  .cols { grid-template-columns: 1fr; }
  .mapwrap { min-height: 340px; }
  .map { min-height: 340px; }
  .lista { max-height: 380px; }
}
</style>
