<template>
  <div>
    <div class="resumen">
      <div class="rc"><div class="l">Gastos fijos</div><div class="v">{{ money(totalFijos) }}</div><div class="s">renta, sueldos…</div></div>
      <div class="rc"><div class="l">Gastos variables</div><div class="v">{{ money(totalVariables) }}</div><div class="s">luz, gasolina…</div></div>
      <div class="rc tot"><div class="l">Total del periodo</div><div class="v">{{ money(totalFijos + totalVariables) }}</div><div class="s">{{ periodoTxt }}</div></div>
    </div>

    <div class="filtros">
      <div class="tabs">
        <button v-for="t in tabsTipo" :key="t.k" :class="{ on: tipo === t.k }" @click="setTipo(t.k)">{{ t.t }}</button>
      </div>
      <div class="tabs">
        <button v-for="p in tabsPeriodo" :key="p.k" :class="{ on: periodo === p.k }" @click="setPeriodo(p.k)">{{ p.t }}</button>
      </div>
    </div>

    <p v-if="cargando" class="muted">Cargando…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else-if="!items.length" class="muted">No hay gastos en este periodo. Agrega uno con “Nuevo gasto”.</p>

    <div class="grid">
      <div v-for="g in items" :key="g.id" class="card" @click="editar(g.id)">
        <div class="chip" :class="g.tipo === 'Fijo' ? 'fijo' : 'var'"><ion-icon :icon="g.tipo === 'Fijo' ? repeatOutline : flashOutline" /></div>
        <div class="info">
          <div class="concepto">{{ g.concepto }}</div>
          <div class="sub"><span class="badge" :class="g.tipo === 'Fijo' ? 'fijo' : 'var'">{{ g.tipo }}</span> · {{ fecha(g.fecha) }}</div>
        </div>
        <div class="monto">{{ money(g.monto) }}</div>
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
const periodo = ref('mes')  // 'mes', 'mesPasado', 'todo'

const tabsTipo = [{ k: '', t: 'Todos' }, { k: 'Fijo', t: 'Fijos' }, { k: 'Variable', t: 'Variables' }]
const tabsPeriodo = [{ k: 'mes', t: 'Este mes' }, { k: 'mesPasado', t: 'Mes pasado' }, { k: 'todo', t: 'Todo' }]

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const fecha = (f) => new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
const totalFijos = computed(() => items.value.filter((g) => g.tipo === 'Fijo').reduce((s, g) => s + g.monto, 0))
const totalVariables = computed(() => items.value.filter((g) => g.tipo === 'Variable').reduce((s, g) => s + g.monto, 0))
const periodoTxt = computed(() => tabsPeriodo.find((p) => p.k === periodo.value)?.t || '')

function rango() {
  const hoy = new Date()
  if (periodo.value === 'mes') {
    const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    return { desde: desde.toISOString(), hasta: hoy.toISOString() }
  }
  if (periodo.value === 'mesPasado') {
    const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
    const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 23, 59, 59)
    return { desde: desde.toISOString(), hasta: hasta.toISOString() }
  }
  return { desde: null, hasta: null }
}
function editar(id) { router.push(`/panel/gasto/${id}`) }
function setTipo(k) { tipo.value = k; cargar() }
function setPeriodo(k) { periodo.value = k; cargar() }
async function cargar() {
  cargando.value = true; error.value = ''
  try {
    const { desde, hasta } = rango()
    const params = { tamano: 200 }
    if (tipo.value) params.tipo = tipo.value
    if (desde) params.desde = desde
    if (hasta) params.hasta = hasta
    const { data } = await http.get('/gastos', { params })
    items.value = data.items
  } catch (e) { error.value = e.response?.data?.mensaje || 'No se pudieron cargar los gastos.' }
  finally { cargando.value = false }
}
onMounted(() => { emit('ctx', { titulo: 'Gastos', sub: 'Gastos fijos y variables del negocio', back: null, acciones: { boton: { texto: 'Nuevo gasto', to: '/panel/gasto/nuevo' } } }); cargar() })
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; } .err { color: var(--clay); font-weight: 600; margin-top: 16px; }
.resumen { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.rc { flex: 1; min-width: 150px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px 16px; box-shadow: var(--shadow); }
.rc .l { font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
.rc .v { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 24px; margin-top: 4px; font-variant-numeric: tabular-nums; }
.rc .s { font-size: 12px; color: var(--muted); margin-top: 2px; }
.rc.tot { background: var(--ink); } .rc.tot .l, .rc.tot .s { color: #9FB3AB; } .rc.tot .v { color: #fff; }
.filtros { display: flex; gap: 12px; justify-content: space-between; flex-wrap: wrap; margin-bottom: 16px; }
.tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.tabs button { border: 1px solid var(--line); background: var(--surface); color: var(--muted); font-family: "Hanken Grotesk"; font-weight: 700; font-size: 13px; padding: 8px 14px; border-radius: 11px; cursor: pointer; box-shadow: var(--shadow); }
.tabs button.on { background: var(--pine); color: #fff; border-color: var(--pine); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
.card { display: flex; align-items: center; gap: 13px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px; box-shadow: var(--shadow); cursor: pointer; }
.chip { width: 42px; height: 42px; border-radius: 11px; display: grid; place-items: center; flex: 0 0 auto; }
.chip ion-icon { font-size: 20px; }
.chip.fijo { background: var(--sky-soft); } .chip.fijo ion-icon { color: var(--sky); }
.chip.var { background: var(--amber-soft); } .chip.var ion-icon { color: #B9781F; }
.info { flex: 1; min-width: 0; }
.concepto { font-weight: 700; font-size: 15px; }
.sub { font-size: 12px; color: var(--muted); margin-top: 3px; }
.badge { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; padding: 2px 7px; border-radius: 6px; }
.badge.fijo { color: var(--sky); background: var(--sky-soft); } .badge.var { color: #B9781F; background: var(--amber-soft); }
.monto { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; font-variant-numeric: tabular-nums; flex: 0 0 auto; }
</style>
