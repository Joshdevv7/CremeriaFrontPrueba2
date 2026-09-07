<template>
  <div class="deudas-wrap">
    <p v-if="cargando && !deudas.length" class="muted">Cargando saldos y adeudos…</p>
    <p v-else-if="error" class="err">{{ error }}</p>

    <template v-else>
      <!-- Hero de Resumen -->
      <div class="resumen">
        <div class="rz">
          <div class="rz-k">Total por cobrar a personal</div>
          <div class="rz-v">{{ money(totalDeuda) }}<span class="mxn">MXN</span></div>
        </div>
        <div class="rz-stats">
          <div class="st"><span class="k">Con saldo pendiente</span><span class="v amber">{{ conDeuda.length }}</span></div>
          <div class="st"><span class="k">Al corriente</span><span class="v">{{ sinDeuda.length }}</span></div>
        </div>
      </div>

      <!-- Barra de Filtros y Búsqueda -->
      <div class="filtros-bar">
        <div class="tabs-group">
          <button class="f-tab" :class="{ on: filtro === 'todos' }" @click="filtro = 'todos'">
            Todos ({{ deudas.length }})
          </button>
          <button class="f-tab" :class="{ on: filtro === 'conDeuda' }" @click="filtro = 'conDeuda'">
            Con saldo ({{ conDeuda.length }})
          </button>
          <button class="f-tab" :class="{ on: filtro === 'sinDeuda' }" @click="filtro = 'sinDeuda'">
            Al corriente ({{ sinDeuda.length }})
          </button>
        </div>

        <div class="search-box">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="busqueda" placeholder="Buscar repartidor o vendedor…">
          <button v-if="busqueda" class="clear-btn" @click="busqueda = ''">×</button>
        </div>
      </div>

      <!-- Grid de personal o estado vacío claro -->
      <div v-if="!visibles.length" class="vacio-box">
        <div class="vb-ic">{{ filtro === 'conDeuda' ? '🎉' : '👥' }}</div>
        <div class="vb-t">
          {{ busqueda
            ? 'Sin resultados para la búsqueda'
            : (filtro === 'conDeuda'
              ? '¡Excelente! Ningún repartidor tiene deudas'
              : 'No hay personal registrado en este filtro') }}
        </div>
        <div class="vb-s">
          {{ busqueda
            ? `No se encontró personal que coincida con "${busqueda}".`
            : (filtro === 'conDeuda'
              ? 'Todo el equipo se encuentra al corriente con sus cortes de caja y sin saldos pendientes.'
              : 'Los colaboradores dados de alta aparecerán aquí con su balance contable.') }}
        </div>
        <button v-if="busqueda || filtro !== 'todos'" class="vb-btn" @click="busqueda = ''; filtro = 'todos'">
          Ver todo el personal
        </button>
      </div>

      <div class="grid" v-else>
        <div 
          v-for="d in visibles" 
          :key="d.repartidorId" 
          class="card"
          :class="{ 'has-debt': d.saldo > 0, 'clean': d.saldo <= 0 }"
        >
          <div class="c-top">
            <div class="av" :class="{ 'av-debt': d.saldo > 0 }">{{ ini(d.repartidorNombre) }}</div>
            <div class="info">
              <div class="nm">{{ d.repartidorNombre }}</div>
              <div class="meta">Cargado {{ money(d.totalCargado) }} · Abonado {{ money(d.totalAbonado) }}</div>
            </div>
            <div class="saldo-wrap">
              <span class="saldo-lbl">{{ d.saldo > 0 ? 'Debe' : 'Saldo' }}</span>
              <div class="saldo" :class="{ 'text-clay': d.saldo > 0, 'text-green': d.saldo <= 0 }">
                {{ money(d.saldo) }}
              </div>
            </div>
          </div>

          <div class="c-acts">
            <button class="btn-kardex" @click="verKardex(d)">
              <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              Ver historial
            </button>
            <button v-if="d.saldo > 0" class="btn-abonar" @click="abrirAbono(d)">
              Registrar abono
            </button>
          </div>
        </div>
      </div>

      <!-- Guía Educativa: ¿Cómo funcionan las deudas? -->
      <div class="guide-card">
        <div class="guide-top">
          <div class="guide-icon">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6"/><path d="M17 3l4 2-4 2"/></svg>
          </div>
          <div>
            <h3 class="guide-title">¿Cómo se originan y liquidan los saldos a cargo del personal?</h3>
            <p class="guide-subtitle">Conoce el ciclo de control para faltantes de efectivo en cortes de caja.</p>
          </div>
        </div>
        <div class="guide-grid">
          <div class="g-item">
            <div class="g-head"><span class="g-num">1</span><h4>Faltante en corte de caja</h4></div>
            <p>Al cerrar un corte de carga o mostrador, si el efectivo entregado es menor a lo esperado, se genera un faltante contable en estado <b>Incompleto</b>.</p>
          </div>
          <div class="g-item">
            <div class="g-head"><span class="g-num">2</span><h4>Justificación como adeudo</h4></div>
            <p>El administrador puede clasificar el faltante como <b>Deuda del repartidor</b> si no fue un gasto del negocio, sumándolo de inmediato al saldo por cobrar del colaborador.</p>
          </div>
          <div class="g-item">
            <div class="g-head"><span class="g-num">3</span><h4>Abonos y nómina</h4></div>
            <p>Cuando el repartidor entrega dinero en efectivo o se realiza una retención de nómina, se registra un <b>abono</b> indicando el monto y la nota explicativa.</p>
          </div>
          <div class="g-item">
            <div class="g-head"><span class="g-num">4</span><h4>Kardex transparente</h4></div>
            <p>El botón <b>Ver historial</b> despliega la cuenta de cada colaborador: qué día y en qué corte se generó cada cargo y cuándo se aplicaron los abonos.</p>
          </div>
        </div>
      </div>
    </template>

    <!-- Modal: Registrar Abono -->
    <div v-if="modalAbono" class="modal-bg" @click.self="cerrarAbono()">
      <div class="modal">
        <div class="m-head">
          <div>
            <div class="m-title">Registrar abono a saldo</div>
            <div class="m-sub">{{ modalAbono.repartidorNombre }}</div>
          </div>
          <button class="m-x" @click="cerrarAbono()"><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div class="m-body">
          <div class="falta">
            <span class="fl">Saldo pendiente por cobrar</span>
            <span class="fv">{{ money(modalAbono.saldo) }}</span>
          </div>
          <div class="campo">
            <div class="fl2">Monto que abona (MXN) *</div>
            <div class="mwrap">
              <span class="pfx">$</span>
              <input class="inp mono" type="number" step="0.01" v-model.number="montoAbono" placeholder="0.00">
            </div>
          </div>
          <div class="campo">
            <div class="fl2">Nota o referencia de pago</div>
            <input class="inp" v-model="notaAbono" placeholder="Ej. Descuento de nómina semana 36 o Pago en caja">
          </div>
          <p v-if="modalError" class="m-err">{{ modalError }}</p>
        </div>
        <div class="m-foot">
          <button class="m-cancel" @click="cerrarAbono()">Cancelar</button>
          <button class="m-ok" :disabled="procesandoAbono || !puedeGuardarAbono" @click="guardarAbono()">
            {{ procesandoAbono ? 'Guardando…' : 'Registrar abono' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Kardex / Historial de Movimientos -->
    <div v-if="modalKardex" class="modal-bg" @click.self="cerrarKardex()">
      <div class="modal modal-lg">
        <div class="m-head">
          <div>
            <div class="m-title">Estado de cuenta · Historial</div>
            <div class="m-sub">{{ kardexData?.repartidorNombre }}</div>
          </div>
          <button class="m-x" @click="cerrarKardex()"><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div class="m-body">
          <div v-if="cargandoKardex" class="loading-state">
            <div class="spinner"></div>
            <p class="muted">Consultando movimientos…</p>
          </div>
          <template v-else-if="kardexData">
            <!-- Resumen de cuenta del repartidor -->
            <div class="kardex-summary">
              <div class="ks-box">
                <span class="ks-k">Total faltantes cargados</span>
                <span class="ks-v text-clay">{{ money(kardexData.totalCargado) }}</span>
              </div>
              <div class="ks-box">
                <span class="ks-k">Total abonado</span>
                <span class="ks-v text-green">{{ money(kardexData.totalAbonado) }}</span>
              </div>
              <div class="ks-box total">
                <span class="ks-k">Saldo pendiente</span>
                <span class="ks-v" :class="kardexData.saldo > 0 ? 'text-clay' : 'text-green'">{{ money(kardexData.saldo) }}</span>
              </div>
            </div>

            <!-- Lista de movimientos -->
            <div class="kardex-title">Movimientos registrados</div>
            <div v-if="!kardexData.movimientos.length" class="sin-movs">
              <span class="sm-ic">✅</span>
              <div class="sm-t">Al corriente · Sin movimientos de deuda</div>
              <div class="sm-s">Este colaborador no tiene faltantes acumulados en cortes ni cargos pendientes por cobrar.</div>
            </div>

            <div class="movs-list" v-else>
              <div 
                v-for="m in kardexData.movimientos" 
                :key="m.id + m.tipo" 
                class="mov-item" 
                :class="m.tipo === 'Cargo' ? 'is-cargo' : 'is-abono'"
              >
                <div class="mov-icon">
                  <svg v-if="m.tipo === 'Cargo'" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                  <svg v-else viewBox="0 0 24 24"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                </div>
                <div class="mov-info">
                  <div class="mov-top">
                    <span class="mov-badge" :class="m.tipo === 'Cargo' ? 'cargo' : 'abono'">{{ m.tipo }}</span>
                    <span class="mov-con">{{ m.concepto }}</span>
                  </div>
                  <div class="mov-meta">
                    <span v-if="m.corteCajaId">Corte #{{ m.corteCajaId }}</span>
                    <span v-if="m.cargaId"> · Carga #{{ m.cargaId }}</span>
                    · {{ fechaHora(m.fecha) }}
                  </div>
                </div>
                <div class="mov-monto" :class="m.tipo === 'Cargo' ? 'text-clay' : 'text-green'">
                  {{ m.tipo === 'Cargo' ? '+' : '−' }}{{ money(m.monto) }}
                </div>
              </div>
            </div>
          </template>
        </div>
        <div class="m-foot">
          <button class="m-cancel" @click="cerrarKardex()">Cerrar</button>
          <button 
            v-if="kardexData && kardexData.saldo > 0" 
            class="m-ok" 
            @click="abrirAbonoDesdeKardex()"
          >
            Registrar abono
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import http from '@/api/http'

const emit = defineEmits(['ctx'])
const route = useRoute()
const deudas = ref([])
const cargando = ref(true)
const error = ref('')

const filtro = ref('todos') // 'todos' | 'conDeuda' | 'sinDeuda'
const busqueda = ref('')

// Modal Abono
const modalAbono = ref(null)
const montoAbono = ref(null)
const notaAbono = ref('')
const modalError = ref('')
const procesandoAbono = ref(false)

// Modal Kardex
const modalKardex = ref(null)
const kardexData = ref(null)
const cargandoKardex = ref(false)

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const ini = (n) => (n || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
const fechaHora = (f) => new Date(f).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const conDeuda = computed(() => deudas.value.filter((d) => d.saldo > 0))
const sinDeuda = computed(() => deudas.value.filter((d) => d.saldo <= 0))
const totalDeuda = computed(() => conDeuda.value.reduce((s, d) => s + d.saldo, 0))

const visibles = computed(() => {
  let list = deudas.value
  if (filtro.value === 'conDeuda') list = conDeuda.value
  else if (filtro.value === 'sinDeuda') list = sinDeuda.value

  if (!busqueda.value.trim()) return list
  const q = busqueda.value.toLowerCase().trim()
  return list.filter((d) => (d.repartidorNombre || '').toLowerCase().includes(q))
})

const puedeGuardarAbono = computed(() => Number(montoAbono.value) > 0 && Number(montoAbono.value) <= (modalAbono.value?.saldo ?? 0))

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await http.get('/cortes/deudas')
    deudas.value = data
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudieron cargar las deudas.'
  } finally {
    cargando.value = false
  }
}

// ── Kardex ──
async function verKardex(d) {
  modalKardex.value = d
  kardexData.value = null
  cargandoKardex.value = true
  try {
    const { data } = await http.get(`/cortes/deudas/${d.repartidorId}/kardex`)
    kardexData.value = data
  } catch (e) {
    kardexData.value = null
  } finally {
    cargandoKardex.value = false
  }
}

function cerrarKardex() {
  modalKardex.value = null
  kardexData.value = null
}

function abrirAbonoDesdeKardex() {
  const d = deudas.value.find((x) => x.repartidorId === kardexData.value?.repartidorId)
  if (d) {
    cerrarKardex()
    abrirAbono(d)
  }
}

// ── Abonos ──
function abrirAbono(d) {
  modalAbono.value = d
  montoAbono.value = d.saldo > 0 ? d.saldo : null
  notaAbono.value = ''
  modalError.value = ''
}

function cerrarAbono() {
  modalAbono.value = null
  montoAbono.value = null
  notaAbono.value = ''
}

async function guardarAbono() {
  if (!puedeGuardarAbono.value) return
  procesandoAbono.value = true
  modalError.value = ''
  try {
    await http.post('/cortes/abonos', {
      repartidorId: modalAbono.value.repartidorId,
      monto: Number(montoAbono.value),
      nota: notaAbono.value.trim() || null
    })
    cerrarAbono()
    await cargar()
  } catch (e) {
    modalError.value = e.response?.data?.mensaje || 'No se pudo registrar el abono.'
  } finally {
    procesandoAbono.value = false
  }
}

onMounted(async () => {
  emit('ctx', { titulo: 'Deudas de personal', sub: 'Control de faltantes a su cargo y abonos', back: null })
  await cargar()
  if (route.query.repartidorId) {
    const rId = Number(route.query.repartidorId)
    const target = deudas.value.find((d) => d.repartidorId === rId)
    if (target) {
      busqueda.value = target.repartidorNombre
      verKardex(target)
    }
  }
})
</script>

<style scoped>
.deudas-wrap { padding-bottom: 30px; }
.muted { color: var(--muted); margin-top: 24px; }
.err { color: var(--clay); font-weight: 600; margin-top: 16px; }
.text-clay { color: var(--clay); }
.text-green { color: var(--green); }

/* Resumen Hero */
.resumen {
  background: linear-gradient(155deg, var(--pine), var(--pine-deep));
  border-radius: 20px;
  padding: 20px 24px;
  color: #fff;
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  box-shadow: 0 18px 36px -20px rgba(14,92,74,.9);
}
.rz-k { font-size: 12.5px; color: #BFE0D2; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
.rz-v {
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 800;
  font-size: 34px;
  letter-spacing: -.02em;
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
}
.rz-v .mxn { font-size: 14px; color: #BFE0D2; font-weight: 600; margin-left: 7px; }
.rz-stats { display: flex; gap: 12px; }
.st {
  background: rgba(255,255,255,.12);
  border: 1px solid rgba(255,255,255,.16);
  border-radius: 14px;
  padding: 10px 18px;
  text-align: center;
}
.st .k { font-size: 10.5px; color: #BFE0D2; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; display: block; }
.st .v { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 22px; margin-top: 2px; display: block; }
.st .v.amber { color: #FFD79A; }

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
.f-tab.on { background: var(--surface); color: var(--ink); box-shadow: 0 1px 3px rgba(0,0,0,.1); }

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

/* Grid de personal */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; margin-bottom: 24px; }
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 16px;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.card.has-debt { border-color: #F8D8A7; }
.c-top { display: flex; align-items: center; gap: 12px; }
.av {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: var(--paper-2);
  color: var(--ink-soft);
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 800;
  font-size: 15px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}
.av.av-debt { background: var(--clay-soft); color: var(--clay); }
.info { flex: 1; min-width: 0; }
.nm { font-weight: 700; font-size: 15px; color: var(--ink); }
.meta { font-size: 12px; color: var(--muted); margin-top: 2px; }
.saldo-wrap { text-align: right; }
.saldo-lbl { font-size: 10.5px; font-weight: 800; text-transform: uppercase; color: var(--muted); display: block; }
.saldo { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 19px; font-variant-numeric: tabular-nums; }

.c-acts { display: flex; gap: 8px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line); }
.btn-kardex {
  flex: 1;
  border: 1px solid var(--line);
  background: var(--paper);
  color: var(--ink-soft);
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 700;
  font-size: 12.5px;
  padding: 9px;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.btn-kardex svg { width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 2.2; }
.btn-abonar {
  flex: 1.2;
  border: none;
  background: var(--amber);
  color: #3a2607;
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 800;
  font-size: 12.5px;
  padding: 9px;
  border-radius: 10px;
  cursor: pointer;
}

/* Modales */
.modal-bg { position: fixed; inset: 0; background: rgba(21,42,36,.45); backdrop-filter: blur(3px); display: grid; place-items: center; z-index: 3000; padding: 20px; }
.modal { background: var(--surface); border-radius: 22px; width: 100%; max-width: 440px; box-shadow: 0 30px 60px -20px rgba(0,0,0,.5); overflow: hidden; max-height: 90vh; display: flex; flex-direction: column; }
.modal.modal-lg { max-width: 580px; }
.m-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 20px 14px; border-bottom: 1px solid var(--line); }
.m-title { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 18px; }
.m-sub { font-size: 13px; color: var(--muted); font-weight: 600; margin-top: 2px; }
.m-x { width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--line); background: var(--paper); display: grid; place-items: center; cursor: pointer; flex: 0 0 auto; }
.m-x svg { width: 16px; height: 16px; stroke: var(--muted); fill: none; stroke-width: 2.4; stroke-linecap: round; }
.m-body { padding: 18px 20px; overflow-y: auto; }

.falta { display: flex; justify-content: space-between; align-items: center; background: var(--clay-soft); border: 1px solid #EAC0B4; border-radius: 14px; padding: 14px 16px; margin-bottom: 16px; }
.falta .fl { font-size: 12.5px; font-weight: 700; color: #8F3E28; }
.falta .fv { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 22px; color: var(--clay); font-variant-numeric: tabular-nums; }
.campo { margin-bottom: 14px; }
.fl2 { font-size: 11.5px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
.mwrap { display: flex; align-items: center; background: var(--paper); border: 1.5px solid var(--line); border-radius: 12px; padding: 2px 14px; }
.mwrap .pfx { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 20px; color: var(--ink-soft); margin-right: 6px; }
.inp { width: 100%; border: 1.5px solid var(--line); background: var(--paper); border-radius: 12px; padding: 11px 13px; font-family: "Hanken Grotesk", sans-serif; font-size: 14px; font-weight: 600; color: var(--ink); }
.inp.mono { border: none; background: transparent; font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 20px; outline: none; }
.m-err { color: var(--clay); font-size: 13px; font-weight: 600; margin-top: 10px; }
.m-foot { display: flex; gap: 10px; padding: 6px 20px 20px; }
.m-cancel { flex: 1; border: 1px solid var(--line); background: var(--surface); color: var(--ink-soft); border-radius: 13px; padding: 12px; font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 14px; cursor: pointer; }
.m-ok { flex: 1.6; border: none; background: var(--pine); color: #fff; border-radius: 13px; padding: 12px; font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 14px; cursor: pointer; }
.m-ok:disabled { opacity: .5; }

/* Kardex Box */
.kardex-summary { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
.ks-box { flex: 1; min-width: 140px; background: var(--paper); border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; text-align: center; }
.ks-box.total { background: var(--surface); border-color: #E2AFA0; }
.ks-k { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; display: block; }
.ks-v { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 20px; margin-top: 3px; display: block; font-variant-numeric: tabular-nums; }
.sin-movs { text-align: center; padding: 24px 16px; background: var(--paper); border: 1px dashed var(--line); border-radius: 14px; }
.sm-ic { font-size: 28px; display: block; margin-bottom: 6px; }
.sm-t { font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 15px; color: var(--ink); }
.sm-s { font-size: 12px; color: var(--muted); margin-top: 4px; line-height: 1.4; }

.vacio-box { background: var(--surface); border: 1px dashed var(--line); border-radius: 20px; padding: 42px 20px; text-align: center; margin-bottom: 24px; }
.vb-ic { font-size: 38px; margin-bottom: 8px; }
.vb-t { font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 17px; color: var(--ink); }
.vb-s { font-size: 13px; color: var(--muted); margin-top: 4px; max-width: 440px; margin-left: auto; margin-right: auto; line-height: 1.4; }
.vb-btn { margin-top: 14px; border: none; background: var(--pine-tint); color: var(--pine); font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 13px; padding: 7px 14px; border-radius: 9px; cursor: pointer; }

.movs-list { display: flex; flex-direction: column; gap: 8px; max-height: 280px; overflow-y: auto; }
.mov-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px 14px;
}
.mov-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}
.mov-item.is-cargo .mov-icon { background: var(--clay-soft); stroke: var(--clay); }
.mov-item.is-abono .mov-icon { background: var(--pine-tint); stroke: var(--pine); }
.mov-icon svg { width: 16px; height: 16px; fill: none; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.mov-info { flex: 1; min-width: 0; }
.mov-top { display: flex; align-items: center; gap: 7px; }
.mov-badge { font-size: 9.5px; font-weight: 800; text-transform: uppercase; padding: 1px 6px; border-radius: 4px; }
.mov-badge.cargo { background: var(--clay-soft); color: var(--clay); }
.mov-badge.abono { background: var(--pine-tint); color: var(--pine); }
.mov-con { font-size: 13px; font-weight: 700; color: var(--ink); }
.mov-meta { font-size: 11.5px; color: var(--muted); margin-top: 2px; }
.mov-monto { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 16px; font-variant-numeric: tabular-nums; }

.loading-state { display: flex; flex-direction: column; align-items: center; padding: 30px; gap: 12px; }
.spinner { width: 30px; height: 30px; border: 3px solid var(--line); border-top-color: var(--pine); border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

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
  background: var(--clay-soft);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.guide-icon svg { width: 22px; height: 22px; stroke: var(--clay); fill: none; stroke-width: 2.2; }
.guide-title { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 17px; color: var(--ink); margin: 0; }
.guide-subtitle { font-size: 12.5px; color: var(--muted); margin-top: 2px; }
.guide-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 16px; }
.g-item { background: var(--paper); border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 14px 16px; }
.g-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.g-num { width: 20px; height: 20px; border-radius: 50%; background: var(--clay); color: #fff; font-size: 11px; font-weight: 800; display: grid; place-items: center; flex-shrink: 0; }
.g-head h4 { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 13px; color: var(--ink); margin: 0; }
.g-item p { font-size: 12px; line-height: 1.45; color: var(--ink-soft); margin: 0; }
</style>
