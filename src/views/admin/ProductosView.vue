<template>
  <div class="inventario-page">
    <!-- TARJETA EDUCATIVA EXPLICATIVA -->
    <div class="edu-card">
      <div class="edu-head" @click="guiaAbierta = !guiaAbierta">
        <div class="edu-tit">
          <span class="edu-ico">💡</span>
          <div>
            <b>¿Cómo se controla el inventario en almacén y en ruta?</b>
            <div class="edu-sub">Conoce la separación de existencias, venta por caja y el reorden sugerido a proveedores</div>
          </div>
        </div>
        <button type="button" class="edu-btn">{{ guiaAbierta ? 'Ocultar guía' : 'Ver guía' }}</button>
      </div>

      <div v-if="guiaAbierta" class="edu-body">
        <div class="edu-grid">
          <div class="edu-step">
            <span class="step-badge">1</span>
            <div class="step-content">
              <b>Almacén central vs Cargas en camioneta</b>
              <p>El stock visible aquí es lo que tienes físicamente en tu bodega. Al autorizar una carga matutina para un chofer, la mercancía se descuenta de almacén. Al liquidar el día, lo no vendido regresa a tu inventario físico.</p>
            </div>
          </div>
          <div class="edu-step">
            <span class="step-badge">2</span>
            <div class="step-content">
              <b>Unidad base y venta por caja</b>
              <p>Todo el inventario vive estrictamente en unidades base (piezas o kg). Si activas "Venta por caja", el sistema multiplica por el factor de conversión para que nunca haya diferencias entre vender suelto o en paquete.</p>
            </div>
          </div>
          <div class="edu-step">
            <span class="step-badge">3</span>
            <div class="step-content">
              <b>Umbrales de reorden y WhatsApp directo</b>
              <p>Al caer por debajo de tu <b>Stock mínimo</b>, el sistema calcula cuántas piezas requieres para llegar al <b>Stock objetivo</b>. Si tu proveedor tiene WhatsApp, puedes pedirle surtido con un solo toque.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- BARRA DE KPIS DE INVENTARIO -->
    <div class="kpis">
      <div class="kpi-card">
        <div class="kpi-l">Valor total del inventario</div>
        <div class="kpi-v money">{{ money(kpiValorInventario) }}</div>
        <div class="kpi-s">Valuación a costo promedio en almacén</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-l">Productos en catálogo</div>
        <div class="kpi-v">{{ items.length }}</div>
        <div class="kpi-s">{{ fmt(kpiTotalPiezas) }} piezas físicas en bodega</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-l">Requieren reorden</div>
        <div class="kpi-v" :class="{ alert: kpiRequierenReorden > 0 }">{{ kpiRequierenReorden }}</div>
        <div class="kpi-s">{{ kpiRequierenReorden > 0 ? 'Stock igual o menor al mínimo' : 'Existencias saludables 👍' }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-l">Agotados / Sin stock</div>
        <div class="kpi-v" :class="{ red: kpiAgotados > 0 }">{{ kpiAgotados }}</div>
        <div class="kpi-s">{{ kpiAgotados > 0 ? 'Productos con 0 existencias' : 'Ningún producto en ceros' }}</div>
      </div>
    </div>

    <!-- FILTROS Y BUSCADOR -->
    <div class="filtros-bar">
      <div class="search-box">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
        <input v-model="buscar" placeholder="Buscar por nombre, categoría o código de barras…" @input="onBuscarInput">
        <button v-if="buscar" class="clear-b" @click="buscar = ''; cargar()">×</button>
      </div>

      <div class="tabs">
        <button
          v-for="t in tabs"
          :key="t.k"
          :class="{ on: tabActiva === t.k }"
          @click="tabActiva = t.k"
        >
          {{ t.l }}
          <span class="cnt-badge" v-if="t.k === 'reorden' && kpiRequierenReorden > 0">{{ kpiRequierenReorden }}</span>
          <span class="cnt-badge red" v-if="t.k === 'agotados' && kpiAgotados > 0">{{ kpiAgotados }}</span>
        </button>
      </div>
    </div>

    <p v-if="cargando" class="muted">Cargando catálogo de productos…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else-if="!filtrados.length" class="muted">{{ vacioTexto }}</p>

    <!-- LISTADO DE PRODUCTOS -->
    <div class="grid" v-else>
      <div v-for="p in filtrados" :key="p.id" class="card" @click="editar(p.id)">
        <div class="card-head">
          <div class="emoji-chip" :class="chipClase(p)">
            <span v-if="p.stockAlmacen <= 0">❌</span>
            <span v-else-if="p.requiereReorden">⚠️</span>
            <span v-else>📦</span>
          </div>

          <div class="info">
            <div class="nombre-row">
              <div class="nombre">{{ p.nombre }}</div>
              <span v-if="p.stockAlmacen <= 0" class="badge-red">Agotado</span>
              <span v-else-if="p.requiereReorden" class="badge-amber">Pedir {{ fmt(p.cantidadSugeridaReorden) }}</span>
            </div>

            <div class="sub">
              <span class="prov-txt">{{ p.proveedorNombre || 'Sin proveedor' }}</span>
              <span class="dot">·</span>
              <span class="cat-txt">{{ p.categoria || 'General' }}</span>
              <span class="dot">·</span>
              <span class="uni-txt">{{ p.unidad }}</span>
            </div>
          </div>

          <div class="precios-col">
            <div class="precio-venta">{{ money(p.precioVenta) }}</div>
            <div class="margen-tag" :class="margenClase(p)">
              {{ margenPorcentaje(p) }}% margen
            </div>
          </div>
        </div>

        <!-- Barra de existencias y reorden -->
        <div class="stock-box">
          <div class="stock-info">
            <span class="st-lbl">En almacén:</span>
            <b class="st-val" :class="stockColorClase(p)">{{ fmt(p.stockAlmacen) }} {{ p.unidad || 'pzas' }}</b>
            <span class="st-umbrales">(mín: {{ fmt(p.stockMinimo) }} · obj: {{ fmt(p.stockObjetivo) }})</span>
          </div>
          <div class="costo-prom">CPP: <b>{{ money(p.costoPromedio) }}</b></div>
        </div>

        <!-- Indicador de venta por caja -->
        <div v-if="p.vendePorCaja" class="caja-strip">
          <span>📦 Venta por caja ({{ p.piezasPorCaja }} pzas):</span>
          <b>{{ money(p.precioCaja) }} / caja</b>
        </div>

        <!-- Acciones al pie -->
        <div class="card-pie">
          <!-- Botón WhatsApp si requiere reorden y tiene número -->
          <button
            v-if="p.requiereReorden && p.proveedorWhatsapp"
            class="btn-wa-reorden"
            @click.stop="pedirWhatsapp(p)"
            title="Solicitar pedido de reorden a proveedor por WhatsApp"
          >
            <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.4A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.2 1.1-1.7 1.2-.5.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1-1.4-1-2.6 0-1.2.6-1.8.9-2 .2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2 0 .4-.1.5l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.2.1.4.1.5-.1l.7-.8c.2-.2.4-.2.6-.1l1.8.9c.2.1.4.2.4.3.1.1.1.5-.1 1Z"/></svg>
            <span>Pedir reorden (WhatsApp)</span>
          </button>

          <button
            v-else-if="p.requiereReorden && !p.proveedorWhatsapp"
            class="btn-sin-wa"
            @click.stop="irAProveedor(p)"
            title="Configura el WhatsApp del proveedor para pedir en 1 toque"
          >
            <span>Configurar WhatsApp de proveedor</span>
          </button>

          <button class="btn-editar-prod" @click.stop="editar(p.id)">
            <span>Editar</span>
            <ion-icon :icon="chevronForward" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { IonIcon } from '@ionic/vue'
import { chevronForward } from 'ionicons/icons'
import http from '@/api/http'

const emit = defineEmits(['ctx'])
const router = useRouter()
const items = ref([])
const cargando = ref(true)
const error = ref('')
const buscar = ref('')
const tabActiva = ref('todos')
const guiaAbierta = ref(false)
let buscarTimer = null

const tabs = [
  { k: 'todos', l: 'Todos' },
  { k: 'reorden', l: '⚠️ Requieren reorden' },
  { k: 'agotados', l: '❌ Agotados' },
  { k: 'caja', l: '📦 Por caja' }
]

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt = (n) => Number(n || 0).toLocaleString('es-MX')

const filtrados = computed(() => {
  let list = items.value
  if (tabActiva.value === 'reorden') list = list.filter(p => p.requiereReorden)
  else if (tabActiva.value === 'agotados') list = list.filter(p => p.stockAlmacen <= 0)
  else if (tabActiva.value === 'caja') list = list.filter(p => p.vendePorCaja)

  const t = buscar.value.trim().toLowerCase()
  if (t) {
    list = list.filter(p =>
      p.nombre.toLowerCase().includes(t) ||
      (p.categoria && p.categoria.toLowerCase().includes(t)) ||
      (p.codigoBarras && p.codigoBarras.toLowerCase().includes(t)) ||
      (p.proveedorNombre && p.proveedorNombre.toLowerCase().includes(t))
    )
  }
  return list
})

// KPIs
const kpiValorInventario = computed(() => {
  return items.value.reduce((s, p) => s + (Math.max(0, Number(p.stockAlmacen) || 0) * (Number(p.costoPromedio) || 0)), 0)
})

const kpiTotalPiezas = computed(() => {
  return items.value.reduce((s, p) => s + Math.max(0, Number(p.stockAlmacen) || 0), 0)
})

const kpiRequierenReorden = computed(() => items.value.filter(p => p.requiereReorden).length)
const kpiAgotados = computed(() => items.value.filter(p => p.stockAlmacen <= 0).length)

const vacioTexto = computed(() => {
  if (buscar.value) return 'No se encontraron productos con ese criterio de búsqueda.'
  if (tabActiva.value === 'reorden') return '¡Excelente! No hay productos que requieran reorden en este momento.'
  if (tabActiva.value === 'agotados') return 'No hay productos con existencias en ceros.'
  return 'No hay productos registrados. Crea uno con “Nuevo producto”.'
})

function chipClase(p) {
  if (p.stockAlmacen <= 0) return 'chip-red'
  if (p.requiereReorden) return 'chip-amber'
  return 'chip-green'
}

function stockColorClase(p) {
  if (p.stockAlmacen <= 0) return 'txt-red'
  if (p.requiereReorden) return 'txt-amber'
  return 'txt-green'
}

function margenPorcentaje(p) {
  const pv = Number(p.precioVenta) || 0
  const cp = Number(p.costoPromedio) || 0
  if (pv <= 0) return '0'
  const m = ((pv - cp) / pv) * 100
  return m.toFixed(1)
}

function margenClase(p) {
  const pv = Number(p.precioVenta) || 0
  const cp = Number(p.costoPromedio) || 0
  if (pv <= 0 || pv <= cp) return 'm-red'
  const m = ((pv - cp) / pv) * 100
  if (m < 20) return 'm-amber'
  return 'm-green'
}

function editar(id) { router.push(`/panel/producto/${id}`) }
function irAProveedor(p) {
  if (p.proveedorId) router.push(`/panel/proveedor/${p.proveedorId}`)
  else router.push(`/panel/producto/${p.id}`)
}

function pedirWhatsapp(p) {
  const wa = (p.proveedorWhatsapp || '').replace(/[^\d]/g, '')
  if (!wa) return
  const cant = p.cantidadSugeridaReorden || (p.stockObjetivo - p.stockAlmacen) || 1
  const texto = encodeURIComponent(
    `Hola, de Distribuidora te solicito pedido de reorden para el producto "${p.nombre}": ${fmt(cant)} ${p.unidad || 'piezas'}. Saludos!`
  )
  window.open(`https://wa.me/${wa}?text=${texto}`, '_blank')
}

function onBuscarInput() {
  clearTimeout(buscarTimer)
  buscarTimer = setTimeout(() => cargar(), 350)
}

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const params = { tamano: 250 }
    if (buscar.value.trim()) params.buscar = buscar.value.trim()
    const { data } = await http.get('/productos', { params })
    items.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudieron cargar los productos.'
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  emit('ctx', {
    titulo: 'Inventario',
    sub: 'Existencias en almacén, valuación y reorden a proveedores',
    back: null,
    acciones: { boton: { texto: 'Nuevo producto', to: '/panel/producto/nuevo' } }
  })
  cargar()
})
</script>

<style scoped>
.inventario-page { display: flex; flex-direction: column; gap: 14px; }
.muted { color: var(--muted); margin-top: 24px; text-align: center; font-weight: 500; }
.err { color: var(--clay); font-weight: 600; margin-top: 24px; }

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
.kpi-v.money { color: var(--ink); }
.kpi-v.alert { color: #B9781F; }
.kpi-v.red { color: var(--clay); }
.kpi-s { font-size: 11.5px; color: var(--muted); font-weight: 500; }

/* Filtros y buscador */
.filtros-bar { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; justify-content: space-between; }
.search-box { display: flex; align-items: center; gap: 8px; background: var(--surface); border: 1px solid var(--line); border-radius: 13px; padding: 9px 13px; flex: 1; min-width: 260px; max-width: 440px; box-shadow: var(--shadow); }
.search-box svg { width: 17px; height: 17px; stroke: var(--muted); fill: none; stroke-width: 2.2; flex: 0 0 auto; }
.search-box input { border: none; background: transparent; outline: none; font-size: 13.5px; font-weight: 500; color: var(--ink); width: 100%; }
.clear-b { border: none; background: transparent; color: var(--muted); font-size: 18px; cursor: pointer; padding: 0 4px; }

.tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.tabs button { border: 1px solid var(--line); background: var(--surface); color: var(--muted); font-family: "Hanken Grotesk"; font-weight: 700; font-size: 13px; padding: 8px 14px; border-radius: 11px; cursor: pointer; box-shadow: var(--shadow); display: inline-flex; align-items: center; gap: 6px; }
.tabs button.on { background: var(--pine); color: #fff; border-color: var(--pine); }
.cnt-badge { background: #B9781F; color: #fff; font-size: 10.5px; font-weight: 800; border-radius: 8px; padding: 1px 6px; }
.cnt-badge.red { background: var(--clay); }

/* Grid de Productos */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 12px; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 15px; box-shadow: var(--shadow); cursor: pointer; display: flex; flex-direction: column; gap: 11px; transition: transform .12s, border-color .12s; }
.card:hover { transform: translateY(-2px); border-color: var(--pine); }

.card-head { display: flex; align-items: center; gap: 12px; }
.emoji-chip { width: 44px; height: 44px; border-radius: 13px; display: grid; place-items: center; font-size: 20px; flex: 0 0 auto; }
.chip-green { background: var(--pine-tint); }
.chip-amber { background: var(--amber-soft); }
.chip-red { background: var(--clay-soft); }

.info { flex: 1; min-width: 0; }
.nombre-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.nombre { font-weight: 700; font-size: 15px; color: var(--ink); }
.badge-amber { font-size: 9.5px; font-weight: 800; background: var(--amber-soft); color: #B9781F; padding: 2px 7px; border-radius: 6px; text-transform: uppercase; }
.badge-red { font-size: 9.5px; font-weight: 800; background: var(--clay-soft); color: var(--clay); padding: 2px 7px; border-radius: 6px; text-transform: uppercase; }

.sub { font-size: 12px; color: var(--muted); margin-top: 3px; display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
.prov-txt { color: var(--ink-soft); font-weight: 600; }
.dot { color: var(--line); }

.precios-col { text-align: right; flex: 0 0 auto; }
.precio-venta { font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 17px; font-variant-numeric: tabular-nums; color: var(--ink); }
.margen-tag { font-size: 10.5px; font-weight: 700; border-radius: 5px; padding: 1px 5px; display: inline-block; margin-top: 2px; }
.m-green { background: var(--pine-tint); color: var(--pine); }
.m-amber { background: var(--amber-soft); color: #B9781F; }
.m-red { background: var(--clay-soft); color: var(--clay); }

/* Stock Box */
.stock-box { display: flex; align-items: center; justify-content: space-between; background: var(--paper); border: 1px solid var(--line); border-radius: 12px; padding: 9px 12px; font-size: 12px; }
.stock-info { display: flex; align-items: baseline; gap: 5px; flex-wrap: wrap; }
.st-lbl { color: var(--muted); font-weight: 500; }
.st-val { font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 14px; }
.st-umbrales { color: var(--muted); font-size: 11px; }
.costo-prom { color: var(--muted); font-size: 11.5px; }
.costo-prom b { color: var(--ink-soft); }

.txt-green { color: var(--pine); }
.txt-amber { color: #B9781F; }
.txt-red { color: var(--clay); }

/* Venta por caja */
.caja-strip { font-size: 11.5px; background: var(--sky-soft); color: #1F5269; border-radius: 9px; padding: 5px 10px; display: flex; justify-content: space-between; align-items: center; }
.caja-strip b { font-family: "Bricolage Grotesque"; font-weight: 700; }

/* Botones de acción */
.card-pie { display: flex; gap: 8px; align-items: center; margin-top: auto; padding-top: 4px; }
.btn-wa-reorden { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: none; background: #1AA75A; color: #fff; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12px; border-radius: 11px; padding: 8px 12px; cursor: pointer; }
.btn-wa-reorden svg { width: 14px; height: 14px; fill: #fff; }

.btn-sin-wa { flex: 1; border: 1px dashed var(--line); background: var(--paper-2); color: var(--muted); font-family: "Bricolage Grotesque"; font-weight: 600; font-size: 11px; border-radius: 11px; padding: 8px 10px; cursor: pointer; }

.btn-editar-prod { display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--line); background: var(--paper-2); color: var(--ink-soft); font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12px; border-radius: 11px; padding: 8px 12px; cursor: pointer; }
.btn-editar-prod ion-icon { font-size: 14px; }
</style>
