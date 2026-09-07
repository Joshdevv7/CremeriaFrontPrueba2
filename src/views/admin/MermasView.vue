<template>
  <div class="mermas-page">
    <!-- TARJETA EDUCATIVA EXPLICATIVA -->
    <div class="edu-card">
      <div class="edu-head" @click="guiaAbierta = !guiaAbierta">
        <div class="edu-tit">
          <span class="edu-ico">💡</span>
          <div>
            <b>¿Cómo opera el ciclo de mermas y reposición con proveedores?</b>
            <div class="edu-sub">Descubre cómo auditar pérdidas, proteger tu corte de caja y recuperar mercancía devuelta</div>
          </div>
        </div>
        <button type="button" class="edu-btn">{{ guiaAbierta ? 'Ocultar guía' : 'Ver guía' }}</button>
      </div>

      <div v-if="guiaAbierta" class="edu-body">
        <div class="edu-grid">
          <div class="edu-step">
            <span class="step-badge">1</span>
            <div class="step-content">
              <b>Reporte con foto en ruta o almacén</b>
              <p>Cuando un producto se daña, rompe o vence, se reporta con foto de evidencia. Si fue en ruta, se descuenta de inmediato de la camioneta para que el chofer no quede descuadrado al entregar efectivo en su corte.</p>
            </div>
          </div>
          <div class="edu-step">
            <span class="step-badge">2</span>
            <div class="step-content">
              <b>Verificación o rechazo administrativo</b>
              <p>Al auditar la foto, el administrador decide: si aprueba, se confirma la merma física. Si el reporte no procedía, se <b>rechaza</b> y la mercancía se devuelve a la carga activa o al inventario de almacén.</p>
            </div>
          </div>
          <div class="edu-step">
            <span class="step-badge">3</span>
            <div class="step-content">
              <b>Reposición de garantía con proveedor</b>
              <p>Si el proveedor te repone el producto dañado con piezas nuevas en buen estado, pulsa <b>"Proveedor repuso (restablecer)"</b>: el stock vuelve a subir a tu almacén sin alterar tus compras ni duplicar gastos.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- BARRA DE KPIS FINANCIEROS Y OPERATIVOS -->
    <div class="kpis">
      <div class="kpi-card">
        <div class="kpi-l">Mermas por revisar</div>
        <div class="kpi-v" :class="{ alert: kpiPorRevisar > 0 }">{{ kpiPorRevisar }}</div>
        <div class="kpi-s">{{ kpiPorRevisar > 0 ? 'Requieren auditoría inmediata' : 'Al día, sin pendientes 👍' }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-l">Pérdida económica total</div>
        <div class="kpi-v money">{{ money(kpiPerdidaTotal) }}</div>
        <div class="kpi-s">Costo de adquisición de mermas</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-l">Mermas verificadas</div>
        <div class="kpi-v ok">{{ kpiVerificadas }}</div>
        <div class="kpi-s">{{ money(kpiPerdidaVerificada) }} pérdida asentada</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-l">Repuestas / Reingresadas</div>
        <div class="kpi-v sky">{{ kpiRestablecidas }}</div>
        <div class="kpi-s">{{ money(kpiValorRestablecido) }} recuperado con proveedor</div>
      </div>
    </div>

    <!-- FILTROS Y BÚSQUEDA -->
    <div class="filtros-bar">
      <div class="search-box">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
        <input v-model="buscar" placeholder="Buscar por producto, repartidor o motivo…" @input="onBuscarInput">
        <button v-if="buscar" class="clear-b" @click="buscar = ''; cargar()">×</button>
      </div>

      <div class="fechas-box">
        <div class="date-in">
          <span>Desde:</span>
          <input type="date" v-model="fechaDesde" @change="cargar">
        </div>
        <div class="date-in">
          <span>Hasta:</span>
          <input type="date" v-model="fechaHasta" @change="cargar">
        </div>
        <button v-if="fechaDesde || fechaHasta" class="btn-limpiar" @click="limpiarFechas">Limpiar fechas</button>
      </div>
    </div>

    <div class="tabs">
      <button v-for="f in filtros" :key="f.k" :class="{ on: estado === f.k }" @click="setEstado(f.k)">
        {{ f.t }}
        <span class="cnt-badge" v-if="f.k === 'Reportada' && kpiPorRevisar > 0">{{ kpiPorRevisar }}</span>
      </button>
    </div>

    <p v-if="cargando" class="muted">Cargando reportes de merma…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else-if="!items.length" class="muted">{{ vacioTexto }}</p>

    <!-- LISTADO DE TARJETAS -->
    <div class="grid" v-else>
      <div v-for="m in items" :key="m.id" class="card" @click="abrir(m)">
        <div class="head">
          <div class="chip" :class="escClase(m.escenario)"><ion-icon :icon="alertOutline" /></div>
          <div class="info">
            <div class="nombre">{{ m.productoNombre }}</div>
            <div class="sub">
              <b>{{ fmt(m.cantidad) }} {{ m.unidad || 'pzas' }}</b> · {{ escTxt(m.escenario) }} · {{ fecha(m.fecha) }}
            </div>
          </div>
          <span class="badge" :class="estClase(m.estado)">{{ estTxt(m.estado) }}</span>
        </div>

        <div class="motivo">“{{ m.motivo }}”</div>

        <div class="costo-row" v-if="m.costoTotal > 0">
          <span class="costo-l">Pérdida económica estimada:</span>
          <span class="costo-v">{{ money(m.costoTotal) }}</span>
          <small class="costo-u">({{ money(m.costoUnitario) }} / u)</small>
        </div>

        <div class="pie">
          <span class="rep"><ion-icon :icon="personOutline" class="ico-p" /> {{ m.reportadoPorNombre }}</span>
          <span v-if="m.fotoUrl" class="ev"><ion-icon :icon="imageOutline" /> con evidencia</span>
          <span v-if="m.afectoInventario" class="inv">descontado de carga/almacén</span>
        </div>
      </div>
    </div>

    <!-- MODAL DE AUDITORÍA Y ACCIÓN -->
    <transition name="modal">
      <div v-if="sel" class="overlay" @click.self="cerrar()">
        <div class="modal">
          <div class="mhead">
            <div>
              <div class="mtit">{{ sel.productoNombre }}</div>
              <div class="msub">{{ escTxt(sel.escenario) }} · {{ fecha(sel.fecha) }}</div>
            </div>
            <button class="x" @click="cerrar()"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
          </div>

          <div class="mfoto" v-if="sel.fotoUrl">
            <img :src="imgSrc(sel.fotoUrl)" alt="evidencia" @click="ampliar = !ampliar" :class="{ zoom: ampliar }">
            <div class="mfoto-tip">Toca la imagen para {{ ampliar ? 'reducir' : 'ampliar' }}</div>
          </div>
          <div class="mfoto-no" v-else><ion-icon :icon="imageOutline" /> Sin evidencia adjunta</div>

          <div class="mrows">
            <div class="mrow"><span>Cantidad mermada</span><b>{{ fmt(sel.cantidad) }} {{ sel.unidad || 'pzas' }}</b></div>
            <div class="mrow" v-if="sel.costoTotal > 0"><span>Pérdida económica</span><b class="rojo">{{ money(sel.costoTotal) }} <small>({{ money(sel.costoUnitario) }}/u)</small></b></div>
            <div class="mrow"><span>Motivo reportado</span><b>{{ sel.motivo }}</b></div>
            <div class="mrow"><span>Reportado por</span><b>{{ sel.reportadoPorNombre }}</b></div>
            <div class="mrow"><span>Escenario</span><b>{{ escTxt(sel.escenario) }}</b></div>
            <div class="mrow"><span>Estado</span><b><span class="badge" :class="estClase(sel.estado)">{{ estTxt(sel.estado) }}</span></b></div>
            <div class="mrow" v-if="sel.afectoInventario">
              <span>Inventario</span>
              <b class="rojo">{{ sel.escenario === 'EnRuta' ? 'Descontado de la camioneta del chofer' : 'Descontado de almacén' }}</b>
            </div>
          </div>

          <p v-if="errorAccion" class="err">{{ errorAccion }}</p>

          <div class="macciones">
            <!-- Botón verificar -->
            <button v-if="sel.estado === 'Reportada'" class="b verde" :disabled="ocupado" @click="accion('verificar')">
              {{ ocupado ? 'Procesando…' : (sel.afectoInventario ? 'Verificar y aprobar reporte' : 'Verificar y descontar del almacén') }}
            </button>

            <!-- Botón rechazar (disponible para CUALQUIER reporte pendiente) -->
            <button v-if="sel.estado === 'Reportada'" class="b roja" :disabled="ocupado" @click="accion('rechazar')">
              {{ ocupado ? '…' : 'Rechazar reporte (devolver producto)' }}
            </button>

            <!-- Botón reposición de proveedor -->
            <button v-if="sel.afectoInventario && sel.estado !== 'Restablecida'" class="b azul" :disabled="ocupado" @click="accion('restablecer')">
              Proveedor repuso mercancía (restablecer a almacén)
            </button>

            <button class="b gris" @click="cerrar()">Cerrar</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { IonIcon } from '@ionic/vue'
import { alertOutline, imageOutline, personOutline } from 'ionicons/icons'
import http from '@/api/http'

const emit = defineEmits(['ctx'])
const items = ref([])
const cargando = ref(true)
const error = ref('')
const errorAccion = ref('')
const estado = ref('Reportada')
const buscar = ref('')
const fechaDesde = ref('')
const fechaHasta = ref('')
const ocupado = ref(false)
const sel = ref(null)
const ampliar = ref(false)
const guiaAbierta = ref(false)
let buscarTimer = null

const filtros = [
  { k: 'Reportada', t: 'Por revisar' },
  { k: 'Verificada', t: 'Verificadas' },
  { k: 'Restablecida', t: 'Restablecidas' },
  { k: 'Rechazada', t: 'Rechazadas' },
  { k: '', t: 'Todas' }
]

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt = (n) => Number(n || 0).toLocaleString('es-MX')
const fecha = (f) => new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const escTxt = (e) => ({ EnRuta: 'En ruta (camioneta)', ReporteCliente: 'Reporte de cliente' }[e] || e)
const escClase = (e) => ({ EnRuta: 'amber', ReporteCliente: 'clay' }[e] || 'muted')
const estTxt = (e) => ({ Reportada: 'Por revisar', Verificada: 'Verificada', Restablecida: 'Restablecida', Rechazada: 'Rechazada' }[e] || e)
const estClase = (e) => ({ Reportada: 'amber', Verificada: 'pine', Restablecida: 'sky', Rechazada: 'muted' }[e] || 'muted')

const vacioTexto = computed(() => {
  if (buscar.value || fechaDesde.value || fechaHasta.value) return 'No se encontraron mermas con los filtros aplicados.'
  return estado.value === 'Reportada' ? 'No hay mermas por revisar. ¡Todo al día! 👍' : 'Sin mermas en este estado.'
})

// KPIs computados sobre el listado actual
const kpiPorRevisar = computed(() => items.value.filter(m => m.estado === 'Reportada').length)
const kpiPerdidaTotal = computed(() => items.value.reduce((s, m) => s + (Number(m.costoTotal) || 0), 0))
const kpiVerificadas = computed(() => items.value.filter(m => m.estado === 'Verificada').length)
const kpiPerdidaVerificada = computed(() => items.value.filter(m => m.estado === 'Verificada').reduce((s, m) => s + (Number(m.costoTotal) || 0), 0))
const kpiRestablecidas = computed(() => items.value.filter(m => m.estado === 'Restablecida').length)
const kpiValorRestablecido = computed(() => items.value.filter(m => m.estado === 'Restablecida').reduce((s, m) => s + (Number(m.costoTotal) || 0), 0))

function imgSrc(url) {
  if (!url) return ''
  if (/^https?:/.test(url)) return url
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '')
  return base + url
}

function abrir(m) { sel.value = m; ampliar.value = false; errorAccion.value = '' }
function cerrar() { sel.value = null }
function setEstado(k) { estado.value = k; cargar() }

function onBuscarInput() {
  clearTimeout(buscarTimer)
  buscarTimer = setTimeout(() => cargar(), 350)
}

function limpiarFechas() {
  fechaDesde.value = ''
  fechaHasta.value = ''
  cargar()
}

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const params = { tamano: 150 }
    if (estado.value) params.estado = estado.value
    if (buscar.value.trim()) params.buscar = buscar.value.trim()
    if (fechaDesde.value) params.desde = fechaDesde.value
    if (fechaHasta.value) params.hasta = fechaHasta.value
    const { data } = await http.get('/mermas', { params })
    items.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudieron cargar las mermas.'
  } finally {
    cargando.value = false
  }
}

async function accion(tipo) {
  ocupado.value = true
  errorAccion.value = ''
  try {
    await http.post(`/mermas/${sel.value.id}/${tipo}`)
    cerrar()
    await cargar()
  } catch (e) {
    errorAccion.value = e.response?.data?.mensaje || 'No se pudo completar la acción.'
  } finally {
    ocupado.value = false
  }
}

onMounted(() => {
  emit('ctx', { titulo: 'Mermas', sub: 'Control de producto dañado, devuelto y garantías', back: null })
  cargar()
})
</script>

<style scoped>
.mermas-page { display: flex; flex-direction: column; gap: 14px; }
.muted { color: var(--muted); margin-top: 24px; font-weight: 500; text-align: center; }
.err { color: var(--clay); font-weight: 600; margin-top: 16px; }

/* Tarjeta Educativa */
.edu-card { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow); overflow: hidden; }
.edu-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px 18px; cursor: pointer; background: var(--paper-2); }
.edu-tit { display: flex; align-items: center; gap: 12px; }
.edu-ico { font-size: 22px; flex: 0 0 auto; }
.edu-tit b { font-family: "Bricolage Grotesque"; font-size: 15px; font-weight: 700; color: var(--ink); display: block; }
.edu-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
.edu-btn { border: 1px solid var(--line); background: var(--surface); color: var(--ink-soft); font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12px; padding: 6px 12px; border-radius: 10px; cursor: pointer; flex: 0 0 auto; }
.edu-body { padding: 16px 18px; border-top: 1px solid var(--line); background: var(--surface); }
.edu-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }
.edu-step { display: flex; gap: 12px; align-items: flex-start; }
.step-badge { width: 26px; height: 26px; border-radius: 50%; background: var(--pine); color: #fff; display: grid; place-items: center; font-size: 12px; font-weight: 800; flex: 0 0 auto; margin-top: 2px; }
.step-content b { font-size: 13.5px; font-weight: 700; color: var(--ink); }
.step-content p { font-size: 12px; color: var(--muted); margin-top: 4px; line-height: 1.45; }

/* KPIs */
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; }
.kpi-card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px 16px; box-shadow: var(--shadow); }
.kpi-l { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); }
.kpi-v { font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 26px; letter-spacing: -.02em; color: var(--ink); margin: 4px 0 2px; font-variant-numeric: tabular-nums; }
.kpi-v.alert { color: var(--clay); }
.kpi-v.money { color: var(--ink); }
.kpi-v.ok { color: var(--pine); }
.kpi-v.sky { color: var(--sky); }
.kpi-s { font-size: 11.5px; color: var(--muted); font-weight: 500; }

/* Filtros y buscador */
.filtros-bar { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.search-box { display: flex; align-items: center; gap: 8px; background: var(--surface); border: 1px solid var(--line); border-radius: 13px; padding: 9px 13px; flex: 1; min-width: 260px; box-shadow: var(--shadow); }
.search-box svg { width: 17px; height: 17px; stroke: var(--muted); fill: none; stroke-width: 2.2; flex: 0 0 auto; }
.search-box input { border: none; background: transparent; outline: none; font-size: 13.5px; font-weight: 500; color: var(--ink); width: 100%; }
.clear-b { border: none; background: transparent; color: var(--muted); font-size: 18px; cursor: pointer; padding: 0 4px; }
.fechas-box { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.date-in { display: flex; align-items: center; gap: 6px; background: var(--surface); border: 1px solid var(--line); border-radius: 11px; padding: 6px 10px; font-size: 12px; color: var(--muted); font-weight: 600; box-shadow: var(--shadow); }
.date-in input { border: none; background: transparent; outline: none; font-family: "Hanken Grotesk"; font-size: 12.5px; font-weight: 600; color: var(--ink); }
.btn-limpiar { border: 1px solid var(--line); background: var(--paper-2); color: var(--ink-soft); font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 11.5px; padding: 7px 11px; border-radius: 10px; cursor: pointer; }

/* Tabs */
.tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
.tabs button { border: 1px solid var(--line); background: var(--surface); color: var(--muted); font-family: "Hanken Grotesk"; font-weight: 700; font-size: 13px; padding: 8px 14px; border-radius: 11px; cursor: pointer; box-shadow: var(--shadow); display: inline-flex; align-items: center; gap: 6px; }
.tabs button.on { background: var(--pine); color: #fff; border-color: var(--pine); }
.cnt-badge { background: var(--clay); color: #fff; font-size: 10.5px; font-weight: 800; border-radius: 8px; padding: 1px 6px; }

/* Grid de mermas */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 15px; box-shadow: var(--shadow); cursor: pointer; transition: transform .12s, border-color .12s; }
.card:hover { transform: translateY(-2px); border-color: var(--pine); }
.head { display: flex; align-items: center; gap: 12px; }
.chip { width: 40px; height: 40px; border-radius: 11px; display: grid; place-items: center; flex: 0 0 auto; }
.chip ion-icon { font-size: 20px; }
.chip.amber { background: var(--amber-soft); } .chip.amber ion-icon { color: #B9781F; }
.chip.clay { background: var(--clay-soft); } .chip.clay ion-icon { color: var(--clay); }
.chip.muted { background: var(--paper-2); } .chip.muted ion-icon { color: var(--muted); }
.info { flex: 1; min-width: 0; }
.nombre { font-weight: 700; font-size: 15px; color: var(--ink); }
.sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
.sub b { color: var(--ink-soft); }
.badge { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; padding: 3px 8px; border-radius: 7px; flex: 0 0 auto; }
.badge.amber { color: #B9781F; background: var(--amber-soft); }
.badge.pine { color: var(--pine); background: var(--pine-tint); }
.badge.sky { color: var(--sky); background: var(--sky-soft); }
.badge.muted { color: var(--muted); background: var(--paper-2); }
.motivo { font-size: 13px; color: var(--ink-soft); font-style: italic; margin: 10px 0 8px; line-height: 1.4; }
.costo-row { display: flex; align-items: baseline; gap: 6px; background: var(--paper-2); border-radius: 10px; padding: 6px 10px; margin-bottom: 10px; font-size: 12px; }
.costo-l { color: var(--muted); font-weight: 600; }
.costo-v { font-family: "Bricolage Grotesque"; font-weight: 800; color: var(--clay); font-size: 13.5px; }
.costo-u { color: var(--muted); font-size: 11px; }
.pie { display: flex; align-items: center; gap: 10px; font-size: 11.5px; color: var(--muted); font-weight: 600; }
.pie .rep { display: inline-flex; align-items: center; gap: 4px; }
.ico-p { font-size: 13px; }
.pie .ev { display: inline-flex; align-items: center; gap: 3px; color: var(--sky); }
.pie .ev ion-icon { font-size: 13px; }
.pie .inv { color: var(--clay); margin-left: auto; }

/* Modal */
.overlay { position: fixed; inset: 0; background: rgba(21,42,36,.45); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; }
.modal { background: var(--surface); border: 1px solid var(--line); border-radius: 22px; width: 100%; max-width: 460px; max-height: 90vh; overflow: auto; padding: 20px; box-shadow: 0 30px 60px -20px rgba(21,42,36,.5); }
.mhead { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.mtit { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 19px; }
.msub { font-size: 12.5px; color: var(--muted); font-weight: 600; margin-top: 2px; }
.x { width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--line); background: var(--paper); display: grid; place-items: center; cursor: pointer; flex: 0 0 auto; }
.x svg { width: 18px; height: 18px; stroke: var(--ink-soft); fill: none; stroke-width: 2.2; stroke-linecap: round; }
.mfoto { border-radius: 14px; overflow: hidden; margin-bottom: 14px; background: var(--paper-2); position: relative; }
.mfoto img { width: 100%; display: block; max-height: 260px; object-fit: cover; cursor: zoom-in; transition: max-height .2s; }
.mfoto img.zoom { max-height: 70vh; object-fit: contain; cursor: zoom-out; }
.mfoto-tip { position: absolute; bottom: 6px; right: 8px; background: rgba(0,0,0,.6); color: #fff; font-size: 10.5px; padding: 3px 8px; border-radius: 6px; font-weight: 600; }
.mfoto-no { display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--muted); font-weight: 600; font-size: 13px; background: var(--paper-2); border-radius: 14px; padding: 24px; margin-bottom: 14px; }
.mfoto-no ion-icon { font-size: 18px; }
.mrows { display: flex; flex-direction: column; gap: 1px; background: var(--line); border-radius: 12px; overflow: hidden; margin-bottom: 14px; }
.mrow { display: flex; justify-content: space-between; align-items: center; gap: 12px; background: var(--paper); padding: 11px 14px; font-size: 13px; }
.mrow span { color: var(--muted); font-weight: 600; }
.mrow b { font-weight: 700; text-align: right; }
.mrow b.rojo { color: var(--clay); }
.mrow b small { color: var(--muted); font-weight: 500; }
.macciones { display: flex; flex-direction: column; gap: 9px; }
.b { border: none; border-radius: 13px; padding: 13px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; }
.b:disabled { opacity: .5; }
.b.verde { background: var(--pine); color: #fff; }
.b.roja { background: var(--clay-soft); color: var(--clay); }
.b.azul { background: var(--sky-soft); color: var(--sky); }
.b.gris { background: var(--paper-2); color: var(--ink-soft); }

.modal-enter-active, .modal-leave-active { transition: opacity .2s; }
.modal-enter-active .modal, .modal-leave-active .modal { transition: transform .2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal, .modal-leave-to .modal { transform: translateY(20px) scale(.97); }

@media (max-width: 560px) {
  .overlay { align-items: flex-end; padding: 0; }
  .modal { max-width: 100%; border-radius: 22px 22px 0 0; max-height: 92vh; }
  .modal-enter-from .modal, .modal-leave-to .modal { transform: translateY(100%); }
}
</style>
