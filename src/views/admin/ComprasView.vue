<template>
  <div class="compras-page">
    <!-- TARJETA EDUCATIVA EXPLICATIVA -->
    <div class="edu-card">
      <div class="edu-head" @click="guiaAbierta = !guiaAbierta">
        <div class="edu-tit">
          <span class="edu-ico">💡</span>
          <div>
            <b>¿Cómo impactan las compras al inventario y al costo promedio ponderado?</b>
            <div class="edu-sub">Conoce cómo se alimentan tus existencias y cómo se calcula el costo real de tus productos</div>
          </div>
        </div>
        <button type="button" class="edu-btn">{{ guiaAbierta ? 'Ocultar guía' : 'Ver guía' }}</button>
      </div>

      <div v-if="guiaAbierta" class="edu-body">
        <div class="edu-grid">
          <div class="edu-step">
            <span class="step-badge">1</span>
            <div class="step-content">
              <b>Entrada física y conversión de cajas</b>
              <p>Cada producto ingresa de inmediato a <b>StockAlmacen</b>. Si la compra se capturó por caja, el sistema multiplica por el factor de conversión para llevar siempre el inventario en unidades base (piezas).</p>
            </div>
          </div>
          <div class="edu-step">
            <span class="step-badge">2</span>
            <div class="step-content">
              <b>Costo Promedio Ponderado (CPP)</b>
              <p>El costo unitario se recalcula automáticamente: <code>(StockViejo × CostoViejo + PiezasNuevas × CostoNuevo) ÷ StockTotal</code>. Así tu utilidad y precio sugerido siempre reflejan la inversión real.</p>
            </div>
          </div>
          <div class="edu-step">
            <span class="step-badge">3</span>
            <div class="step-content">
              <b>Comprobante PDF y trazabilidad</b>
              <p>Cada compra registra fecha, hora, responsable y folio fiscal o de remisión. Puedes consultar el detalle de líneas y descargar el comprobante en PDF en cualquier momento.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- BARRA DE KPIS -->
    <div class="kpis">
      <div class="kpi-card">
        <div class="kpi-l">Inversión total en compras</div>
        <div class="kpi-v money">{{ money(kpiTotalInvertido) }}</div>
        <div class="kpi-s">{{ items.length }} facturas / notas registradas</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-l">Compras este mes</div>
        <div class="kpi-v ok">{{ money(kpiMesActual) }}</div>
        <div class="kpi-s">Inversión del mes en curso</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-l">Proveedores surtidos</div>
        <div class="kpi-v sky">{{ kpiProveedoresDistintos }}</div>
        <div class="kpi-s">Proveedores con compras en el listado</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-l">Ticket promedio de compra</div>
        <div class="kpi-v">{{ money(kpiPromedioCompra) }}</div>
        <div class="kpi-s">Monto promedio por compra</div>
      </div>
    </div>

    <!-- FILTROS Y BUSCADOR -->
    <div class="filtros-bar">
      <div class="search-box">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
        <input v-model="buscar" placeholder="Buscar por folio, factura, proveedor o producto…" @input="onBuscarInput">
        <button v-if="buscar" class="clear-b" @click="buscar = ''; cargar()">×</button>
      </div>

      <div class="prov-select">
        <select class="sel" v-model="filtroProveedorId" @change="cargar">
          <option :value="null">Todos los proveedores</option>
          <option v-for="p in proveedores" :key="p.id" :value="p.id">{{ p.nombre }}</option>
        </select>
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
        <button v-if="fechaDesde || fechaHasta || filtroProveedorId || buscar" class="btn-limpiar" @click="limpiarFiltros">Limpiar filtros</button>
      </div>
    </div>

    <p v-if="cargando" class="muted">Cargando compras registradas…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else-if="!items.length" class="muted">{{ vacioTexto }}</p>

    <!-- LISTADO DE COMPRAS -->
    <div class="grid" v-else>
      <div v-for="c in items" :key="c.id" class="card" :class="{ open: abierta === c.id }">
        <div class="head" @click="toggle(c.id)">
          <div class="chip"><ion-icon :icon="cubeOutline" /></div>
          <div class="info">
            <div class="prov">
              {{ c.proveedorNombre }}
              <span v-if="c.referencia" class="ref-badge">{{ c.referencia }}</span>
            </div>
            <div class="sub">
              {{ fecha(c.fecha) }} · {{ c.lineas.length }} producto(s)
              <span v-if="c.registradoPorNombre"> · registró {{ c.registradoPorNombre }}</span>
            </div>
          </div>
          <div class="total-col">
            <div class="total">{{ money(c.total) }}</div>
            <span class="ln-cnt">{{ c.lineas.length }} art.</span>
          </div>
          <ion-icon :icon="abierta === c.id ? chevronUp : chevronDown" class="arrow" />
        </div>

        <div class="detalle" v-if="abierta === c.id">
          <div class="lineas-tit">Desglose de productos comprados</div>
          <div class="linea" v-for="l in c.lineas" :key="l.id">
            <div class="linea-info">
              <span class="ln">{{ l.productoNombre }}</span>
              <span class="lc">{{ cantMostrar(l) }} × {{ costoMostrar(l) }}</span>
            </div>
            <span class="ls">{{ money(l.subtotal) }}</span>
          </div>

          <div class="detalle-pie">
            <button class="pdf-b" :disabled="descargando === c.id" @click="descargarPdf(c)">
              <ion-icon :icon="documentTextOutline" />
              <span>{{ descargando === c.id ? 'Generando PDF…' : 'Descargar comprobante de compra PDF' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { IonIcon } from '@ionic/vue'
import { cubeOutline, chevronDown, chevronUp, documentTextOutline } from 'ionicons/icons'
import http from '@/api/http'

const emit = defineEmits(['ctx'])
const items = ref([])
const proveedores = ref([])
const cargando = ref(true)
const error = ref('')
const abierta = ref(null)
const descargando = ref(null)
const buscar = ref('')
const filtroProveedorId = ref(null)
const fechaDesde = ref('')
const fechaHasta = ref('')
const guiaAbierta = ref(false)
let buscarTimer = null

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt = (n) => Number(n || 0).toLocaleString('es-MX')
const fecha = (f) => new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function esCajaLinea(l) { return !!l.esCaja && l.piezasPorCaja > 0 }
function cantMostrar(l) { return esCajaLinea(l) ? `${fmt(l.cantidad / l.piezasPorCaja)} caja(s)` : `${fmt(l.cantidad)} pzas` }
function costoMostrar(l) { return esCajaLinea(l) ? `${money(l.costoUnitario * l.piezasPorCaja)} / caja` : `${money(l.costoUnitario)} / pza` }

function toggle(id) { abierta.value = abierta.value === id ? null : id }

// KPIs calculados
const kpiTotalInvertido = computed(() => items.value.reduce((s, c) => s + (Number(c.total) || 0), 0))
const kpiPromedioCompra = computed(() => items.value.length ? kpiTotalInvertido.value / items.value.length : 0)

const kpiMesActual = computed(() => {
  const ahora = new Date()
  const anio = ahora.getFullYear()
  const mes = ahora.getMonth()
  return items.value
    .filter(c => {
      const f = new Date(c.fecha)
      return f.getFullYear() === anio && f.getMonth() === mes
    })
    .reduce((s, c) => s + (Number(c.total) || 0), 0)
})

const kpiProveedoresDistintos = computed(() => {
  const ids = new Set(items.value.map(c => c.proveedorId).filter(Boolean))
  return ids.size
})

const vacioTexto = computed(() => {
  if (buscar.value || fechaDesde.value || fechaHasta.value || filtroProveedorId.value) {
    return 'No se encontraron compras con los filtros especificados.'
  }
  return 'Aún no hay compras registradas. Registra una con “Nueva compra”.'
})

function onBuscarInput() {
  clearTimeout(buscarTimer)
  buscarTimer = setTimeout(() => cargar(), 350)
}

function limpiarFiltros() {
  buscar.value = ''
  filtroProveedorId.value = null
  fechaDesde.value = ''
  fechaHasta.value = ''
  cargar()
}

async function descargarPdf(c) {
  descargando.value = c.id
  try {
    const res = await http.get(`/compras/${c.id}/pdf`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `compra-${c.id}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => window.URL.revokeObjectURL(url), 4000)
  } catch {
    error.value = 'No se pudo generar el PDF.'
  } finally {
    descargando.value = null
  }
}

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const params = { tamano: 150 }
    if (filtroProveedorId.value) params.proveedorId = filtroProveedorId.value
    if (buscar.value.trim()) params.buscar = buscar.value.trim()
    if (fechaDesde.value) params.desde = fechaDesde.value
    if (fechaHasta.value) params.hasta = fechaHasta.value
    const { data } = await http.get('/compras', { params })
    items.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudieron cargar las compras.'
  } finally {
    cargando.value = false
  }
}

onMounted(async () => {
  emit('ctx', {
    titulo: 'Compras',
    sub: 'Entradas de mercancía de proveedores y cálculo de costo promedio',
    back: null,
    acciones: { boton: { texto: 'Nueva compra', to: '/panel/compra/nuevo' } }
  })
  try {
    const pv = await http.get('/proveedores', { params: { tamano: 200 } })
    proveedores.value = pv.data?.items || []
  } catch { /* continuar */ }
  cargar()
})
</script>

<style scoped>
.compras-page { display: flex; flex-direction: column; gap: 14px; }
.muted { color: var(--muted); margin-top: 24px; text-align: center; font-weight: 500; }
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
.step-content code { background: var(--paper-2); padding: 2px 6px; border-radius: 5px; font-size: 11px; color: var(--pine); }

/* KPIs */
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; }
.kpi-card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px 16px; box-shadow: var(--shadow); }
.kpi-l { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); }
.kpi-v { font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 26px; letter-spacing: -.02em; color: var(--ink); margin: 4px 0 2px; font-variant-numeric: tabular-nums; }
.kpi-v.money { color: var(--ink); }
.kpi-v.ok { color: var(--pine); }
.kpi-v.sky { color: var(--sky); }
.kpi-s { font-size: 11.5px; color: var(--muted); font-weight: 500; }

/* Filtros y buscador */
.filtros-bar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.search-box { display: flex; align-items: center; gap: 8px; background: var(--surface); border: 1px solid var(--line); border-radius: 13px; padding: 9px 13px; flex: 1; min-width: 260px; box-shadow: var(--shadow); }
.search-box svg { width: 17px; height: 17px; stroke: var(--muted); fill: none; stroke-width: 2.2; flex: 0 0 auto; }
.search-box input { border: none; background: transparent; outline: none; font-size: 13.5px; font-weight: 500; color: var(--ink); width: 100%; }
.clear-b { border: none; background: transparent; color: var(--muted); font-size: 18px; cursor: pointer; padding: 0 4px; }

.prov-select .sel { background: var(--surface); border: 1px solid var(--line); border-radius: 13px; padding: 9px 12px; font-family: "Hanken Grotesk"; font-size: 13px; font-weight: 600; color: var(--ink); box-shadow: var(--shadow); cursor: pointer; }

.fechas-box { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.date-in { display: flex; align-items: center; gap: 6px; background: var(--surface); border: 1px solid var(--line); border-radius: 11px; padding: 6px 10px; font-size: 12px; color: var(--muted); font-weight: 600; box-shadow: var(--shadow); }
.date-in input { border: none; background: transparent; outline: none; font-family: "Hanken Grotesk"; font-size: 12.5px; font-weight: 600; color: var(--ink); }
.btn-limpiar { border: 1px solid var(--line); background: var(--paper-2); color: var(--ink-soft); font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 11.5px; padding: 7px 11px; border-radius: 10px; cursor: pointer; }

/* Grid de Compras */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 12px; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow); overflow: hidden; transition: border-color .15s; }
.card.open { border-color: var(--sky); }
.head { display: flex; align-items: center; gap: 13px; padding: 15px; cursor: pointer; }
.chip { width: 44px; height: 44px; border-radius: 13px; background: var(--sky-soft); display: grid; place-items: center; flex: 0 0 auto; }
.chip ion-icon { font-size: 22px; color: var(--sky); }
.info { flex: 1; min-width: 0; }
.prov { font-weight: 700; font-size: 15.5px; color: var(--ink); display: flex; align-items: center; gap: 8px; }
.ref-badge { font-size: 10.5px; font-weight: 700; background: var(--paper-2); color: var(--ink-soft); padding: 2px 7px; border-radius: 6px; }
.sub { font-size: 12px; color: var(--muted); margin-top: 3px; }
.total-col { text-align: right; flex: 0 0 auto; }
.total { font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 18px; font-variant-numeric: tabular-nums; color: var(--ink); }
.ln-cnt { font-size: 11px; color: var(--muted); font-weight: 600; }
.arrow { color: var(--muted); font-size: 19px; flex: 0 0 auto; margin-left: 4px; }

/* Detalle desplegable */
.detalle { border-top: 1px solid var(--line); padding: 14px 16px; background: var(--paper); }
.lineas-tit { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
.linea { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 13px; padding: 6px 0; border-bottom: 1px solid rgba(0,0,0,.04); }
.linea-info { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.linea .ln { font-weight: 700; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.linea .lc { color: var(--muted); font-size: 11.5px; margin-top: 1px; }
.linea .ls { font-weight: 700; font-family: "Bricolage Grotesque"; font-size: 13.5px; flex: 0 0 auto; font-variant-numeric: tabular-nums; text-align: right; }
.detalle-pie { margin-top: 12px; }
.pdf-b { display: flex; align-items: center; gap: 8px; width: 100%; background: var(--surface); border: 1px solid var(--line); color: var(--ink-soft); border-radius: 12px; padding: 11px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13px; cursor: pointer; justify-content: center; box-shadow: var(--shadow); }
.pdf-b ion-icon { font-size: 17px; color: var(--sky); }
.pdf-b:disabled { opacity: .6; }
</style>
