<template>
  <div class="gastos-wrap">
    <!-- Tarjetas de Resumen KPI -->
    <div class="resumen">
      <div class="rc">
        <div class="l">Gastos fijos</div>
        <div class="v">{{ money(totalFijos) }}</div>
        <div class="s">Renta, sueldos, seguros…</div>
      </div>
      <div class="rc">
        <div class="l">Gastos variables</div>
        <div class="v">{{ money(totalVariables) }}</div>
        <div class="s">Gasolina, luz, maniobras…</div>
      </div>
      <div class="rc tot">
        <div class="l">Total del periodo</div>
        <div class="v">{{ money(totalFijos + totalVariables) }}</div>
        <div class="s">{{ periodoTxt }}</div>
      </div>
    </div>

    <!-- Barra de Filtros y Búsqueda -->
    <div class="filtros-bar">
      <!-- Selector de Tipo (Todos / Fijos / Variables) -->
      <div class="tabs-group">
        <button 
          v-for="t in tabsTipo" 
          :key="t.k" 
          class="f-tab" 
          :class="{ on: tipo === t.k }" 
          @click="setTipo(t.k)"
        >
          {{ t.t }}
        </button>
      </div>

      <!-- Presets de Periodo o Personalizado -->
      <div class="tabs-group">
        <button 
          v-for="p in tabsPeriodo" 
          :key="p.k" 
          class="f-tab" 
          :class="{ on: periodo === p.k }" 
          @click="setPeriodo(p.k)"
        >
          {{ p.t }}
        </button>
      </div>

      <!-- Buscador por concepto -->
      <div class="search-box">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input 
          v-model="busqueda" 
          placeholder="Buscar por concepto (ej. gasolina, renta)…"
        >
        <button v-if="busqueda" class="clear-btn" @click="busqueda = ''">×</button>
      </div>
    </div>

    <!-- Selector de rango personalizado (si periodo === 'personalizado') -->
    <div v-if="periodo === 'personalizado'" class="custom-range-bar">
      <div class="fld"><span class="fl">Desde</span><input type="date" v-model="fechaDesde" @change="cargar()"></div>
      <div class="fld"><span class="fl">Hasta</span><input type="date" v-model="fechaHasta" @change="cargar()"></div>
    </div>

    <!-- Lista de gastos -->
    <p v-if="cargando" class="muted">Cargando gastos…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else-if="!itemsFiltrados.length" class="muted">
      {{ busqueda ? 'No se encontraron gastos con ese concepto.' : 'No hay gastos en este periodo. Agrega uno con "Nuevo gasto".' }}
    </p>

    <div class="grid" v-if="!cargando && itemsFiltrados.length">
      <div v-for="g in itemsFiltrados" :key="g.id" class="card" @click="editar(g.id)">
        <div class="chip" :class="g.tipo === 'Fijo' ? 'fijo' : 'var'">
          <ion-icon :icon="g.tipo === 'Fijo' ? repeatOutline : flashOutline" />
        </div>
        <div class="info">
          <div class="concepto">{{ g.concepto }}</div>
          <div class="sub">
            <span class="badge" :class="g.tipo === 'Fijo' ? 'fijo' : 'var'">{{ g.tipo }}</span>
            · {{ fecha(g.fecha) }}
          </div>
        </div>
        <div class="monto">{{ money(g.monto) }}</div>
      </div>
    </div>

    <!-- Guía Educativa: ¿Cómo impactan los gastos? -->
    <div class="guide-card">
      <div class="guide-top">
        <div class="guide-icon">
          <svg viewBox="0 0 24 24"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div>
          <h3 class="guide-title">¿Cómo impactan los gastos fijos y variables en tu negocio?</h3>
          <p class="guide-subtitle">Aprende a clasificarlos correctamente para calcular tu punto de equilibrio y utilidad neta.</p>
        </div>
      </div>
      <div class="guide-grid">
        <div class="g-item">
          <div class="g-head"><span class="g-num">1</span><h4>Gastos Fijos</h4></div>
          <p>Son pagos recurrentes que <b>no dependen</b> del volumen de ventas: renta de bodegas, sueldos base, seguros o internet. Debes cubrirlos mes con mes vendas mucho o poco.</p>
        </div>
        <div class="g-item">
          <div class="g-head"><span class="g-num">2</span><h4>Gastos Variables</h4></div>
          <p>Costos que <b>aumentan o disminuyen</b> según el nivel de operación: combustible para rutas, luz por cámaras de refrigeración, comisiones o maniobras de carga.</p>
        </div>
        <div class="g-item">
          <div class="g-head"><span class="g-num">3</span><h4>Punto de Equilibrio</h4></div>
          <p>Es la meta mínima de ventas que tu distribuidora debe alcanzar en el periodo para que la utilidad bruta cubra exactamente todos tus gastos fijos y variables sin pérdidas.</p>
        </div>
        <div class="g-item">
          <div class="g-head"><span class="g-num">4</span><h4>Impacto en Utilidad Neta</h4></div>
          <p>Tus gastos se descuentan automáticamente de la utilidad bruta en el <b>Dashboard</b> y en el módulo de <b>Proyecciones</b> para mostrarte tu ganancia líquida real.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { IonIcon } from '@ionic/vue'
import { repeatOutline, flashOutline } from 'ionicons/icons'
import http from '@/api/http'

const emit = defineEmits(['ctx'])
const router = useRouter()
const items = ref([])
const cargando = ref(true)
const error = ref('')

const tipo = ref('')        // '', 'Fijo', 'Variable'
const periodo = ref('mes')  // 'mes', 'mesPasado', 'personalizado', 'todo'
const busqueda = ref('')

const hoyStr = new Date().toISOString().slice(0, 10)
const fechaDesde = ref(hoyStr)
const fechaHasta = ref(hoyStr)

const tabsTipo = [
  { k: '', t: 'Todos' },
  { k: 'Fijo', t: 'Fijos' },
  { k: 'Variable', t: 'Variables' }
]

const tabsPeriodo = [
  { k: 'mes', t: 'Este mes' },
  { k: 'mesPasado', t: 'Mes pasado' },
  { k: 'personalizado', t: 'Personalizado' },
  { k: 'todo', t: 'Todo' }
]

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fecha = (f) => new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })

const totalFijos = computed(() => items.value.filter((g) => g.tipo === 'Fijo').reduce((s, g) => s + g.monto, 0))
const totalVariables = computed(() => items.value.filter((g) => g.tipo === 'Variable').reduce((s, g) => s + g.monto, 0))
const periodoTxt = computed(() => tabsPeriodo.find((p) => p.k === periodo.value)?.t || '')

// Filtro en vivo por concepto
const itemsFiltrados = computed(() => {
  if (!busqueda.value.trim()) return items.value
  const q = busqueda.value.toLowerCase().trim()
  return items.value.filter((g) => (g.concepto || '').toLowerCase().includes(q))
})

function rango() {
  const hoy = new Date()
  if (periodo.value === 'mes') {
    // Desde el día 1 del mes actual hasta el último milisegundo del mes actual
    const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1, 0, 0, 0)
    const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59, 999)
    return { desde: desde.toISOString(), hasta: hasta.toISOString() }
  }
  if (periodo.value === 'mesPasado') {
    const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1, 0, 0, 0)
    const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 23, 59, 59, 999)
    return { desde: desde.toISOString(), hasta: hasta.toISOString() }
  }
  if (periodo.value === 'personalizado') {
    const d = new Date(`${fechaDesde.value}T00:00:00`)
    const h = new Date(`${fechaHasta.value}T23:59:59.999`)
    return { desde: d.toISOString(), hasta: h.toISOString() }
  }
  return { desde: null, hasta: null }
}

function editar(id) { router.push(`/panel/gasto/${id}`) }
function setTipo(k) { tipo.value = k; cargar() }
function setPeriodo(k) { periodo.value = k; cargar() }

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const { desde, hasta } = rango()
    const params = { tamano: 300 }
    if (tipo.value) params.tipo = tipo.value
    if (desde) params.desde = desde
    if (hasta) params.hasta = hasta
    const { data } = await http.get('/gastos', { params })
    items.value = data.items
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudieron cargar los gastos.'
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  emit('ctx', {
    titulo: 'Gastos',
    sub: 'Control de gastos fijos y variables del negocio',
    back: null,
    acciones: { boton: { texto: 'Nuevo gasto', to: '/panel/gasto/nuevo' } }
  })
  cargar()
})
</script>

<style scoped>
.gastos-wrap { padding-bottom: 30px; }
.muted { color: var(--muted); margin-top: 24px; }
.err { color: var(--clay); font-weight: 600; margin-top: 16px; }

/* Resumen KPI */
.resumen { display: flex; gap: 14px; margin-bottom: 20px; flex-wrap: wrap; }
.rc {
  flex: 1;
  min-width: 170px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 18px 20px;
  box-shadow: var(--shadow);
}
.rc .l { font-size: 11px; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
.rc .v { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 26px; margin-top: 6px; font-variant-numeric: tabular-nums; }
.rc .s { font-size: 12px; color: var(--muted); margin-top: 3px; font-weight: 500; }
.rc.tot { background: var(--ink); color: #fff; }
.rc.tot .l, .rc.tot .s { color: #A4B8B0; }
.rc.tot .v { color: #fff; }

/* Barra de filtros */
.filtros-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.tabs-group {
  display: flex;
  gap: 4px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 3px;
}
.f-tab {
  border: none;
  background: transparent;
  color: var(--muted);
  font-family: "Hanken Grotesk", sans-serif;
  font-weight: 700;
  font-size: 12.5px;
  padding: 8px 14px;
  border-radius: 9px;
  cursor: pointer;
  transition: all .15s;
}
.f-tab.on {
  background: var(--surface);
  color: var(--ink);
  box-shadow: 0 1px 3px rgba(0,0,0,.1);
}

/* Buscador */
.search-box {
  display: flex;
  align-items: center;
  gap: 9px;
  background: var(--surface);
  border: 1.5px solid var(--line);
  border-radius: 12px;
  padding: 8px 14px;
  min-width: 260px;
  box-shadow: var(--shadow);
}
.search-box svg { width: 17px; height: 17px; stroke: var(--muted); fill: none; stroke-width: 2.2; }
.search-box input { border: none; background: transparent; outline: none; font-family: "Hanken Grotesk", sans-serif; font-size: 13.5px; font-weight: 500; color: var(--ink); width: 100%; }
.clear-btn { background: none; border: none; font-size: 18px; color: var(--muted); cursor: pointer; }

/* Rango personalizado */
.custom-range-bar {
  display: flex;
  gap: 14px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px 18px;
  margin-bottom: 16px;
  align-items: center;
  box-shadow: var(--shadow);
}
.fld { display: flex; flex-direction: column; gap: 3px; }
.fld .fl { font-size: 10.5px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; color: var(--muted); }
.fld input { border: 1px solid var(--line); background: var(--paper); border-radius: 9px; padding: 7px 11px; font-family: "Hanken Grotesk", sans-serif; font-size: 13.5px; font-weight: 600; color: var(--ink); }

/* Grid de tarjetas */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; margin-bottom: 24px; }
.card { display: flex; align-items: center; gap: 13px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 15px; box-shadow: var(--shadow); cursor: pointer; transition: transform .15s; }
.card:hover { transform: translateY(-1px); }
.chip { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; flex: 0 0 auto; }
.chip ion-icon { font-size: 20px; }
.chip.fijo { background: var(--sky-soft); } .chip.fijo ion-icon { color: var(--sky); }
.chip.var { background: var(--amber-soft); } .chip.var ion-icon { color: #B9781F; }
.info { flex: 1; min-width: 0; }
.concepto { font-weight: 700; font-size: 15px; color: var(--ink); }
.sub { font-size: 12px; color: var(--muted); margin-top: 3px; }
.badge { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .03em; padding: 2px 7px; border-radius: 6px; }
.badge.fijo { background: var(--sky-soft); color: var(--sky); }
.badge.var { background: var(--amber-soft); color: #B9781F; }
.monto { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 18px; font-variant-numeric: tabular-nums; color: var(--ink); }

/* Guía Educativa */
.guide-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow);
  margin-top: 24px;
}
.guide-top { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
.guide-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--pine-tint);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.guide-icon svg { width: 22px; height: 22px; stroke: var(--pine); fill: none; stroke-width: 2.2; }
.guide-title { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 17px; color: var(--ink); margin: 0; }
.guide-subtitle { font-size: 12.5px; color: var(--muted); margin-top: 2px; }
.guide-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 16px; }
.g-item { background: var(--paper); border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 14px 16px; }
.g-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.g-num { width: 20px; height: 20px; border-radius: 50%; background: var(--pine); color: #fff; font-size: 11px; font-weight: 800; display: grid; place-items: center; flex-shrink: 0; }
.g-head h4 { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 13px; color: var(--ink); margin: 0; }
.g-item p { font-size: 12px; line-height: 1.45; color: var(--ink-soft); margin: 0; }
.g-item p b { color: var(--ink); }
</style>
