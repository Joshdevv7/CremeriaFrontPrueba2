<template>
  <div class="vendedores-wrap">
    <!-- Métricas KPI -->
    <div class="kpis">
      <div class="kpi-card">
        <div class="kpi-l">Total vendedores</div>
        <div class="kpi-v">{{ items.length }}</div>
        <div class="kpi-s">Personal de mostrador</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-l">Vendedores activos</div>
        <div class="kpi-v text-pine">{{ totalActivos }}</div>
        <div class="kpi-s">Con acceso al sistema</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-l">Inactivos / Bajas</div>
        <div class="kpi-v text-muted">{{ totalInactivos }}</div>
        <div class="kpi-s">Acceso restringido</div>
      </div>
    </div>

    <!-- Barra de búsqueda y filtros -->
    <div class="toolbar">
      <div class="busc-wrap">
        <svg class="busc-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input class="busc-inp" type="text" v-model="busqueda" placeholder="Buscar por nombre o correo…">
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
    <p v-if="cargando" class="muted">Cargando vendedores…</p>
    <p v-else-if="error" class="err">{{ error }}</p>

    <!-- Estado vacío -->
    <div v-else-if="!filtrados.length" class="vacio">
      <div class="v-ic">🏪</div>
      <div class="v-t">{{ busqueda ? 'Sin resultados para la búsqueda' : 'No hay vendedores registrados' }}</div>
      <div class="v-s">{{ busqueda ? 'Intenta con otro término o limpia el buscador.' : 'Crea el primer vendedor con el botón “Nuevo vendedor”.' }}</div>
    </div>

    <!-- Grid de tarjetas de vendedores -->
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
          <button class="btn-subaction" @click.stop="verCortes(u.id)" title="Ver cortes de caja">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
            <span>Ver cortes y ventas</span>
          </button>
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
            <div class="gt-t">¿Cómo funciona el rol de Vendedor de Mostrador?</div>
            <div class="gt-s">Conoce las responsabilidades, operaciones de venta y control de cortes de caja</div>
          </div>
        </div>
        <span class="gt-arrow">{{ mostrarGuia ? '▲ Ocultar' : '▼ Ver explicación' }}</span>
      </button>

      <div class="guia-content" v-show="mostrarGuia">
        <div class="gc-grid">
          <div class="gc-item">
            <div class="gc-num">1</div>
            <div class="gc-tx">
              <b>Ventas en tienda o mostrador:</b> El vendedor atiende clientes que llegan directamente al local. No requiere tener una carga física de camión asignada.
            </div>
          </div>
          <div class="gc-item">
            <div class="gc-num">2</div>
            <div class="gc-tx">
              <b>Cortes de caja diarios:</b> Al finalizar su turno, el vendedor genera su corte en la app entregando el efectivo acumulado. El administrador lo valida y concilia en la pantalla de Cortes.
            </div>
          </div>
          <div class="gc-item">
            <div class="gc-num">3</div>
            <div class="gc-tx">
              <b>Control de acceso:</b> Puedes desactivar temporalmente una cuenta marcándola como "Inactiva". Esto impedirá inmediatamente que inicie sesión sin perder su historial de ventas ni auditorías.
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
    // Filtro por estatus
    if (filtroEstado.value === 'activos' && !u.activo) return false
    if (filtroEstado.value === 'inactivos' && u.activo) return false

    // Filtro por texto
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
  router.push(`/panel/vendedor/${id}`)
}

function verCortes(id) {
  router.push(`/panel/cortes`)
}

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await http.get('/usuarios', { params: { rol: 'Vendedor' } })
    items.value = data || []
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudieron cargar los vendedores.'
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  emit('ctx', {
    titulo: 'Vendedores',
    sub: 'Gestión y perfiles del equipo de venta en mostrador',
    back: null,
    acciones: { boton: { texto: 'Nuevo vendedor', to: '/panel/vendedor/nuevo' } }
  })
  cargar()
})
</script>

<style scoped>
.vendedores-wrap { display: flex; flex-direction: column; gap: 16px; }

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
.tab.act .badge-tab { background: var(--pine-tint); color: var(--pine); }

/* Vacio */
.vacio { text-align: center; padding: 48px 20px; background: var(--surface); border: 1px dashed var(--line); border-radius: 20px; }
.v-ic { font-size: 36px; margin-bottom: 8px; }
.v-t { font-family: "Bricolage Grotesque"; font-size: 17px; font-weight: 700; color: var(--ink); }
.v-s { font-size: 13px; color: var(--muted); margin-top: 4px; }

/* Grid y tarjetas */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
.card { display: flex; flex-direction: column; gap: 12px; background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 16px; box-shadow: var(--shadow); cursor: pointer; transition: all .15s ease; }
.card:hover { border-color: var(--pine); transform: translateY(-1px); box-shadow: 0 8px 18px -6px rgba(0,0,0,.1); }

.c-head { display: flex; align-items: center; gap: 13px; }
.av { width: 44px; height: 44px; border-radius: 14px; background: var(--sky-soft); display: grid; place-items: center; color: var(--sky); font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 16px; flex: 0 0 auto; }
.info { flex: 1; min-width: 0; }
.nombre { font-weight: 700; font-size: 15px; color: var(--ink); }
.sub { font-size: 12.5px; color: var(--muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.badge { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; padding: 3px 9px; border-radius: 7px; flex: 0 0 auto; }
.badge.on { color: var(--pine); background: var(--pine-tint); }
.badge.off { color: var(--muted); background: var(--paper-2); }

.c-actions { display: flex; align-items: center; justify-content: space-between; pt: 10px; border-top: 1px solid var(--line); padding-top: 10px; }
.btn-subaction { display: flex; align-items: center; gap: 6px; border: none; background: transparent; color: var(--ink-soft); font-size: 12.5px; font-weight: 600; padding: 4px 8px; border-radius: 8px; cursor: pointer; }
.btn-subaction:hover { background: var(--paper); color: var(--pine); }
.btn-subaction svg { width: 14px; height: 14px; }
.c-edit-link { display: flex; align-items: center; gap: 4px; font-size: 12.5px; font-weight: 700; color: var(--pine); }
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
.gc-num { width: 22px; height: 22px; border-radius: 50%; background: var(--sky-soft); color: var(--sky); display: grid; place-items: center; font-weight: 800; font-size: 11.5px; flex: 0 0 auto; margin-top: 2px; }
.gc-tx { font-size: 12.5px; color: var(--ink-soft); line-height: 1.45; }
.gc-tx b { color: var(--ink); }
</style>
