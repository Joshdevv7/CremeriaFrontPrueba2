<template>
  <div>
    <!-- Filtros de fecha -->
    <div class="filtros">
      <div class="modo">
        <button :class="{ on: modo === 'dia' }" @click="setModo('dia')">Por día</button>
        <button :class="{ on: modo === 'rango' }" @click="setModo('rango')">Por rango</button>
      </div>
      <div class="fechas">
        <template v-if="modo === 'dia'">
          <div class="fld"><span class="fl">Día</span><input type="date" v-model="dia" @change="recargar1()"></div>
        </template>
        <template v-else>
          <div class="fld"><span class="fl">Desde</span><input type="date" v-model="desde" @change="recargar1()"></div>
          <div class="fld"><span class="fl">Hasta</span><input type="date" v-model="hasta" @change="recargar1()"></div>
        </template>
      </div>
    </div>

    <!-- Resumen del periodo -->
    <div class="resumen">
      <div class="rz">
        <div class="rz-k">Total transferencias del periodo</div>
        <div class="rz-v">{{ money2(totalPeriodo) }}<span class="mxn">MXN</span></div>
      </div>
      <div class="rz-stats">
        <div class="st"><span class="k">Movimientos</span><span class="v">{{ cantidadTotal }}</span></div>
        <div class="st"><span class="k">Pendientes de folio</span><span class="v amber">{{ pendientes }}</span></div>
      </div>
    </div>

    <p v-if="cargando" class="muted">Cargando transferencias…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else-if="!items.length" class="muted">No hay transferencias en este periodo.</p>

    <div class="grid" v-if="!cargando && items.length">
      <div v-for="t in items" :key="t.id" class="card" :class="{ pend: t.estadoPago === 'Pendiente' }">
        <div class="ic"><svg viewBox="0 0 24 24"><path d="M4 9h16M4 15h16M8 5l-4 4 4 4M16 11l4 4-4 4"/></svg></div>
        <div class="info">
          <div class="top">
            <span class="cli">{{ t.clienteNombreMostrar || t.clienteNombre }}</span>
            <span v-if="t.estadoPago === 'Pendiente'" class="badge pend">Pendiente de folio</span>
          </div>
          <div class="sub">
            <span class="folio" v-if="t.estadoPago !== 'Pendiente'">Folio: <b>{{ referencia(t) }}</b></span>
            <span class="folio pendtxt" v-else>Sin folio aún</span>
            · #{{ t.id }} · {{ fecha(t.fecha) }}
          </div>
        </div>
        <div class="monto">{{ money2(t.total) }}</div>
      </div>
    </div>

    <!-- Paginación -->
    <div class="pager" v-if="!cargando && totalPaginas > 1">
      <button class="pg" :disabled="pagina <= 1" @click="irPagina(pagina - 1)"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>
      <button v-for="n in paginasVisibles" :key="n" class="pg num" :class="{ on: n === pagina }" @click="irPagina(n)">{{ n }}</button>
      <button class="pg" :disabled="pagina >= totalPaginas" @click="irPagina(pagina + 1)"><svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></button>
    </div>
    <p v-if="!cargando && total" class="cuenta">{{ total }} transferencia(s) · página {{ pagina }} de {{ totalPaginas }}</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import http from '@/api/http'

const emit = defineEmits(['ctx'])
const items = ref([])
const resumenPeriodo = ref({ total: 0, cantidad: 0, pendientes: 0 })
const cargando = ref(true)
const error = ref('')

// fechas
const modo = ref('dia')
const hoyStr = new Date().toISOString().slice(0, 10)
const dia = ref(hoyStr)
const desde = ref(hoyStr)
const hasta = ref(hoyStr)

// paginación
const pagina = ref(1)
const tamano = ref(30)
const total = ref(0)
const totalPaginas = computed(() => Math.max(1, Math.ceil(total.value / tamano.value)))
const paginasVisibles = computed(() => {
  const tp = totalPaginas.value, actual = pagina.value
  const rango = []
  let ini = Math.max(1, actual - 2), fin = Math.min(tp, ini + 4)
  ini = Math.max(1, fin - 4)
  for (let i = ini; i <= fin; i++) rango.push(i)
  return rango
})

const money2 = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fecha = (f) => new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
const referencia = (t) => t.referenciaPago || '—'

// El total del periodo se calcula sobre lo que trae la página; para el total real de todas
// las páginas usamos el acumulado del backend si estuviera, pero aquí sumamos lo visible.
const totalPeriodo = computed(() => resumenPeriodo.value.total)
const pendientes = computed(() => resumenPeriodo.value.pendientes)
const cantidadTotal = computed(() => resumenPeriodo.value.cantidad)

function setModo(m) { modo.value = m; recargar1() }
function recargar1() { pagina.value = 1; cargar() }
function irPagina(n) { if (n < 1 || n > totalPaginas.value) return; pagina.value = n }

// Construye desde/hasta en ISO según el modo. Para "día", cubre las 24h de ese día.
function rangoFechas() {
  if (modo.value === 'dia') {
    const d = dia.value
    return { desde: `${d}T00:00:00`, hasta: `${d}T23:59:59` }
  }
  return { desde: `${desde.value}T00:00:00`, hasta: `${hasta.value}T23:59:59` }
}

async function cargar() {
  cargando.value = true; error.value = ''
  try {
    const r = rangoFechas()
    const params = {
      metodoPago: 'Transferencia',
      desde: r.desde, hasta: r.hasta,
      pagina: pagina.value, tamano: tamano.value
    }
    const [lista, resumen] = await Promise.all([
      http.get('/pedidos', { params }),
      http.get('/pedidos/transferencias/resumen', { params: { desde: r.desde, hasta: r.hasta } })
    ])
    items.value = lista.data.items
    total.value = lista.data.total ?? lista.data.items.length
    resumenPeriodo.value = resumen.data
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudieron cargar las transferencias.'
  } finally { cargando.value = false }
}

watch(pagina, cargar)

onMounted(() => {
  emit('ctx', { titulo: 'Transferencias', sub: 'Conciliación de pagos por transferencia', back: null })
  cargar()
})
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; }
.err { color: var(--clay); font-weight: 600; margin-top: 24px; }

.filtros { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; margin-bottom: 16px; }
.modo { display: flex; gap: 6px; background: var(--paper); border: 1px solid var(--line); border-radius: 12px; padding: 3px; }
.modo button { border: none; background: transparent; color: var(--muted); border-radius: 9px; padding: 9px 16px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13px; cursor: pointer; transition: .15s; }
.modo button.on { background: var(--surface); color: var(--ink); box-shadow: 0 1px 3px rgba(0,0,0,.1); }
.fechas { display: flex; gap: 10px; }
.fld { display: flex; flex-direction: column; gap: 4px; }
.fld .fl { font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--muted); }
.fld input { border: 1px solid var(--line); background: var(--surface); border-radius: 10px; padding: 9px 12px; font-family: "Hanken Grotesk"; font-size: 14px; font-weight: 600; color: var(--ink); }

.resumen { background: linear-gradient(155deg,var(--sky),#255d78); border-radius: 20px; padding: 20px; color: #fff; margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; box-shadow: 0 18px 36px -20px rgba(46,111,142,.9); }
.rz-k { font-size: 13px; color: #CFE3EC; font-weight: 600; }
.rz-v { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 34px; letter-spacing: -.02em; margin-top: 4px; font-variant-numeric: tabular-nums; }
.rz-v .mxn { font-size: 14px; color: #CFE3EC; font-weight: 600; margin-left: 7px; }
.rz-stats { display: flex; gap: 12px; }
.st { background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.16); border-radius: 14px; padding: 11px 16px; text-align: center; }
.st .k { font-size: 11px; color: #CFE3EC; font-weight: 600; letter-spacing: .03em; text-transform: uppercase; display: block; }
.st .v { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 20px; margin-top: 3px; display: block; }
.st .v.amber { color: #FFD79A; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 11px; }
.card { display: flex; align-items: center; gap: 13px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px; box-shadow: var(--shadow); }
.card.pend { border-color: var(--amber-soft); background: linear-gradient(0deg, var(--amber-soft) 0%, var(--surface) 60%); }
.card .ic { width: 42px; height: 42px; border-radius: 12px; background: var(--sky-soft); display: grid; place-items: center; flex: 0 0 auto; }
.card .ic svg { width: 20px; height: 20px; stroke: var(--sky); fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.card .info { flex: 1; min-width: 0; }
.card .top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.card .cli { font-weight: 700; font-size: 15px; }
.card .sub { font-size: 12.5px; color: var(--muted); margin-top: 3px; }
.card .folio b { color: var(--ink-soft); font-variant-numeric: tabular-nums; }
.card .folio.pendtxt { color: var(--amber); font-weight: 600; }
.card .monto { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; font-variant-numeric: tabular-nums; flex: 0 0 auto; }
.badge { font-size: 10px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; padding: 3px 8px; border-radius: 7px; }
.badge.pend { color: #B9781F; background: var(--amber-soft); }

.pager { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 22px; }
.pg { min-width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); display: grid; place-items: center; cursor: pointer; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; color: var(--ink-soft); padding: 0 6px; }
.pg svg { width: 17px; height: 17px; stroke: var(--ink-soft); fill: none; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.pg:disabled { opacity: .4; cursor: default; }
.pg.num.on { background: var(--sky); color: #fff; border-color: var(--sky); }
.cuenta { text-align: center; color: var(--muted); font-size: 12px; font-weight: 600; margin-top: 10px; }
</style>
