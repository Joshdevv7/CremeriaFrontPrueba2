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
        <div class="right">
          <div class="monto">{{ money2(t.total) }}</div>
          <button v-if="t.estadoPago === 'Pendiente'" class="btn-folio" @click="abrir(t)">Capturar folio</button>
        </div>
      </div>
    </div>
    <!-- Paginación -->
    <div class="pager" v-if="!cargando && totalPaginas > 1">
      <button class="pg" :disabled="pagina <= 1" @click="irPagina(pagina - 1)"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>
      <button v-for="n in paginasVisibles" :key="n" class="pg num" :class="{ on: n === pagina }" @click="irPagina(n)">{{ n }}</button>
      <button class="pg" :disabled="pagina >= totalPaginas" @click="irPagina(pagina + 1)"><svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></button>
    </div>
    <p v-if="!cargando && total" class="cuenta">{{ total }} transferencia(s) · página {{ pagina }} de {{ totalPaginas }}</p>

    <!-- Modal: capturar folio de un pago pendiente -->
    <div v-if="modal" class="modal-bg" @click.self="cerrar()">
      <div class="modal">
        <div class="m-head">
          <div>
            <div class="m-title">Capturar folio</div>
            <div class="m-sub">{{ modal.clienteNombreMostrar || modal.clienteNombre }} · #{{ modal.id }}</div>
          </div>
          <button class="m-x" @click="cerrar()"><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div class="m-body">
          <div class="montobox">
            <span class="mb-k">Monto de la transferencia</span>
            <span class="mb-v">{{ money2(modal.total) }}</span>
          </div>
          <div class="campo">
            <div class="fl2">Método con el que pagó</div>
            <div class="metodos">
              <button class="mt" :class="{ on: metodo === 'Transferencia' }" @click="metodo = 'Transferencia'">Transferencia</button>
              <button class="mt" :class="{ on: metodo === 'Efectivo' }" @click="metodo = 'Efectivo'">Efectivo</button>
              <button class="mt" :class="{ on: metodo === 'Tarjeta' }" @click="metodo = 'Tarjeta'">Tarjeta</button>
            </div>
          </div>
          <div class="campo" v-if="metodo !== 'Efectivo'">
            <div class="fl2">{{ metodo === 'Tarjeta' ? 'Referencia de la terminal' : 'Folio de la transferencia' }}</div>
            <input class="inp" v-model="folio" :placeholder="metodo === 'Tarjeta' ? 'Ej. 004821 · aprobada' : 'Número de la transferencia'">
          </div>
          <p class="hint">Al registrar el pago, esta venta pasa de <b>pendiente</b> a <b>pagada</b>.</p>
          <p v-if="modalError" class="m-err">{{ modalError }}</p>
        </div>
        <div class="m-foot">
          <button class="m-cancel" @click="cerrar()">Cancelar</button>
          <button class="m-ok" :disabled="procesando || !puedeGuardar" @click="guardar()">
            {{ procesando ? 'Guardando…' : 'Registrar pago' }}
          </button>
        </div>
      </div>
    </div>
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
// modal de folio
const modal = ref(null)
const metodo = ref('Transferencia')
const folio = ref('')
const procesando = ref(false)
const modalError = ref('')
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
const totalPeriodo = computed(() => resumenPeriodo.value.total)
const pendientes = computed(() => resumenPeriodo.value.pendientes)
const cantidadTotal = computed(() => resumenPeriodo.value.cantidad)
// En efectivo no se exige folio; en transferencia/tarjeta sí.
const puedeGuardar = computed(() => metodo.value === 'Efectivo' || folio.value.trim() !== '')
function setModo(m) { modo.value = m; recargar1() }
function recargar1() { pagina.value = 1; cargar() }
function irPagina(n) { if (n < 1 || n > totalPaginas.value) return; pagina.value = n }
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
// ── Capturar folio ──
function abrir(t) {
  modal.value = t
  metodo.value = 'Transferencia'
  folio.value = ''
  modalError.value = ''
}
function cerrar() { modal.value = null }
async function guardar() {
  procesando.value = true; modalError.value = ''
  try {
    const body = {
      referenciaPago: metodo.value === 'Efectivo' ? null : folio.value.trim(),
      metodoPago: metodo.value
    }
    await http.put(`/pedidos/${modal.value.id}/registrar-pago`, body)
    cerrar()
    await cargar()
  } catch (e) {
    modalError.value = e.response?.data?.mensaje || 'No se pudo registrar el pago.'
  } finally { procesando.value = false }
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
.card .right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex: 0 0 auto; }
.card .monto { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; font-variant-numeric: tabular-nums; }
.btn-folio { background: var(--amber); color: #fff; border: none; border-radius: 10px; padding: 8px 13px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12.5px; cursor: pointer; white-space: nowrap; }
.badge { font-size: 10px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; padding: 3px 8px; border-radius: 7px; }
.badge.pend { color: #B9781F; background: var(--amber-soft); }
.pager { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 22px; }
.pg { min-width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); display: grid; place-items: center; cursor: pointer; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; color: var(--ink-soft); padding: 0 6px; }
.pg svg { width: 17px; height: 17px; stroke: var(--ink-soft); fill: none; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.pg:disabled { opacity: .4; cursor: default; }
.pg.num.on { background: var(--sky); color: #fff; border-color: var(--sky); }
.cuenta { text-align: center; color: var(--muted); font-size: 12px; font-weight: 600; margin-top: 10px; }
/* modal */
.modal-bg { position: fixed; inset: 0; background: rgba(21,42,36,.45); backdrop-filter: blur(3px); display: grid; place-items: center; z-index: 3000; padding: 20px; }
.modal { background: var(--surface); border-radius: 22px; width: 100%; max-width: 440px; box-shadow: 0 30px 60px -20px rgba(0,0,0,.5); overflow: hidden; max-height: 90vh; display: flex; flex-direction: column; }
.m-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 20px 14px; border-bottom: 1px solid var(--line); }
.m-title { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 19px; }
.m-sub { font-size: 13px; color: var(--muted); font-weight: 600; margin-top: 2px; }
.m-x { width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--line); background: var(--paper); display: grid; place-items: center; cursor: pointer; flex: 0 0 auto; }
.m-x svg { width: 16px; height: 16px; stroke: var(--muted); fill: none; stroke-width: 2.4; stroke-linecap: round; }
.m-body { padding: 16px 20px; overflow: auto; }
.montobox { display: flex; align-items: center; justify-content: space-between; background: var(--sky-soft); border: 1px solid #C3DCE6; border-radius: 14px; padding: 14px; margin-bottom: 16px; }
.mb-k { font-size: 12.5px; font-weight: 700; color: #1F5269; }
.mb-v { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 22px; color: var(--sky); font-variant-numeric: tabular-nums; }
.campo { margin-bottom: 14px; }
.fl2 { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 9px; }
.metodos { display: flex; gap: 8px; }
.mt { flex: 1; border: 1.5px solid var(--line); background: var(--paper); color: var(--ink-soft); border-radius: 11px; padding: 11px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13px; cursor: pointer; transition: .15s; }
.mt.on { border-color: var(--pine); background: var(--pine-tint); color: var(--pine-deep); }
.inp { width: 100%; border: 1.5px solid var(--line); background: var(--paper); border-radius: 12px; padding: 12px 14px; font-family: "Hanken Grotesk"; font-size: 14.5px; font-weight: 600; color: var(--ink); }
.inp:focus { outline: none; border-color: var(--pine); }
.hint { font-size: 12.5px; color: var(--muted); font-weight: 500; line-height: 1.4; }
.hint b { color: var(--ink-soft); }
.m-err { color: var(--clay); font-size: 13px; font-weight: 600; margin-top: 10px; }
.m-foot { display: flex; gap: 10px; padding: 4px 20px 20px; }
.m-cancel { flex: 1; border: 1px solid var(--line); background: var(--surface); color: var(--ink-soft); border-radius: 13px; padding: 13px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; }
.m-ok { flex: 1.6; border: none; background: var(--pine); color: #fff; border-radius: 13px; padding: 13px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; }
.m-ok:disabled { opacity: .5; }
</style>
