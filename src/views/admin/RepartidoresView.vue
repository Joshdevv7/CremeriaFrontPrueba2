<template>
  <div class="repartidores-wrap">
    <!-- Métricas KPI -->
    <div class="kpis">
      <div class="kpi-card">
        <div class="kpi-l">Total repartidores</div>
        <div class="kpi-v">{{ items.length }}</div>
        <div class="kpi-s">Equipo de entrega en ruta</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-l">Repartidores activos</div>
        <div class="kpi-v text-pine">{{ totalActivos }}</div>
        <div class="kpi-s">Habilitados para cargar y repartir</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-l">Inactivos / Bajas</div>
        <div class="kpi-v text-muted">{{ totalInactivos }}</div>
        <div class="kpi-s">Cuentas deshabilitadas</div>
      </div>
    </div>

    <!-- Barra de búsqueda y filtros -->
    <div class="toolbar">
      <div class="busc-wrap">
        <svg class="busc-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input class="busc-inp" type="text" v-model="busqueda" placeholder="Buscar repartidor por nombre o correo…">
      </div>
      <div class="tabs">
        <button class="tab" :class="{ act: filtroEstado === 'todos' }" @click="filtroEstado = 'todos'">
          Todos <span class="badge-tab">{{ items.length }}</span>
        </button>
        <button class="tab" :class="{ act: filtroEstado === 'activos' }" @click="filtroEstado = 'activos'">
          Activos <span class="badge-tab">{{ totalActivos }}</span>
        </button>
        <button class="tab" :class="{ act: filtroEstado === 'inactivos' }" @click="filtroEstado = 'inactivos'">
          Inactivos <span class="badge-tab">{{ totalInactivos }}</span>
        </button>
      </div>
    </div>

    <!-- Estado de carga y errores -->
    <p v-if="cargando" class="muted">Cargando repartidores…</p>
    <p v-else-if="error" class="err">{{ error }}</p>

    <!-- Estado vacío -->
    <div v-else-if="!filtrados.length" class="vacio">
      <div class="v-ic">🚚</div>
      <div class="v-t">{{ busqueda ? 'Sin resultados para la búsqueda' : 'No hay repartidores registrados' }}</div>
      <div class="v-s">{{ busqueda ? 'Intenta con otro término o limpia el buscador.' : 'Crea el primer repartidor con el botón “Nuevo repartidor”.' }}</div>
    </div>

    <!-- Grid de tarjetas de repartidores -->
    <div v-else class="grid">
      <div v-for="u in filtrados" :key="u.id" class="card" @click="editar(u.id)">
        <div class="c-head">
          <div class="av">{{ ini(u.nombre) }}</div>
          <div class="info">
            <div class="nombre">{{ u.nombre }}</div>
            <div class="sub">{{ u.email }}</div>
          </div>
          <span class="badge" :class="u.activo ? 'on' : 'off'">{{ u.activo ? 'Activo' : 'Inactivo' }}</span>
        </div>

        <div class="c-actions">
          <div class="sub-links">
            <button class="btn-subaction" @click.stop="verRecorrido(u.id)" title="Ver mapa de entregas y ruta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/></svg>
              <span>Ver recorrido</span>
            </button>
            <button class="btn-subaction" @click.stop="verDeudas(u.id)" title="Ver adeudos y saldo en caja">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              <span>Deudas / Kardex</span>
            </button>
          </div>
          <div class="c-edit-link">
            <span>Editar</span>
            <ion-icon :icon="chevronForward" class="arrow" />
          </div>
        </div>
      </div>
    </div>

    <!-- Tarjeta de guía explicativa -->
    <div class="guia-card">
      <button class="guia-toggle" @click="mostrarGuia = !mostrarGuia">
        <div class="gt-l">
          <span class="gt-ic">💡</span>
          <div>
            <div class="gt-t">¿Cómo opera el rol de Repartidor en ruta?</div>
            <div class="gt-s">Conoce el ciclo diario: cargas matutinas, entregas con GPS y liquidación de cortes</div>
          </div>
        </div>
        <span class="gt-arrow">{{ mostrarGuia ? '▲ Ocultar' : '▼ Ver explicación' }}</span>
      </button>

      <div class="guia-content" v-show="mostrarGuia">
        <div class="gc-grid">
          <div class="gc-item">
            <div class="gc-num">1</div>
            <div class="gc-tx">
              <b>Carga matutina y reabastecimientos:</b> El repartidor arma su camioneta solicitando producto. Al autorizarse en almacén, el stock pasa a su custodia hasta que lo venda o devuelva.
            </div>
          </div>
          <div class="gc-item">
            <div class="gc-num">2</div>
            <div class="gc-tx">
              <b>Entregas y autoventa con GPS:</b> Cada pedido entregado y venta en ruta registra la posición satelital del teléfono, permitiendo auditar la ruta en el mapa de Recorridos.
            </div>
          </div>
          <div class="gc-item">
            <div class="gc-num">3</div>
            <div class="gc-tx">
              <b>Liquidación diaria de caja:</b> Al regresar a la distribuidora, devuelve el producto no vendido y entrega el dinero recaudado. Si hay faltantes, se registran en Deudas de Repartidores.
            </div>
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
import { chevronForward } from 'ionicons/icons'
import http from '@/api/http'

const emit = defineEmits(['ctx'])
const router = useRouter()
const items = ref([])
const cargando = ref(true)
const error = ref('')
const busqueda = ref('')
const filtroEstado = ref('todos') // 'todos', 'activos', 'inactivos'
const mostrarGuia = ref(false)

const ini = (n) => (n || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

const totalActivos = computed(() => items.value.filter((u) => u.activo).length)
const totalInactivos = computed(() => items.value.filter((u) => !u.activo).length)

const filtrados = computed(() => {
  return items.value.filter((u) => {
    if (filtroEstado.value === 'activos' && !u.activo) return false
    if (filtroEstado.value === 'inactivos' && u.activo) return false

    if (busqueda.value.trim()) {
      const q = busqueda.value.toLowerCase().trim()
      const n = (u.nombre || '').toLowerCase()
      const e = (u.email || '').toLowerCase()
      return n.includes(q) || e.includes(q)
    }
    return true
  })
})

function editar(id) {
  router.push(`/panel/repartidor/${id}`)
}

function verRecorrido(id) {
  router.push(`/panel/historial?repartidorId=${id}`)
}

function verDeudas(id) {
  if (id) {
    router.push({ path: '/panel/deudas', query: { repartidorId: id } })
  } else {
    router.push('/panel/deudas')
  }
}

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await http.get('/usuarios', { params: { rol: 'Repartidor' } })
    items.value = data || []
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudieron cargar los repartidores.'
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  emit('ctx', {
    titulo: 'Repartidores',
    sub: 'Gestión y perfiles del equipo de reparto en calle',
    back: null,
    acciones: { boton: { texto: 'Nuevo repartidor', to: '/panel/repartidor/nuevo' } }
  })
  cargar()
})
</script>

<style scoped>
.repartidores-wrap { display: flex; flex-direction: column; gap: 16px; }

/* KPIs */
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
.kpi-card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px 16px; box-shadow: var(--shadow); }
.kpi-l { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); margin-bottom: 4px; }
.kpi-v { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 24px; color: var(--ink); }
.kpi-v.text-pine { color: var(--pine); }
.kpi-v.text-muted { color: var(--muted); }
.kpi-s { font-size: 12px; color: var(--muted); margin-top: 2px; }

/* Toolbar */
.toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.busc-wrap { position: relative; flex: 1; min-width: 260px; }
.busc-ic { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; stroke: var(--muted); pointer-events: none; }
.busc-inp { width: 100%; border: 1px solid var(--line); background: var(--surface); border-radius: 12px; padding: 10px 14px 10px 38px; font-family: "Hanken Grotesk"; font-size: 14px; color: var(--ink); box-shadow: var(--shadow); }

.tabs { display: flex; gap: 4px; background: var(--paper-2); padding: 3px; border-radius: 12px; border: 1px solid var(--line); }
.tab { border: none; background: transparent; padding: 7px 12px; border-radius: 9px; font-family: "Hanken Grotesk"; font-size: 13px; font-weight: 600; color: var(--muted); cursor: pointer; display: flex; align-items: center; gap: 6px; }
.tab.act { background: var(--surface); color: var(--ink); font-weight: 700; box-shadow: 0 2px 6px rgba(0,0,0,.06); }
.badge-tab { font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 6px; background: var(--line); color: var(--ink-soft); }
.tab.act .badge-tab { background: var(--amber-soft); color: #B9781F; }

/* Vacio */
.vacio { text-align: center; padding: 48px 20px; background: var(--surface); border: 1px dashed var(--line); border-radius: 20px; }
.v-ic { font-size: 36px; margin-bottom: 8px; }
.v-t { font-family: "Bricolage Grotesque"; font-size: 17px; font-weight: 700; color: var(--ink); }
.v-s { font-size: 13px; color: var(--muted); margin-top: 4px; }

/* Grid y tarjetas */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
.card { display: flex; flex-direction: column; gap: 12px; background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 16px; box-shadow: var(--shadow); cursor: pointer; transition: all .15s ease; }
.card:hover { border-color: #B9781F; transform: translateY(-1px); box-shadow: 0 8px 18px -6px rgba(0,0,0,.1); }

.c-head { display: flex; align-items: center; gap: 13px; }
.av { width: 44px; height: 44px; border-radius: 14px; background: var(--amber-soft); display: grid; place-items: center; color: #B9781F; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 16px; flex: 0 0 auto; }
.info { flex: 1; min-width: 0; }
.nombre { font-weight: 700; font-size: 15px; color: var(--ink); }
.sub { font-size: 12.5px; color: var(--muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.badge { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; padding: 3px 9px; border-radius: 7px; flex: 0 0 auto; }
.badge.on { color: var(--pine); background: var(--pine-tint); }
.badge.off { color: var(--muted); background: var(--paper-2); }

.c-actions { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--line); padding-top: 10px; gap: 8px; flex-wrap: wrap; }
.sub-links { display: flex; gap: 6px; flex-wrap: wrap; }
.btn-subaction { display: flex; align-items: center; gap: 5px; border: none; background: transparent; color: var(--ink-soft); font-size: 12px; font-weight: 600; padding: 4px 7px; border-radius: 8px; cursor: pointer; }
.btn-subaction:hover { background: var(--paper); color: var(--pine); }
.btn-subaction svg { width: 14px; height: 14px; }
.c-edit-link { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; color: #B9781F; margin-left: auto; }
.arrow { font-size: 15px; }

.muted { color: var(--muted); margin-top: 24px; }
.err { color: var(--clay); font-weight: 600; margin-top: 24px; }

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
.gc-num { width: 22px; height: 22px; border-radius: 50%; background: var(--amber-soft); color: #B9781F; display: grid; place-items: center; font-weight: 800; font-size: 11.5px; flex: 0 0 auto; margin-top: 2px; }
.gc-tx { font-size: 12.5px; color: var(--ink-soft); line-height: 1.45; }
.gc-tx b { color: var(--ink); }
</style>
