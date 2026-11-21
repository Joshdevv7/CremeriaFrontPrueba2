<template>
  <div class="compras-page">
    <!-- TARJETA EDUCATIVA EXPLICATIVA -->
    <div class="edu-card">
      <div class="edu-head" @click="guiaAbierta = !guiaAbierta">
        <div class="edu-tit">
          <span class="edu-ico"><CrmIcon name="bulb" /></span>
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
              <p>Cada compra aumenta las existencias de almacén. La presentación adicional se convierte a la unidad del producto: piezas, kg o cajas, según lo registrado en el catálogo.</p>
            </div>
          </div>
          <div class="edu-step">
            <span class="step-badge">2</span>
            <div class="step-content">
              <b>Costo promedio de los productos</b>
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
    <div class="kpis" v-if="resumen">
      <div class="kpi-card">
        <div class="kpi-l">Inversión total en compras</div>
        <div class="kpi-v money">{{ money(resumen.totalInvertido) }}</div>
        <div class="kpi-s">{{ resumen.cantidad }} facturas / notas registradas</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-l">Compras este mes</div>
        <div class="kpi-v ok">{{ money(resumen.mesActual) }}</div>
        <div class="kpi-s">Inversión del mes en curso</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-l">Proveedores surtidos</div>
        <div class="kpi-v sky">{{ resumen.proveedoresDistintos }}</div>
        <div class="kpi-s">Proveedores con compras en el listado</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-l">Ticket promedio de compra</div>
        <div class="kpi-v">{{ money(resumen.promedioCompra) }}</div>
        <div class="kpi-s">Monto promedio por compra</div>
      </div>
    </div>

    <p v-if="errorResumen" class="err" role="alert">{{ errorResumen }} <button class="btn-limpiar" @click="cargarResumen">Reintentar resumen</button></p>
    <!-- FILTROS Y BUSCADOR -->
    <div class="filtros-bar">
      <div class="search-box">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
        <input v-model="buscar" type="search" aria-label="Buscar compra" placeholder="Folio, proveedor o producto (mínimo 3 caracteres)">
        <button v-if="buscar" class="clear-b" @click="buscar = ''" aria-label="Limpiar búsqueda"><CrmIcon name="close" /></button>
      </div>

      <details class="prov-select">
        <summary>Proveedor: {{ proveedorSeleccionado?.nombre || 'Todos' }}</summary>
        <div class="prov-options">
        <input v-model="buscarProveedor" type="search" aria-label="Buscar proveedor del filtro" placeholder="Buscar proveedor (mínimo 3 caracteres)">
        <select class="sel" v-model="filtroProveedorId" aria-label="Filtrar por proveedor" @change="conservarProveedor">
          <option :value="null">Todos los proveedores</option>
          <option v-for="p in proveedoresConSeleccion" :key="p.id" :value="p.id">{{ p.nombre }}</option>
        </select>
        <p v-if="cargandoProveedores" role="status">Cargando proveedores…</p>
        <p v-else-if="errorProveedores" class="err" role="alert">{{ errorProveedores }} <button class="btn-limpiar" @click="cargarProveedores">Reintentar proveedores</button></p>
        <p v-else-if="!proveedores.length">Sin proveedores con esa búsqueda.</p>
        <div class="prov-pager" v-if="paginasProveedores > 1">
          <button class="btn-limpiar" :disabled="cargandoProveedores || paginaProveedores <= 1" aria-label="Proveedores anteriores" @click="irPaginaProveedor(paginaProveedores - 1)">Anterior</button>
          <span>{{ paginaProveedores }} / {{ paginasProveedores }}</span>
          <button class="btn-limpiar" :disabled="cargandoProveedores || paginaProveedores >= paginasProveedores" aria-label="Proveedores siguientes" @click="irPaginaProveedor(paginaProveedores + 1)">Siguiente</button>
        </div>
        </div>
      </details>

      <div class="fechas-box">
        <div class="date-in">
          <span>Desde:</span>
          <input type="date" v-model="fechaDesde" aria-label="Compras desde">
        </div>
        <div class="date-in">
          <span>Hasta:</span>
          <input type="date" v-model="fechaHasta" aria-label="Compras hasta">
        </div>
        <button v-if="fechaDesde || fechaHasta || filtroProveedorId || buscar" class="btn-limpiar" @click="limpiarFiltros">Limpiar filtros</button>
      </div>
    </div>

    <p v-if="cargando" class="muted" role="status">Cargando página de compras…</p>
    <p v-else-if="error" class="err" role="alert">{{ error }} <button class="btn-limpiar" @click="cargar">Reintentar</button></p>
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
              <span v-if="l.historicoCompleto === false && l.esCaja" class="lc">Cantidad en unidad base. La presentación de caja original no quedó registrada.</span>
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
    <nav class="pager" v-if="!error && totalPaginas > 1" aria-label="Páginas de compras">
      <button :disabled="cargando || pagina <= 1" aria-label="Página anterior" @click="irPagina(pagina - 1)">‹</button>
      <button v-for="n in paginasVisibles" :key="n" :disabled="cargando" :aria-label="`Página ${n}`" :aria-current="pagina === n ? 'page' : undefined" @click="irPagina(n)">{{ n }}</button>
      <button :disabled="cargando || pagina >= totalPaginas" aria-label="Página siguiente" @click="irPagina(pagina + 1)">›</button>
    </nav>
    <p v-if="!cargando && !error" class="cuenta" aria-live="polite">{{ total ? (pagina - 1) * tamano + 1 : 0 }}–{{ Math.min(pagina * tamano, total) }} de {{ total }} compras</p>
  </div>
</template>

<script setup>
import CrmIcon from '@/components/CrmIcon.vue'
import { useBusqueda } from '@/composables/useBusqueda'
import { useListadoPaginado } from '@/composables/useListadoPaginado'
import { ref, computed, onMounted, watch } from 'vue'
import { IonIcon } from '@ionic/vue'
import { cubeOutline, chevronDown, chevronUp, documentTextOutline } from 'ionicons/icons'
import http from '@/api/http'
import { limitesFechaCompra, unidadBaseCompra } from '@/utils/compra'

const emit = defineEmits(['ctx'])
const abierta = ref(null)
const descargando = ref(null)
const { buscar: buscar, termino: terminoBusqueda } = useBusqueda('')
const filtroProveedorId = ref(null)
const fechaDesde = ref('')
const fechaHasta = ref('')
const guiaAbierta = ref(false)
const { items, resumen, cargando, error, errorResumen, total, pagina, tamano, totalPaginas,
  paginasVisibles, irPagina, cargar, cargarResumen, actualizar } = useListadoPaginado({
  obtenerPagina: config => http.get('/compras', config),
  obtenerResumen: config => http.get('/compras/resumen', config),
  resumenSigueFiltros: true,
  filtros: () => ({ ...limitesFechaCompra(fechaDesde.value, fechaHasta.value),
    proveedorId: filtroProveedorId.value || undefined, buscar: terminoBusqueda.value || undefined })
})
watch(items, () => { abierta.value = null })

// El selector también consulta páginas: una búsqueda encuentra cualquier proveedor.
const { buscar: buscarProveedor, termino: terminoProveedor } = useBusqueda('')
const proveedorSeleccionado = ref(null)
const { items: proveedores, cargando: cargandoProveedores, error: errorProveedores,
  pagina: paginaProveedores, totalPaginas: paginasProveedores, irPagina: irPaginaProveedor,
  cargar: cargarProveedores } = useListadoPaginado({
  obtenerPagina: config => http.get('/proveedores', config),
  filtros: () => ({ incluirInactivos: true, buscar: terminoProveedor.value || undefined })
})
const proveedoresConSeleccion = computed(() => proveedorSeleccionado.value && !proveedores.value.some(p => p.id === proveedorSeleccionado.value.id)
  ? [proveedorSeleccionado.value, ...proveedores.value] : proveedores.value)
function conservarProveedor() {
  proveedorSeleccionado.value = proveedoresConSeleccion.value.find(p => p.id === filtroProveedorId.value) || null
}

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt = (n) => Number(n || 0).toLocaleString('es-MX')
const fecha = (f) => new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function esCajaLinea(l) { return !!l.esCaja && l.piezasPorCaja > 0 }
function cantMostrar(l) {
  if (esCajaLinea(l)) return `${fmt(l.cantidad / l.piezasPorCaja)} ${l.unidad === 'Caja' ? `paquete(s) de ${l.piezasPorCaja} cajas` : 'caja(s)'}`
  return `${fmt(l.cantidad)} ${l.unidad == null ? 'unidades' : unidadBaseCompra(l).plural}`
}
function costoMostrar(l) {
  if (esCajaLinea(l)) return `${money(l.costoCapturado ?? l.costoUnitario * l.piezasPorCaja)} / ${l.unidad === 'Caja' ? 'paquete' : 'caja'}`
  return `${money(l.costoUnitario)} / ${l.unidad == null ? 'unidad' : unidadBaseCompra(l).singular}`
}

function toggle(id) { abierta.value = abierta.value === id ? null : id }

const vacioTexto = computed(() => {
  if (buscar.value || fechaDesde.value || fechaHasta.value || filtroProveedorId.value) {
    return 'No se encontraron compras con los filtros especificados.'
  }
  return 'Aún no hay compras registradas. Registra una con “Nueva compra”.'
})


function limpiarFiltros() {
  buscar.value = ''
  filtroProveedorId.value = null
  proveedorSeleccionado.value = null
  fechaDesde.value = ''
  fechaHasta.value = ''
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

onMounted(() => {
  emit('ctx', {
    titulo: 'Compras',
    sub: 'Entradas de mercancía de proveedores y cálculo de costo promedio',
    back: null,
    acciones: { boton: { texto: 'Nueva compra', to: '/panel/compra/nuevo' } }
  })
  actualizar()
  cargarProveedores()
})
</script>

<style scoped>
.compras-page { display: flex; flex-direction: column; gap: 14px; }
.muted { color: var(--muted); margin-top: 24px; text-align: center; font-weight: 500; }
.err { color: var(--clay); font-weight: 600; margin-top: 16px; }
.pager { display: flex; justify-content: center; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.pager button { display: grid; place-items: center; min-width: 34px; min-height: 44px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); color: var(--ink-soft); font: inherit; font-weight: 700; cursor: pointer; }
.pager button[aria-current=page] { background: var(--pine); color: #fff; }
.pager button:disabled { opacity: .4; cursor: default; }
.cuenta { color: var(--muted); font-size: 12px; text-align: center; margin: 0; }

/* Tarjeta Educativa */
.edu-card { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow); overflow: hidden; }
.edu-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px 18px; cursor: pointer; background: var(--paper-2); }
.edu-tit { display: flex; align-items: center; gap: 12px; }
.edu-ico { font-size: 22px; flex: 0 0 auto; }
.edu-tit b { font-family: "Bricolage Grotesque"; font-size: 15px; font-weight: 700; color: var(--ink); display: block; }
.edu-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
.edu-btn { border: 1px solid var(--line); background: var(--surface); color: var(--ink-soft); font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12px; padding: 6px 12px; border-radius: 10px; cursor: pointer; flex: 0 0 auto; }
.edu-body { padding: 16px 18px; border-top: 1px solid var(--line); background: var(--surface); }
.edu-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); gap: 14px; }
.edu-step { display: flex; gap: 12px; align-items: flex-start; }
.step-badge { width: 26px; height: 26px; border-radius: 50%; background: var(--pine); color: #fff; display: grid; place-items: center; font-size: 12px; font-weight: 800; flex: 0 0 auto; margin-top: 2px; }
.step-content b { font-size: 13.5px; font-weight: 700; color: var(--ink); }
.step-content p { font-size: 12px; color: var(--muted); margin-top: 4px; line-height: 1.45; }
.step-content code { background: var(--paper-2); padding: 2px 6px; border-radius: 5px; font-size: 11px; color: var(--pine); }

/* KPIs */
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(210px, 100%), 1fr)); gap: 12px; }
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
.prov-select { position: relative; min-width: 0; max-width: 100%; }
.prov-select summary { cursor: pointer; border: 1px solid var(--line); border-radius: 13px; padding: 9px 12px; background: var(--surface); font-size: 13px; overflow-wrap: anywhere; }
.prov-options { position: absolute; z-index: 10; top: calc(100% + 6px); right: 0; width: 280px; max-width: calc(100vw - 48px); padding: 12px; background: var(--surface); border: 1px solid var(--line); border-radius: 13px; box-shadow: var(--shadow); display: grid; gap: 10px; }
.prov-options input, .prov-options .sel { min-width: 0; width: 100%; min-height: 44px; }
.prov-options input { border: 1px solid var(--line); border-radius: 9px; padding: 8px; color: var(--ink); background: var(--surface); font: inherit; font-size: 16px; }
.prov-options p { margin: 0; font-size: 12px; }
.prov-pager { display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 12px; }

.fechas-box { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.date-in { display: flex; align-items: center; gap: 6px; background: var(--surface); border: 1px solid var(--line); border-radius: 11px; padding: 6px 10px; font-size: 12px; color: var(--muted); font-weight: 600; box-shadow: var(--shadow); }
.date-in input { border: none; background: transparent; outline: none; font-family: "Hanken Grotesk"; font-size: 12.5px; font-weight: 600; color: var(--ink); }
.btn-limpiar { border: 1px solid var(--line); background: var(--paper-2); color: var(--ink-soft); font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 11.5px; padding: 7px 11px; border-radius: 10px; cursor: pointer; }

/* Grid de Compras */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(360px, 100%), 1fr)); gap: 12px; }
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
@media (max-width: 430px) {
  .prov-options { left: 0; right: auto; }
  .head { gap: 8px; padding: 12px; flex-wrap: wrap; }
  .head .info { flex-basis: calc(100% - 60px); }
  .prov { flex-wrap: wrap; overflow-wrap: anywhere; }
  .total-col { margin-left: 52px; flex: 1; text-align: left; }
  .fechas-box { min-width: 0; }
  .pdf-b { overflow-wrap: anywhere; }
}
</style>
