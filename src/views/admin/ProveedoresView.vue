<template>
  <div class="proveedores-page">
    <!-- TARJETA EDUCATIVA EXPLICATIVA -->
    <div class="edu-card">
      <div class="edu-head" @click="guiaAbierta = !guiaAbierta">
        <div class="edu-tit">
          <span class="edu-ico">💡</span>
          <div>
            <b>¿Cómo gestionar proveedores y reorden de mercancía?</b>
            <div class="edu-sub">Optimiza tus compras a proveedores, reabastece por WhatsApp y mantén costos al día</div>
          </div>
        </div>
        <button type="button" class="edu-btn">{{ guiaAbierta ? 'Ocultar guía' : 'Ver guía' }}</button>
      </div>

      <div v-if="guiaAbierta" class="edu-body">
        <div class="edu-grid">
          <div class="edu-step">
            <span class="step-badge">1</span>
            <div class="step-content">
              <b>Asignación al catálogo de productos</b>
              <p>Vincula cada producto a su proveedor en el inventario. Así sabrás exactamente a quién comprar cuando el stock caiga por debajo del mínimo establecido.</p>
            </div>
          </div>
          <div class="edu-step">
            <span class="step-badge">2</span>
            <div class="step-content">
              <b>Reorden directo por WhatsApp</b>
              <p>Configura el WhatsApp de cada proveedor. Desde la pantalla de Inventario podrás enviar una solicitud formal de reorden prellenada con las piezas sugeridas en un solo toque.</p>
            </div>
          </div>
          <div class="edu-step">
            <span class="step-badge">3</span>
            <div class="step-content">
              <b>Entrada de compra y costo promedio</b>
              <p>Al pulsar <b>"Nueva compra"</b> en la tarjeta, el proveedor se preselecciona automáticamente para registrar la factura y recalcular de forma transparente el costo promedio ponderado (CPP).</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- BARRA DE KPIS -->
    <div class="kpis">
      <div class="kpi-card">
        <div class="kpi-l">Proveedores totales</div>
        <div class="kpi-v">{{ items.length }}</div>
        <div class="kpi-s">{{ kpiActivos }} activos en operación</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-l">Con WhatsApp de reorden</div>
        <div class="kpi-v ok">{{ kpiConWa }}</div>
        <div class="kpi-s">Listos para solicitud automática</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-l">Productos asociados</div>
        <div class="kpi-v sky">{{ kpiTotalProductos }}</div>
        <div class="kpi-s">Artículos vinculados a proveedores</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-l">Proveedores inactivos</div>
        <div class="kpi-v" :class="{ alert: kpiInactivos > 0 }">{{ kpiInactivos }}</div>
        <div class="kpi-s">{{ kpiInactivos > 0 ? 'Sin surtido reciente' : 'Ninguno dado de baja' }}</div>
      </div>
    </div>

    <!-- BUSCADOR Y PESTAÑAS -->
    <div class="filtros-bar">
      <div class="search-box">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
        <input v-model="buscar" placeholder="Buscar proveedor por nombre o teléfono…" @input="onBuscarInput">
        <button v-if="buscar" class="clear-b" @click="buscar = ''; cargar()">×</button>
      </div>

      <div class="tabs">
        <button v-for="t in tabs" :key="t.k" :class="{ on: tabActiva === t.k }" @click="tabActiva = t.k">
          {{ t.l }}
        </button>
      </div>
    </div>

    <p v-if="cargando" class="muted">Cargando proveedores…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else-if="!filtrados.length" class="muted">{{ vacioTexto }}</p>

    <!-- LISTADO DE TARJETAS -->
    <div class="grid" v-else>
      <div v-for="p in filtrados" :key="p.id" class="card" :class="{ inactivo: !p.activo }">
        <div class="card-top">
          <div class="chip"><ion-icon :icon="cubeOutline" /></div>
          <div class="info" @click="editar(p.id)">
            <div class="nombre">
              {{ p.nombre }}
              <span v-if="!p.activo" class="badge-inactivo">Inactivo</span>
            </div>
            <div class="sub">
              {{ p.telefono || 'Sin teléfono' }}
              <span class="punto">·</span>
              <span class="prods-tag">{{ p.totalProductos === 1 ? '1 producto catalogado' : `${p.totalProductos} productos catalogados` }}</span>
            </div>
          </div>
        </div>

        <div class="card-acciones">
          <button class="btn-compra" @click.stop="nuevaCompra(p)" title="Registrar compra a este proveedor">
            <ion-icon :icon="cartOutline" />
            <span>Nueva compra</span>
          </button>

          <button v-if="p.whatsapp" class="btn-wa" @click.stop="whatsapp(p)" title="Enviar WhatsApp a este proveedor">
            <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.4A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.2 1.1-1.7 1.2-.5.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1-1.4-1-2.6 0-1.2.6-1.8.9-2 .2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2 0 .4-.1.5l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.2.1.4.1.5-.1l.7-.8c.2-.2.4-.2.6-.1l1.8.9c.2.1.4.2.4.3.1.1.1.5-.1 1Z"/></svg>
            <span>WhatsApp</span>
          </button>

          <button class="btn-edit" @click.stop="editar(p.id)" title="Editar información del proveedor">
            <ion-icon :icon="createOutline" />
            <span>Editar</span>
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
import { cubeOutline, cartOutline, createOutline } from 'ionicons/icons'
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
  { k: 'wa', l: 'Con WhatsApp' },
  { k: 'activos', l: 'Activos' },
  { k: 'inactivos', l: 'Inactivos' }
]

const filtrados = computed(() => {
  return items.value.filter(p => {
    if (tabActiva.value === 'wa' && !p.whatsapp) return false
    if (tabActiva.value === 'activos' && !p.activo) return false
    if (tabActiva.value === 'inactivos' && p.activo) return false
    return true
  })
})

const kpiActivos = computed(() => items.value.filter(p => p.activo).length)
const kpiInactivos = computed(() => items.value.filter(p => !p.activo).length)
const kpiConWa = computed(() => items.value.filter(p => p.whatsapp && p.activo).length)
const kpiTotalProductos = computed(() => items.value.reduce((s, p) => s + (p.totalProductos || 0), 0))

const vacioTexto = computed(() => {
  if (buscar.value) return 'No se encontraron proveedores con ese criterio.'
  if (tabActiva.value === 'wa') return 'No hay proveedores con número de WhatsApp configurado.'
  if (tabActiva.value === 'inactivos') return 'No hay proveedores inactivos.'
  return 'No hay proveedores registrados. Crea uno con “Nuevo proveedor”.'
})

function editar(id) { router.push(`/panel/proveedor/${id}`) }
function nuevaCompra(p) { router.push(`/panel/compra/nuevo?proveedorId=${p.id}`) }

function whatsapp(p) {
  const num = (p.whatsapp || '').replace(/[^\d]/g, '')
  if (!num) return
  window.open(`https://wa.me/${num}`, '_blank')
}

function onBuscarInput() {
  clearTimeout(buscarTimer)
  buscarTimer = setTimeout(() => cargar(), 350)
}

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const params = { tamano: 150, incluirInactivos: true }
    if (buscar.value.trim()) params.buscar = buscar.value.trim()
    const { data } = await http.get('/proveedores', { params })
    items.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudieron cargar los proveedores.'
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  emit('ctx', {
    titulo: 'Proveedores',
    sub: 'Directorio de compras y canales de reabastecimiento',
    back: null,
    acciones: { boton: { texto: 'Nuevo proveedor', to: '/panel/proveedor/nuevo' } }
  })
  cargar()
})
</script>

<style scoped>
.proveedores-page { display: flex; flex-direction: column; gap: 14px; }
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
.step-badge { width: 26px; height: 26px; border-radius: 50%; background: var(--sky); color: #fff; display: grid; place-items: center; font-size: 12px; font-weight: 800; flex: 0 0 auto; margin-top: 2px; }
.step-content b { font-size: 13.5px; font-weight: 700; color: var(--ink); }
.step-content p { font-size: 12px; color: var(--muted); margin-top: 4px; line-height: 1.45; }

/* KPIs */
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; }
.kpi-card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px 16px; box-shadow: var(--shadow); }
.kpi-l { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); }
.kpi-v { font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 26px; letter-spacing: -.02em; color: var(--ink); margin: 4px 0 2px; font-variant-numeric: tabular-nums; }
.kpi-v.ok { color: var(--pine); }
.kpi-v.sky { color: var(--sky); }
.kpi-v.alert { color: var(--clay); }
.kpi-s { font-size: 11.5px; color: var(--muted); font-weight: 500; }

/* Filtros y buscador */
.filtros-bar { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; justify-content: space-between; }
.search-box { display: flex; align-items: center; gap: 8px; background: var(--surface); border: 1px solid var(--line); border-radius: 13px; padding: 9px 13px; flex: 1; min-width: 260px; max-width: 440px; box-shadow: var(--shadow); }
.search-box svg { width: 17px; height: 17px; stroke: var(--muted); fill: none; stroke-width: 2.2; flex: 0 0 auto; }
.search-box input { border: none; background: transparent; outline: none; font-size: 13.5px; font-weight: 500; color: var(--ink); width: 100%; }
.clear-b { border: none; background: transparent; color: var(--muted); font-size: 18px; cursor: pointer; padding: 0 4px; }
.tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.tabs button { border: 1px solid var(--line); background: var(--surface); color: var(--muted); font-family: "Hanken Grotesk"; font-weight: 700; font-size: 13px; padding: 8px 14px; border-radius: 11px; cursor: pointer; box-shadow: var(--shadow); }
.tabs button.on { background: var(--pine); color: #fff; border-color: var(--pine); }

/* Grid de proveedores */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 15px; box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 12px; transition: transform .12s, border-color .12s; }
.card:hover { transform: translateY(-2px); border-color: var(--sky); }
.card.inactivo { opacity: .75; border-style: dashed; }
.card-top { display: flex; align-items: center; gap: 13px; }
.chip { width: 44px; height: 44px; border-radius: 13px; display: grid; place-items: center; background: var(--sky-soft); flex: 0 0 auto; }
.chip ion-icon { font-size: 21px; color: var(--sky); }
.info { flex: 1; min-width: 0; cursor: pointer; }
.nombre { font-weight: 700; font-size: 15.5px; color: var(--ink); display: flex; align-items: center; gap: 8px; }
.badge-inactivo { font-size: 10px; font-weight: 700; background: var(--clay-soft); color: var(--clay); padding: 2px 7px; border-radius: 6px; text-transform: uppercase; }
.sub { font-size: 12.5px; color: var(--muted); margin-top: 3px; display: flex; align-items: center; gap: 6px; }
.punto { color: var(--line); }
.prods-tag { color: var(--ink-soft); font-weight: 600; }

/* Botones de acción */
.card-acciones { display: flex; gap: 8px; border-top: 1px solid var(--line); padding-top: 11px; margin-top: auto; }
.btn-compra { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid var(--pine); background: var(--pine-tint); color: var(--pine); font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12.5px; border-radius: 11px; padding: 8px 10px; cursor: pointer; transition: background .12s; }
.btn-compra:hover { background: var(--pine); color: #fff; }
.btn-compra ion-icon { font-size: 15px; }

.btn-wa { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: none; background: #1AA75A; color: #fff; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12.5px; border-radius: 11px; padding: 8px 12px; cursor: pointer; }
.btn-wa svg { width: 14px; height: 14px; fill: #fff; }

.btn-edit { display: inline-flex; align-items: center; justify-content: center; gap: 5px; border: 1px solid var(--line); background: var(--paper-2); color: var(--ink-soft); font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12.5px; border-radius: 11px; padding: 8px 11px; cursor: pointer; }
.btn-edit ion-icon { font-size: 14px; }
</style>
