<template>
  <div class="trans-wrap">
    <!-- Filtros de fecha y búsqueda -->
    <div class="filtros-bar">
      <div class="filtros-left">
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

      <!-- Buscador por cliente, folio o ID -->
      <div class="search-box">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input 
          v-model="busqueda" 
          placeholder="Buscar cliente, folio o # pedido…" 
          @input="pagina = 1"
        >
        <button v-if="busqueda" class="clear-btn" @click="busqueda = ''">×</button>
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
        <div class="st" :class="{ alert: pendientes > 0 }">
          <span class="k">Pendientes de folio</span>
          <span class="v amber">{{ pendientes }}</span>
        </div>
      </div>
    </div>

    <!-- Pestañas de estado -->
    <div class="status-tabs">
      <button 
        class="s-tab" 
        :class="{ on: filtroEstado === 'todos' }" 
        @click="setFiltroEstado('todos')"
      >
        Todas ({{ total }})
      </button>
      <button 
        class="s-tab" 
        :class="{ on: filtroEstado === 'pendientes' }" 
        @click="setFiltroEstado('pendientes')"
      >
        Pendientes de folio
        <span v-if="pendientes > 0" class="badge-tab">{{ pendientes }}</span>
      </button>
      <button 
        class="s-tab" 
        :class="{ on: filtroEstado === 'pagados' }" 
        @click="setFiltroEstado('pagados')"
      >
        Conciliadas con folio
      </button>
    </div>

    <!-- Lista de transferencias -->
    <p v-if="cargando" class="muted">Cargando transferencias…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else-if="!itemsFiltrados.length" class="muted">
      {{ busqueda ? 'No se encontraron transferencias con ese criterio de búsqueda.' : 'No hay transferencias en este periodo.' }}
    </p>

    <div class="grid" v-if="!cargando && itemsFiltrados.length">
      <div v-for="t in itemsFiltrados" :key="t.id" class="card" :class="{ pend: t.estadoPago === 'Pendiente' }">
        <div class="ic">
          <svg viewBox="0 0 24 24"><path d="M4 9h16M4 15h16M8 5l-4 4 4 4M16 11l4 4-4 4"/></svg>
        </div>
        <div class="info">
          <div class="top">
            <span class="cli">{{ t.clienteNombreMostrar || t.clienteNombre }}</span>
            <span v-if="t.estadoPago === 'Pendiente'" class="badge pend">Pendiente de folio</span>
            <span v-else class="badge ok">Conciliado</span>
          </div>
          <div class="sub">
            <span class="folio" v-if="t.estadoPago !== 'Pendiente'">Folio: <b>{{ referencia(t) }}</b></span>
            <span class="folio pendtxt" v-else>Sin folio aún</span>
            · Pedido #{{ t.id }} · {{ fecha(t.fecha) }}
          </div>
        </div>
        <div class="right">
          <div class="monto">{{ money2(t.total) }}</div>
          <button v-if="t.estadoPago === 'Pendiente'" class="btn-folio" @click="abrir(t)">Capturar folio</button>
        </div>
      </div>
    </div>

    <!-- Paginación -->
    <div class="pager" v-if="!cargando && totalPaginas > 1 && !busqueda">
      <button class="pg" :disabled="pagina <= 1" @click="irPagina(pagina - 1)"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>
      <button v-for="n in paginasVisibles" :key="n" class="pg num" :class="{ on: n === pagina }" @click="irPagina(n)">{{ n }}</button>
      <button class="pg" :disabled="pagina >= totalPaginas" @click="irPagina(pagina + 1)"><svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></button>
    </div>
    <p v-if="!cargando && total && !busqueda" class="cuenta">{{ total }} transferencia(s) · página {{ pagina }} de {{ totalPaginas }}</p>

    <!-- Modal: capturar folio de un pago pendiente -->
    <div v-if="modal" class="modal-bg" @click.self="cerrar()">
      <div class="modal">
        <div class="m-head">
          <div>
            <div class="m-title">Capturar folio de transferencia</div>
            <div class="m-sub">{{ modal.clienteNombreMostrar || modal.clienteNombre }} · Pedido #{{ modal.id }}</div>
          </div>
          <button class="m-x" @click="cerrar()"><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div class="m-body">
          <div class="montobox">
            <span class="mb-k">Monto a conciliar</span>
            <span class="mb-v">{{ money2(modal.total) }}</span>
          </div>
          <div class="campo">
            <div class="fl2">Método de pago real</div>
            <div class="metodos">
              <button class="mt" :class="{ on: metodo === 'Transferencia' }" @click="metodo = 'Transferencia'">Transferencia</button>
              <button class="mt" :class="{ on: metodo === 'Efectivo' }" @click="metodo = 'Efectivo'">Efectivo</button>
              <button class="mt" :class="{ on: metodo === 'Tarjeta' }" @click="metodo = 'Tarjeta'">Tarjeta</button>
            </div>
          </div>
          <div class="campo" v-if="metodo !== 'Efectivo'">
            <div class="fl2">{{ metodo === 'Tarjeta' ? 'Número de autorización / voucher' : 'Folio / Clave de rastreo bancaria' }}</div>
            <input class="inp" v-model="folio" :placeholder="metodo === 'Tarjeta' ? 'Ej. 004821' : 'Ej. 20260906001294829'">
          </div>
          <p class="hint">Al registrar el folio, esta venta pasa de <b>pendiente</b> a <b>conciliada (pagada)</b> en bancos.</p>
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

    <!-- Guía Didáctica: ¿Cómo funciona la conciliación? -->
    <div class="guide-card">
      <div class="guide-top">
        <div class="guide-icon">
          <svg viewBox="0 0 24 24"><path d="M4 9h16M4 15h16M8 5l-4 4 4 4M16 11l4 4-4 4"/></svg>
        </div>
        <div>
          <h3 class="guide-title">¿Cómo funciona la conciliación de transferencias?</h3>
          <p class="guide-subtitle">Asegura que el dinero electrónico coincida con tus estados de cuenta bancarios.</p>
        </div>
      </div>
      <div class="guide-grid">
        <div class="g-item">
          <div class="g-head"><span class="g-num">1</span><h4>Entrega en ruta o mostrador</h4></div>
          <p>Cuando un cliente paga con transferencia bancaria, el repartidor o vendedor puede capturar el comprobante al momento o marcarlo como <b>pago pendiente</b> si el cliente transferirá más tarde.</p>
        </div>
        <div class="g-item">
          <div class="g-head"><span class="g-num">2</span><h4>Validación de comprobante</h4></div>
          <p>Los pedidos marcados como <b>Pendiente de folio</b> indican que la mercancía fue entregada pero aún no se coteja contra la banca en línea de la distribuidora.</p>
        </div>
        <div class="g-item">
          <div class="g-head"><span class="g-num">3</span><h4>Captura de folio bancario</h4></div>
          <p>Al recibir la notificación del banco (SPEI / autorización), haz clic en <b>Capturar folio</b> para ingresar la clave de rastreo. La venta se concilia y cambia a estado <b>Pagado</b>.</p>
        </div>
        <div class="g-item">
          <div class="g-head"><span class="g-num">4</span><h4>Cambio de método de pago</h4></div>
          <p>Si el cliente prometió transferencia pero al final pagó en <b>efectivo</b> o <b>tarjeta</b>, puedes corregir el método en el modal; el sistema actualizará los cortes y reportes automáticamente.</p>
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

// filtros y búsqueda
const filtroEstado = ref('todos') // 'todos' | 'pendientes' | 'pagados'
const busqueda = ref('')

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

// Filtro en vivo por texto (cliente, folio, ID)
const itemsFiltrados = computed(() => {
  if (!busqueda.value.trim()) return items.value
  const q = busqueda.value.toLowerCase().trim()
  return items.value.filter((t) => {
    const cli = (t.clienteNombreMostrar || t.clienteNombre || '').toLowerCase()
    const fol = (t.referenciaPago || '').toLowerCase()
    const idStr = String(t.id)
    return cli.includes(q) || fol.includes(q) || idStr.includes(q)
  })
})

function setModo(m) { modo.value = m; recargar1() }
function setFiltroEstado(e) { filtroEstado.value = e; recargar1() }
function recargar1() { pagina.value = 1; cargar() }
function irPagina(n) { if (n < 1 || n > totalPaginas.value) return; pagina.value = n }

function rangoFechas() {
  if (modo.value === 'dia') {
    const d = dia.value
    const ini = new Date(`${d}T00:00:00`)
    const fin = new Date(`${d}T23:59:59.999`)
    return { desde: ini.toISOString(), hasta: fin.toISOString() }
  }
  const ini = new Date(`${desde.value}T00:00:00`)
  const fin = new Date(`${hasta.value}T23:59:59.999`)
  return { desde: ini.toISOString(), hasta: fin.toISOString() }
}

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const r = rangoFechas()
    const params = {
      metodoPago: 'Transferencia',
      desde: r.desde,
      hasta: r.hasta,
      pagina: pagina.value,
      tamano: tamano.value
    }
    if (filtroEstado.value === 'pendientes') params.estadoPago = 'Pendiente'
    else if (filtroEstado.value === 'pagados') params.estadoPago = 'Pagado'

    const [lista, resumen] = await Promise.all([
      http.get('/pedidos', { params }),
      http.get('/pedidos/transferencias/resumen', { params: { desde: r.desde, hasta: r.hasta } })
    ])
    items.value = lista.data.items
    total.value = lista.data.total ?? lista.data.items.length
    resumenPeriodo.value = resumen.data
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudieron cargar las transferencias.'
  } finally {
    cargando.value = false
  }
}

// ── Capturar folio ──
function abrir(t) {
  modal.value = t
  metodo.value = 'Transferencia'
  folio.value = ''
  modalError.value = ''
}
function cerrar() { modal.value = null }

// El backend espera el método como NÚMERO (no hay JsonStringEnumConverter).
const METODO_NUM = { Efectivo: 0, Transferencia: 1, Tarjeta: 2, Credito: 3 }
async function guardar() {
  procesando.value = true
  modalError.value = ''
  try {
    const body = {
      referenciaPago: metodo.value === 'Efectivo' ? null : folio.value.trim(),
      metodoPago: METODO_NUM[metodo.value]
    }
    await http.put(`/pedidos/${modal.value.id}/registrar-pago`, body)
    cerrar()
    await cargar()
  } catch (e) {
    modalError.value = e.response?.data?.mensaje || 'No se pudo registrar el pago.'
  } finally {
    procesando.value = false
  }
}

watch(pagina, cargar)

onMounted(() => {
  emit('ctx', { titulo: 'Transferencias', sub: 'Conciliación bancaria y captura de folios', back: null })
  cargar()
})
</script>

<style scoped>
.trans-wrap { padding-bottom: 30px; }
.muted { color: var(--muted); margin-top: 24px; }
.err { color: var(--clay); font-weight: 600; margin-top: 24px; }

/* Barra superior */
.filtros-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 16px;
}
.filtros-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.modo {
  display: flex;
  gap: 4px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 3px;
}
.modo button {
  border: none;
  background: transparent;
  color: var(--muted);
  border-radius: 9px;
  padding: 8px 14px;
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: .15s;
}
.modo button.on {
  background: var(--surface);
  color: var(--ink);
  box-shadow: 0 1px 3px rgba(0,0,0,.1);
}

.fechas { display: flex; gap: 10px; }
.fld { display: flex; flex-direction: column; gap: 3px; }
.fld .fl { font-size: 10.5px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; color: var(--muted); }
.fld input {
  border: 1px solid var(--line);
  background: var(--surface);
  border-radius: 10px;
  padding: 7px 11px;
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink);
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
  min-width: 280px;
  box-shadow: var(--shadow);
}
.search-box svg {
  width: 17px;
  height: 17px;
  stroke: var(--muted);
  fill: none;
  stroke-width: 2.2;
}
.search-box input {
  border: none;
  background: transparent;
  outline: none;
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink);
  width: 100%;
}
.clear-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--muted);
  cursor: pointer;
}

/* Resumen Hero */
.resumen {
  background: linear-gradient(155deg, var(--sky), #20536c);
  border-radius: 20px;
  padding: 20px 24px;
  color: #fff;
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  box-shadow: 0 18px 36px -20px rgba(46,111,142,.9);
}
.rz-k { font-size: 12.5px; color: #CFE3EC; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
.rz-v {
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 800;
  font-size: 34px;
  letter-spacing: -.02em;
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
}
.rz-v .mxn { font-size: 14px; color: #CFE3EC; font-weight: 600; margin-left: 7px; }
.rz-stats { display: flex; gap: 12px; }
.st {
  background: rgba(255,255,255,.12);
  border: 1px solid rgba(255,255,255,.16);
  border-radius: 14px;
  padding: 10px 18px;
  text-align: center;
}
.st .k { font-size: 10.5px; color: #CFE3EC; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; display: block; }
.st .v { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 22px; margin-top: 2px; display: block; }
.st .v.amber { color: #FFD79A; }
.st.alert { background: rgba(232, 151, 46, 0.22); border-color: rgba(255, 215, 154, 0.35); }

/* Pestañas de estado */
.status-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.s-tab {
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--muted);
  font-family: "Hanken Grotesk", sans-serif;
  font-weight: 700;
  font-size: 13px;
  padding: 8px 16px;
  border-radius: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 7px;
  transition: all .2s;
  box-shadow: var(--shadow);
}
.s-tab.on {
  background: var(--sky);
  color: #fff;
  border-color: var(--sky);
}
.badge-tab {
  background: var(--amber);
  color: #3b2505;
  font-size: 10px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 999px;
}

/* Grid de tarjetas */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}
.card {
  display: flex;
  align-items: center;
  gap: 13px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 15px;
  box-shadow: var(--shadow);
}
.card.pend {
  border-color: #F8D8A7;
  background: linear-gradient(0deg, #FFF9F0 0%, var(--surface) 60%);
}
.card .ic {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--sky-soft);
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}
.card .ic svg {
  width: 20px;
  height: 20px;
  stroke: var(--sky);
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.card .info { flex: 1; min-width: 0; }
.card .top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.card .cli { font-weight: 700; font-size: 15px; color: var(--ink); }
.card .sub { font-size: 12px; color: var(--muted); margin-top: 3px; }
.card .folio b { color: var(--ink-soft); font-variant-numeric: tabular-nums; }
.card .folio.pendtxt { color: #B9781F; font-weight: 700; }
.card .right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex: 0 0 auto; }
.card .monto { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 18px; font-variant-numeric: tabular-nums; color: var(--ink); }
.btn-folio {
  background: var(--amber);
  color: #3b2505;
  border: none;
  border-radius: 10px;
  padding: 7px 13px;
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 800;
  font-size: 12.5px;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 4px 10px -3px rgba(232,151,46,.5);
}
.badge { font-size: 10px; font-weight: 800; letter-spacing: .03em; text-transform: uppercase; padding: 2px 7px; border-radius: 6px; }
.badge.pend { color: #B9781F; background: var(--amber-soft); }
.badge.ok { color: var(--pine); background: var(--pine-tint); }

/* Paginador */
.pager { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 22px; }
.pg {
  min-width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--surface);
  display: grid;
  place-items: center;
  cursor: pointer;
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 700;
  font-size: 13.5px;
  color: var(--ink-soft);
  padding: 0 6px;
}
.pg svg { width: 17px; height: 17px; stroke: var(--ink-soft); fill: none; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.pg:disabled { opacity: .4; cursor: default; }
.pg.num.on { background: var(--sky); color: #fff; border-color: var(--sky); }
.cuenta { text-align: center; color: var(--muted); font-size: 12px; font-weight: 600; margin-top: 10px; }

/* Modal */
.modal-bg { position: fixed; inset: 0; background: rgba(21,42,36,.45); backdrop-filter: blur(3px); display: grid; place-items: center; z-index: 3000; padding: 20px; }
.modal { background: var(--surface); border-radius: 22px; width: 100%; max-width: 440px; box-shadow: 0 30px 60px -20px rgba(0,0,0,.5); overflow: hidden; max-height: 90vh; display: flex; flex-direction: column; }
.m-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 20px 14px; border-bottom: 1px solid var(--line); }
.m-title { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 18px; }
.m-sub { font-size: 13px; color: var(--muted); font-weight: 600; margin-top: 2px; }
.m-x { width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--line); background: var(--paper); display: grid; place-items: center; cursor: pointer; flex: 0 0 auto; }
.m-x svg { width: 16px; height: 16px; stroke: var(--muted); fill: none; stroke-width: 2.4; stroke-linecap: round; }
.m-body { padding: 18px 20px; overflow: auto; }
.montobox { display: flex; align-items: center; justify-content: space-between; background: var(--sky-soft); border: 1px solid #C3DCE6; border-radius: 14px; padding: 14px; margin-bottom: 16px; }
.mb-k { font-size: 12.5px; font-weight: 700; color: #1F5269; }
.mb-v { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 22px; color: var(--sky); font-variant-numeric: tabular-nums; }
.campo { margin-bottom: 14px; }
.fl2 { font-size: 11.5px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
.metodos { display: flex; gap: 8px; }
.mt { flex: 1; border: 1.5px solid var(--line); background: var(--paper); color: var(--ink-soft); border-radius: 11px; padding: 10px; font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 12.5px; cursor: pointer; transition: .15s; }
.mt.on { border-color: var(--pine); background: var(--pine-tint); color: var(--pine-deep); }
.inp { width: 100%; border: 1.5px solid var(--line); background: var(--paper); border-radius: 12px; padding: 11px 13px; font-family: "Hanken Grotesk", sans-serif; font-size: 14px; font-weight: 600; color: var(--ink); }
.inp:focus { outline: none; border-color: var(--pine); }
.hint { font-size: 12px; color: var(--muted); font-weight: 500; line-height: 1.4; margin-top: 6px; }
.hint b { color: var(--ink-soft); }
.m-err { color: var(--clay); font-size: 13px; font-weight: 600; margin-top: 10px; }
.m-foot { display: flex; gap: 10px; padding: 4px 20px 20px; }
.m-cancel { flex: 1; border: 1px solid var(--line); background: var(--surface); color: var(--ink-soft); border-radius: 13px; padding: 12px; font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 14px; cursor: pointer; }
.m-ok { flex: 1.6; border: none; background: var(--pine); color: #fff; border-radius: 13px; padding: 12px; font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 14px; cursor: pointer; }
.m-ok:disabled { opacity: .5; }

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
  background: var(--sky-soft);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.guide-icon svg { width: 22px; height: 22px; stroke: var(--sky); fill: none; stroke-width: 2.2; }
.guide-title { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 17px; color: var(--ink); margin: 0; }
.guide-subtitle { font-size: 12.5px; color: var(--muted); margin-top: 2px; }
.guide-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 16px; }
.g-item { background: var(--paper); border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 14px 16px; }
.g-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.g-num { width: 20px; height: 20px; border-radius: 50%; background: var(--sky); color: #fff; font-size: 11px; font-weight: 800; display: grid; place-items: center; flex-shrink: 0; }
.g-head h4 { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 13px; color: var(--ink); margin: 0; }
.g-item p { font-size: 12px; line-height: 1.45; color: var(--ink-soft); margin: 0; }
.g-item p b { color: var(--ink); }
</style>
