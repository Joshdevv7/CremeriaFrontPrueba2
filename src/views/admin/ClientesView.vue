<template>
  <div>
    <!-- KPIs de Clientes -->
    <div class="kpis" v-if="resumen">
      <div class="kpi-card">
        <div class="kpi-icon sky"><ion-icon :icon="peopleOutline" /></div>
        <div class="kpi-info">
          <div class="kpi-l">Total clientes</div>
          <div class="kpi-v">{{ resumen.totalClientes }}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon pine"><ion-icon :icon="navigateOutline" /></div>
        <div class="kpi-info">
          <div class="kpi-l">Ubicados con GPS</div>
          <div class="kpi-v">{{ resumen.ubicadosGps }}</div>
        </div>
      </div>
      <div class="kpi-card" v-if="resumen.sinUbicacion > 0">
        <div class="kpi-icon amber"><ion-icon :icon="locationOutline" /></div>
        <div class="kpi-info">
          <div class="kpi-l">Sin ubicación GPS</div>
          <div class="kpi-v">{{ resumen.sinUbicacion }}</div>
        </div>
      </div>
      <div class="kpi-card" v-if="resumen.conAdeudo > 0">
        <div class="kpi-icon clay"><ion-icon :icon="alertCircleOutline" /></div>
        <div class="kpi-info">
          <div class="kpi-l">Con adeudo pendiente</div>
          <div class="kpi-v">{{ resumen.conAdeudo }} ({{ money(resumen.totalAdeudo) }})</div>
        </div>
      </div>
    </div>

    <!-- Barra de búsqueda y filtros rápidos -->
    <div class="toolbar">
      <div class="search">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
        <input v-model="buscar" placeholder="Buscar por nombre, teléfono o dirección…" @input="debounced">
      </div>

      <div class="chips">
        <button class="chip" :class="{ on: filtro === 'todos' }" @click="setFiltro('todos')">Todos</button>
        <button class="chip" :class="{ on: filtro === 'gps' }" @click="setFiltro('gps')">Con GPS</button>
        <button class="chip" :class="{ on: filtro === 'nogps' }" @click="setFiltro('nogps')">Sin GPS</button>
        <button class="chip clay" :class="{ on: filtro === 'deuda' }" @click="setFiltro('deuda')">Con adeudo</button>
      </div>
    </div>

    <p v-if="cargando" class="muted">Cargando catálogo de clientes…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else-if="!itemsFiltrados.length" class="muted">No hay clientes con los filtros seleccionados.</p>

    <!-- Grid de clientes -->
    <div class="grid" v-if="!cargando && itemsFiltrados.length">
      <div v-for="c in itemsPaginados" :key="c.id" class="card" @click="editar(c.id)">
        <div class="card-main">
          <div class="chip-avatar"><ion-icon :icon="storefrontOutline" /></div>
          <div class="info">
            <div class="nombre-row">
              <span class="nombre">{{ c.nombre }}</span>
              <span v-if="c.saldoDeuda > 0" class="tag-deuda" :class="{ vencido: c.tieneCreditoVencido }">
                {{ c.tieneCreditoVencido ? '⚠️ Vencido: ' : 'Debe: ' }}{{ money(c.saldoDeuda) }}
              </span>
            </div>
            <div class="sub">{{ c.direccion || 'Sin dirección registrada' }}</div>
            <div class="tags">
              <span class="tag" :class="c.latitud != null ? 'geo' : 'nogeo'">
                <ion-icon :icon="locationOutline" /> {{ c.latitud != null ? 'GPS registrado' : 'Sin ubicación' }}
              </span>
              <span v-if="c.repartidorNombre" class="tag rep">
                <ion-icon :icon="personOutline" /> {{ c.repartidorNombre }}
              </span>
              <span v-if="c.totalPedidos > 0" class="tag ped">
                {{ c.totalPedidos }} pedido(s)
              </span>
            </div>
          </div>
          <ion-icon :icon="chevronForward" class="arrow" />
        </div>

        <!-- Acciones rápidas de tarjeta -->
        <div class="card-actions" @click.stop>
          <a v-if="c.telefono" :href="whatsappUrl(c)" target="_blank" class="act-btn wa" title="Enviar WhatsApp">
            <ion-icon :icon="logoWhatsapp" /> WhatsApp
          </a>
          <button class="act-btn ped" @click="nuevoPedidoPara(c)" title="Levantar pedido para este cliente">
            <ion-icon :icon="bagHandleOutline" /> Levantar pedido
          </button>
        </div>
      </div>
    </div>

    <!-- Paginación -->
    <div class="pager" v-if="!cargando && totalPaginas > 1">
      <button class="pg" :disabled="pagina <= 1" @click="irPagina(pagina - 1)">
        <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <button v-for="n in paginasVisibles" :key="n" class="pg num" :class="{ on: n === pagina }" @click="irPagina(n)">{{ n }}</button>
      <button class="pg" :disabled="pagina >= totalPaginas" @click="irPagina(pagina + 1)">
        <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
    <p v-if="!cargando && itemsFiltrados.length" class="cuenta">
      {{ itemsFiltrados.length }} cliente(s) · página {{ pagina }} de {{ totalPaginas }}
    </p>

    <!-- Guía interactiva -->
    <div class="guia-card">
      <div class="guia-header" @click="mostrarGuia = !mostrarGuia">
        <div class="guia-icon">💡</div>
        <div class="guia-tit">¿Cómo funciona la gestión integral de Clientes?</div>
        <div class="guia-badge">{{ mostrarGuia ? 'Ocultar guía' : 'Ver guía' }}</div>
      </div>
      <div v-if="mostrarGuia" class="guia-content">
        <div class="guia-item">
          <div class="gi-num">1</div>
          <div class="gi-text">
            <b>Geolocalización GPS:</b> Los clientes con coordenadas registradas se ubican automáticamente en el mapa de entregas de la app móvil del repartidor, optimizando la ruta del día.
          </div>
        </div>
        <div class="guia-item">
          <div class="gi-num">2</div>
          <div class="gi-text">
            <b>Control de Saldo Deudor:</b> Las etiquetas de adeudo muestran en tiempo real la suma acumulada de cuentas por cobrar pendientes. Si tienen crédito vencido, la tarjeta alerta en color rojo.
          </div>
        </div>
        <div class="guia-item">
          <div class="gi-num">3</div>
          <div class="gi-text">
            <b>Acciones Rápidas:</b> Puedes abrir una conversación de WhatsApp directamente o levantar un nuevo pedido con los datos del cliente ya preseleccionados.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { IonIcon } from '@ionic/vue'
import {
  storefrontOutline,
  locationOutline,
  personOutline,
  chevronForward,
  peopleOutline,
  navigateOutline,
  alertCircleOutline,
  logoWhatsapp,
  bagHandleOutline
} from 'ionicons/icons'
import http from '@/api/http'

const emit = defineEmits(['ctx'])
const router = useRouter()
const items = ref([])
const resumen = ref(null)
const cargando = ref(true)
const error = ref('')
const buscar = ref('')
const filtro = ref('todos') // 'todos' | 'gps' | 'nogps' | 'deuda'
const mostrarGuia = ref(false)

// Paginación
const pagina = ref(1)
const tamano = ref(24)
let timerBusqueda = null

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })

function setFiltro(f) {
  filtro.value = f
  pagina.value = 1
}

function debounced() {
  clearTimeout(timerBusqueda)
  timerBusqueda = setTimeout(() => {
    pagina.value = 1
    cargar()
  }, 350)
}

const itemsFiltrados = computed(() => {
  let list = items.value
  if (filtro.value === 'gps') {
    list = list.filter(c => c.latitud != null)
  } else if (filtro.value === 'nogps') {
    list = list.filter(c => c.latitud == null)
  } else if (filtro.value === 'deuda') {
    list = list.filter(c => (c.saldoDeuda || 0) > 0)
  }
  return list
})

const totalPaginas = computed(() => Math.max(1, Math.ceil(itemsFiltrados.value.length / tamano.value)))
const paginasVisibles = computed(() => {
  const tp = totalPaginas.value, actual = pagina.value
  const rango = []
  let ini = Math.max(1, actual - 2), fin = Math.min(tp, ini + 4)
  ini = Math.max(1, fin - 4)
  for (let i = ini; i <= fin; i++) rango.push(i)
  return rango
})
const itemsPaginados = computed(() => {
  const ini = (pagina.value - 1) * tamano.value
  return itemsFiltrados.value.slice(ini, ini + tamano.value)
})

function irPagina(n) {
  if (n >= 1 && n <= totalPaginas.value) pagina.value = n
}

function editar(id) { router.push(`/panel/cliente/${id}`) }

function nuevoPedidoPara(c) {
  router.push(`/panel/pedido/nuevo?clienteId=${c.id}`)
}

function whatsappUrl(c) {
  const tel = (c.telefono || '').replace(/\D/g, '')
  const num = tel.length === 10 ? '52' + tel : tel
  const msg = encodeURIComponent(`Hola ${c.nombre}, nos comunicamos de Distribuidora para ponernos a sus órdenes.`)
  return `https://wa.me/${num}?text=${msg}`
}

async function cargar() {
  cargando.value = true; error.value = ''
  try {
    const [resList, resResumen] = await Promise.all([
      http.get('/clientes', { params: { buscar: buscar.value || undefined, tamano: 300 } }),
      http.get('/clientes/resumen')
    ])
    items.value = resList.data.items || []
    resumen.value = resResumen.data
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudieron cargar los clientes.'
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  emit('ctx', {
    titulo: 'Clientes',
    sub: 'Directorio, geolocalización y saldos de clientes',
    back: null,
    acciones: { boton: { texto: 'Nuevo cliente', to: '/panel/cliente/nuevo' } }
  })
  cargar()
})
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; }
.err { color: var(--clay); font-weight: 600; margin-top: 24px; }

/* KPIs */
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 16px; }
.kpi-card { display: flex; align-items: center; gap: 12px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 12px 14px; box-shadow: var(--shadow); }
.kpi-icon { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; flex: 0 0 auto; }
.kpi-icon ion-icon { font-size: 20px; }
.kpi-icon.pine { background: var(--pine-tint); color: var(--pine); }
.kpi-icon.sky { background: var(--sky-soft); color: var(--sky); }
.kpi-icon.amber { background: var(--amber-soft); color: #B9781F; }
.kpi-icon.clay { background: var(--clay-soft); color: var(--clay); }
.kpi-info { flex: 1; min-width: 0; }
.kpi-l { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); }
.kpi-v { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 17px; color: var(--ink); margin-top: 2px; font-variant-numeric: tabular-nums; }

/* Toolbar y chips */
.toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 16px; }
.search { display: flex; align-items: center; gap: 8px; background: var(--surface); border: 1px solid var(--line); border-radius: 13px; padding: 9px 13px; flex: 1; min-width: 240px; box-shadow: var(--shadow); }
.search svg { width: 17px; height: 17px; stroke: var(--muted); fill: none; stroke-width: 2; flex: 0 0 auto; }
.search input { border: none; background: transparent; outline: none; font-size: 14px; font-weight: 500; color: var(--ink); width: 100%; }

.chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip { border: 1px solid var(--line); background: var(--surface); color: var(--muted); border-radius: 999px; padding: 7px 14px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12px; cursor: pointer; transition: .15s; }
.chip.on { background: var(--pine); color: #fff; border-color: var(--pine); }
.chip.clay.on { background: var(--clay); color: #fff; border-color: var(--clay); }

/* Grid de clientes */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px; box-shadow: var(--shadow); cursor: pointer; display: flex; flex-direction: column; gap: 10px; transition: border-color .15s; }
.card:hover { border-color: #B4C4BA; }
.card-main { display: flex; align-items: center; gap: 13px; }
.chip-avatar { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; background: var(--pine-tint); flex: 0 0 auto; }
.chip-avatar ion-icon { font-size: 21px; color: var(--pine); }
.info { flex: 1; min-width: 0; }
.nombre-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.nombre { font-weight: 700; font-size: 15px; }
.tag-deuda { font-size: 10.5px; font-weight: 700; color: var(--clay); background: var(--clay-soft); padding: 2px 7px; border-radius: 6px; }
.tag-deuda.vencido { background: #FDE8E4; color: #B33A1F; font-weight: 800; }
.sub { font-size: 12.5px; color: var(--muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tags { display: flex; gap: 5px; margin-top: 6px; flex-wrap: wrap; }
.tag { font-size: 10.5px; font-weight: 700; padding: 3px 8px; border-radius: 7px; display: inline-flex; align-items: center; gap: 4px; }
.tag ion-icon { font-size: 12px; }
.tag.geo { color: var(--pine); background: var(--pine-tint); }
.tag.nogeo { color: var(--muted); background: var(--paper-2); }
.tag.rep { color: var(--sky); background: var(--sky-soft); }
.tag.ped { color: var(--ink-soft); background: var(--paper); }
.arrow { color: var(--muted); font-size: 18px; flex: 0 0 auto; }

.card-actions { display: flex; gap: 7px; border-top: 1px solid var(--line); padding-top: 8px; }
.act-btn { display: flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid var(--line); background: var(--paper); color: var(--ink-soft); border-radius: 9px; padding: 6px 10px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 11.5px; cursor: pointer; text-decoration: none; flex: 1; }
.act-btn ion-icon { font-size: 14px; }
.act-btn.wa { color: #128C7E; background: #E8F5E9; border-color: #C8E6C9; }
.act-btn.ped { color: var(--pine); background: var(--pine-tint); border-color: #BFD8CD; }

/* Paginación */
.pager { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 22px; }
.pg { min-width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); display: grid; place-items: center; cursor: pointer; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; color: var(--ink-soft); padding: 0 6px; }
.pg svg { width: 17px; height: 17px; stroke: var(--ink-soft); fill: none; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.pg:disabled { opacity: .4; cursor: default; }
.pg.num.on { background: var(--pine); color: #fff; border-color: var(--pine); }
.cuenta { text-align: center; color: var(--muted); font-size: 12px; font-weight: 600; margin-top: 10px; }

/* Guía interactiva */
.guia-card { margin-top: 26px; background: var(--surface); border: 1px solid var(--line); border-radius: 18px; overflow: hidden; box-shadow: var(--shadow); }
.guia-header { display: flex; align-items: center; gap: 10px; padding: 14px 18px; cursor: pointer; user-select: none; background: var(--paper); }
.guia-icon { font-size: 19px; }
.guia-tit { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; color: var(--ink); flex: 1; }
.guia-badge { font-size: 11.5px; font-weight: 700; color: var(--pine); background: var(--pine-tint); padding: 4px 10px; border-radius: 999px; }
.guia-content { padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; border-top: 1px solid var(--line); }
.guia-item { display: flex; gap: 12px; align-items: flex-start; }
.gi-num { width: 22px; height: 22px; border-radius: 50%; background: var(--pine-tint); color: var(--pine); display: grid; place-items: center; font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 11.5px; flex: 0 0 auto; margin-top: 2px; }
.gi-text { font-size: 12.5px; color: var(--ink-soft); line-height: 1.45; }
.gi-text b { color: var(--ink); font-weight: 700; }
</style>
