<template>
  <div>
    <!-- Filtros por estado -->
    <div class="chips">
      <button class="chip" :class="{ on: filtro === 'todos' }" @click="setFiltro('todos')">Todos</button>
      <button class="chip" :class="{ on: filtro === 'Incompleto' }" @click="setFiltro('Incompleto')">
        Incompletos<span v-if="conteoIncompletos" class="ch-badge">{{ conteoIncompletos }}</span>
      </button>
      <button class="chip" :class="{ on: filtro === 'Justificado' }" @click="setFiltro('Justificado')">Justificados</button>
      <button class="chip" :class="{ on: filtro === 'Completo' }" @click="setFiltro('Completo')">Completos</button>
    </div>

    <p v-if="cargando" class="muted">Cargando cortes…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else-if="!visibles.length" class="muted">No hay cortes en este filtro.</p>

    <div v-else class="grid">
      <div v-for="c in visibles" :key="c.id" class="card" :class="claseEstado(c.estado)">
        <div class="c-top">
          <div class="c-rep">
            <div class="av" :class="claseEstado(c.estado)">{{ ini(c.repartidorNombre) }}</div>
            <div>
              <div class="nm">{{ c.repartidorNombre }}</div>
              <div class="meta">Corte #{{ c.id }}<span v-if="c.cargaId"> · Carga #{{ c.cargaId }}</span> · {{ fecha(c.fecha) }}</div>
            </div>
          </div>
          <span class="badge" :class="claseEstado(c.estado)">{{ etiqueta(c.estado) }}</span>
        </div>
        <div class="c-nums">
          <div class="n"><span class="k">Ventas</span><span class="v">{{ money(c.totalVentas) }}</span></div>
          <div class="n"><span class="k">Diferencia</span><span class="v" :class="{ neg: c.diferencia < 0, pos: c.diferencia > 0 }">{{ signo(c.diferencia) }}{{ money(Math.abs(c.diferencia)) }}</span></div>
          <div class="n" v-if="c.faltantePorJustificar > 0"><span class="k">Por justificar</span><span class="v neg">{{ money(c.faltantePorJustificar) }}</span></div>
        </div>
        <button v-if="c.faltantePorJustificar > 0" class="just" @click="abrir(c)">Justificar faltante</button>
      </div>
    </div>

    <!-- Modal de justificación -->
    <div v-if="modal" class="modal-bg" @click.self="cerrar()">
      <div class="modal">
        <div class="m-head">
          <div>
            <div class="m-title">Justificar faltante</div>
            <div class="m-sub">{{ modal.repartidorNombre }} · Corte #{{ modal.id }}</div>
          </div>
          <button class="m-x" @click="cerrar()"><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div class="m-body">
          <div class="falta">
            <span class="fl">Falta por justificar</span>
            <span class="fv">{{ money(porJustificar) }}</span>
          </div>

          <!-- Justificaciones ya registradas -->
          <div v-if="detalle && detalle.justificaciones.length" class="ya">
            <div class="ya-t">Ya justificado</div>
            <div class="ya-row" v-for="j in detalle.justificaciones" :key="j.id">
              <span class="yr-tipo" :class="j.tipo">{{ etiquetaTipo(j.tipo) }}</span>
              <span class="yr-con">{{ j.concepto }}</span>
              <span class="yr-mon">{{ money(j.monto) }}</span>
            </div>
          </div>

          <template v-if="porJustificar > 0">
            <div class="fl2">¿En qué se fue?</div>
            <div class="tipos">
              <button class="tp" :class="{ on: tipo === 'GastoVariable' }" @click="tipo = 'GastoVariable'">
                <svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>
                Gasto variable
              </button>
              <button class="tp" :class="{ on: tipo === 'GastoFijo' }" @click="tipo = 'GastoFijo'">
                <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/></svg>
                Gasto fijo
              </button>
              <button class="tp" :class="{ on: tipo === 'DeudaRepartidor' }" @click="tipo = 'DeudaRepartidor'">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6"/></svg>
                Deuda del repartidor
              </button>
            </div>
            <div class="campo">
              <div class="fl2">Concepto</div>
              <input class="inp" v-model="concepto" :placeholder="placeholderConcepto">
            </div>
            <div class="campo">
              <div class="fl2">Monto</div>
              <div class="mwrap">
                <span class="pfx">$</span>
                <input class="inp mono" type="number" step="0.01" v-model.number="monto">
              </div>
            </div>
            <p class="hint" v-if="tipo !== 'DeudaRepartidor'">Se registrará como un gasto real en el módulo de Gastos.</p>
            <p class="hint" v-else>Se sumará al saldo que debe {{ modal.repartidorNombre }}.</p>
            <p v-if="modalError" class="m-err">{{ modalError }}</p>
          </template>
          <p v-else class="listo">Este faltante ya quedó completamente justificado.</p>
        </div>
        <div class="m-foot" v-if="porJustificar > 0">
          <button class="m-cancel" @click="cerrar()">Cerrar</button>
          <button class="m-ok" :disabled="procesando || !puedeGuardar" @click="guardar()">
            {{ procesando ? 'Guardando…' : 'Registrar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import http from '@/api/http'

const emit = defineEmits(['ctx'])
const items = ref([])
const cargando = ref(true)
const error = ref('')
const filtro = ref('todos')

const modal = ref(null)
const detalle = ref(null)
const tipo = ref('GastoVariable')
const concepto = ref('')
const monto = ref(null)
const modalError = ref('')
const procesando = ref(false)

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const signo = (n) => n < 0 ? '−' : n > 0 ? '+' : ''
const fecha = (f) => new Date(f).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const ini = (n) => (n || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

const claseEstado = (e) => e === 'Completo' ? 'ok' : e === 'Justificado' ? 'just' : 'inc'
const etiqueta = (e) => e === 'Completo' ? 'Cuadra' : e === 'Justificado' ? 'Justificado' : 'Incompleto'
const etiquetaTipo = (t) => t === 'GastoFijo' ? 'Gasto fijo' : t === 'GastoVariable' ? 'Gasto variable' : 'Deuda'

const visibles = computed(() =>
  filtro.value === 'todos' ? items.value : items.value.filter((c) => c.estado === filtro.value))
const conteoIncompletos = computed(() => items.value.filter((c) => c.estado === 'Incompleto').length)

const porJustificar = computed(() => detalle.value?.faltantePorJustificar ?? modal.value?.faltantePorJustificar ?? 0)
const puedeGuardar = computed(() =>
  concepto.value.trim() !== '' && Number(monto.value) > 0 && Number(monto.value) <= porJustificar.value)
const placeholderConcepto = computed(() =>
  tipo.value === 'GastoVariable' ? 'Ej. Gasolina, comida, maniobra'
    : tipo.value === 'GastoFijo' ? 'Ej. Renta, sueldo, seguro'
      : 'Ej. Faltante no justificado')

function setFiltro(f) { filtro.value = f }

async function cargar() {
  cargando.value = true; error.value = ''
  try {
    const { data } = await http.get('/cortes', { params: { tamano: 60 } })
    items.value = data.items
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudieron cargar los cortes.'
  } finally { cargando.value = false }
}

async function abrir(c) {
  modal.value = c
  detalle.value = null
  tipo.value = 'GastoVariable'; concepto.value = ''; monto.value = null; modalError.value = ''
  try {
    const { data } = await http.get(`/cortes/${c.id}`)
    detalle.value = data
    monto.value = data.faltantePorJustificar || null
  } catch { /* si falla, usamos lo del listado */ }
}
function cerrar() { modal.value = null; detalle.value = null }

async function guardar() {
  procesando.value = true; modalError.value = ''
  try {
    const { data } = await http.post(`/cortes/${modal.value.id}/justificar`, {
      tipo: tipo.value,
      monto: Number(monto.value),
      concepto: concepto.value.trim()
    })
    detalle.value = data
    concepto.value = ''; monto.value = data.faltantePorJustificar || null
    await cargar()
    if (data.faltantePorJustificar <= 0) cerrar()
  } catch (e) {
    modalError.value = e.response?.data?.mensaje || 'No se pudo registrar.'
  } finally { procesando.value = false }
}

onMounted(() => {
  emit('ctx', { titulo: 'Cortes de caja', sub: 'Cuadre de efectivo por carga', back: null })
  cargar()
})
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; }
.err { color: var(--clay); font-weight: 600; margin-top: 24px; }
.chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; }
.chip { border: 1px solid var(--line); background: var(--surface); color: var(--muted); border-radius: 999px; padding: 9px 16px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 7px; }
.chip.on { background: var(--pine); color: #fff; border-color: var(--pine); }
.ch-badge { background: var(--clay); color: #fff; border-radius: 999px; min-width: 18px; height: 18px; font-size: 10.5px; display: grid; place-items: center; padding: 0 5px; }
.chip.on .ch-badge { background: #fff; color: var(--pine); }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 13px; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 15px; box-shadow: var(--shadow); }
.card.inc { border-color: var(--clay-soft); }
.card.just { border-color: #C7DDE7; }
.c-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.c-rep { display: flex; align-items: center; gap: 11px; min-width: 0; }
.c-rep .av { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; font-weight: 700; font-size: 13px; flex: 0 0 auto; background: var(--pine-tint); color: var(--pine); }
.c-rep .av.inc { background: var(--clay-soft); color: var(--clay); }
.c-rep .av.just { background: var(--sky-soft); color: #1F5269; }
.c-rep .nm { font-weight: 700; font-size: 14.5px; }
.c-rep .meta { font-size: 11.5px; color: var(--muted); margin-top: 2px; }
.badge { font-size: 10px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; padding: 4px 8px; border-radius: 7px; flex: 0 0 auto; }
.badge.ok { color: var(--pine); background: var(--pine-tint); }
.badge.inc { color: var(--clay); background: var(--clay-soft); }
.badge.just { color: #1F5269; background: var(--sky-soft); }
.c-nums { display: flex; gap: 14px; background: var(--paper); border: 1px solid var(--line); border-radius: 12px; padding: 11px 13px; flex-wrap: wrap; }
.c-nums .n { display: flex; flex-direction: column; gap: 2px; }
.c-nums .k { font-size: 10.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--muted); }
.c-nums .v { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; font-variant-numeric: tabular-nums; }
.c-nums .v.neg { color: var(--clay); }
.c-nums .v.pos { color: var(--amber); }
.just { width: 100%; margin-top: 11px; background: var(--clay); color: #fff; border: none; border-radius: 12px; padding: 12px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; cursor: pointer; }

.modal-bg { position: fixed; inset: 0; background: rgba(21,42,36,.45); backdrop-filter: blur(3px); display: grid; place-items: center; z-index: 3000; padding: 20px; }
.modal { background: var(--surface); border-radius: 22px; width: 100%; max-width: 460px; box-shadow: 0 30px 60px -20px rgba(0,0,0,.5); overflow: hidden; max-height: 90vh; display: flex; flex-direction: column; }
.m-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 20px 14px; border-bottom: 1px solid var(--line); }
.m-title { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 19px; }
.m-sub { font-size: 13px; color: var(--muted); font-weight: 600; margin-top: 2px; }
.m-x { width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--line); background: var(--paper); display: grid; place-items: center; cursor: pointer; flex: 0 0 auto; }
.m-x svg { width: 16px; height: 16px; stroke: var(--muted); fill: none; stroke-width: 2.4; stroke-linecap: round; }
.m-body { padding: 16px 20px; overflow: auto; }
.falta { display: flex; align-items: center; justify-content: space-between; background: var(--clay-soft); border: 1px solid #EAC9BC; border-radius: 14px; padding: 14px; margin-bottom: 16px; }
.falta .fl { font-size: 12.5px; font-weight: 700; color: #8A3D28; }
.falta .fv { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 22px; color: var(--clay); font-variant-numeric: tabular-nums; }
.ya { margin-bottom: 16px; }
.ya-t { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
.ya-row { display: flex; align-items: center; gap: 9px; padding: 9px 0; border-bottom: 1px solid var(--line); }
.ya-row:last-child { border-bottom: none; }
.yr-tipo { font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 3px 7px; border-radius: 6px; flex: 0 0 auto; }
.yr-tipo.GastoFijo, .yr-tipo.GastoVariable { color: #1F5269; background: var(--sky-soft); }
.yr-tipo.DeudaRepartidor { color: var(--clay); background: var(--clay-soft); }
.yr-con { flex: 1; font-size: 13px; font-weight: 600; min-width: 0; }
.yr-mon { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; font-variant-numeric: tabular-nums; }
.fl2 { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 9px; }
.tipos { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.tp { display: flex; align-items: center; gap: 10px; border: 1.5px solid var(--line); background: var(--paper); color: var(--ink-soft); border-radius: 12px; padding: 12px 14px; font-family: "Hanken Grotesk"; font-weight: 700; font-size: 14px; cursor: pointer; transition: .15s; text-align: left; }
.tp svg { width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; flex: 0 0 auto; }
.tp.on { border-color: var(--pine); background: var(--pine-tint); color: var(--pine-deep); }
.campo { margin-bottom: 14px; }
.inp { width: 100%; border: 1.5px solid var(--line); background: var(--paper); border-radius: 12px; padding: 12px 14px; font-family: "Hanken Grotesk"; font-size: 14.5px; font-weight: 600; color: var(--ink); }
.inp:focus { outline: none; border-color: var(--pine); }
.mwrap { display: flex; align-items: center; background: var(--paper); border: 1.5px solid var(--line); border-radius: 12px; padding: 0 14px; }
.mwrap:focus-within { border-color: var(--pine); }
.mwrap .pfx { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; color: var(--ink-soft); }
.inp.mono { border: none; background: transparent; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; font-variant-numeric: tabular-nums; padding-left: 6px; }
.hint { font-size: 12px; color: var(--muted); font-weight: 500; line-height: 1.4; }
.listo { color: var(--pine); font-weight: 700; font-size: 14px; text-align: center; padding: 10px 0; }
.m-err { color: var(--clay); font-size: 13px; font-weight: 600; margin-top: 10px; }
.m-foot { display: flex; gap: 10px; padding: 4px 20px 20px; }
.m-cancel { flex: 1; border: 1px solid var(--line); background: var(--surface); color: var(--ink-soft); border-radius: 13px; padding: 13px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; }
.m-ok { flex: 1.6; border: none; background: var(--pine); color: #fff; border-radius: 13px; padding: 13px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; }
.m-ok:disabled { opacity: .5; }
</style>
