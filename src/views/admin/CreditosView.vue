<template>
  <div>
    <!-- Resumen de cartera -->
    <div class="resumen" v-if="resumen">
      <div class="rc">
        <div class="l">Por cobrar</div>
        <div class="v">{{ money(resumen.totalPendiente) }}</div>
        <div class="s">{{ resumen.cuentasPendientes }} cuentas vigentes</div>
      </div>
      <div class="rc rojo">
        <div class="l">Vencido</div>
        <div class="v">{{ money(resumen.totalVencido) }}</div>
        <div class="s">{{ resumen.cuentasVencidas }} cuentas vencidas</div>
      </div>
      <div class="rc pine">
        <div class="l">Total Cartera</div>
        <div class="v">{{ money((resumen.totalPendiente || 0) + (resumen.totalVencido || 0)) }}</div>
        <div class="s">{{ (resumen.cuentasPendientes || 0) + (resumen.cuentasVencidas || 0) }} cuentas activas</div>
      </div>
    </div>

    <!-- Barra de acciones y filtros -->
    <div class="toolbar">
      <div class="search-box">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
        <input v-model="buscar" placeholder="Buscar por cliente o # pedido…" @input="pagina = 1">
      </div>

      <div class="tabs">
        <button v-for="f in filtros" :key="f.k" :class="{ on: estado === f.k }" @click="setEstado(f.k)">{{ f.t }}</button>
      </div>

      <button class="revisar" :disabled="revisando" @click="revisar()">
        <ion-icon :icon="notificationsOutline" />{{ revisando ? 'Revisando…' : 'Revisar vencimientos' }}
      </button>
    </div>

    <p v-if="avisoRevision" class="aviso">{{ avisoRevision }}</p>
    <p v-if="cargando" class="muted">Cargando créditos…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else-if="!itemsFiltrados.length" class="muted">{{ vacioTexto }}</p>

    <!-- Grilla de cuentas por cobrar -->
    <div class="grid" v-if="!cargando && itemsFiltrados.length">
      <div v-for="c in itemsPaginados" :key="c.id" class="card">
        <div class="chip" :class="claseEstado(c.estado)"><ion-icon :icon="iconoEstado(c.estado)" /></div>
        <div class="info">
          <div class="cli">{{ c.clienteNombre }}</div>
          <div class="sub">
            Pedido #{{ c.pedidoId }} · límite {{ fecha(c.fechaLimite) }}
            <span v-if="c.repartidorNombre">· {{ c.repartidorNombre }}</span>
          </div>
          <div class="estado" :class="claseEstado(c.estado)">
            {{ estadoTxt(c.estado) }}
            <span v-if="c.estado === 'Pendiente' && c.diasParaVencer >= 0"> · vence en {{ c.diasParaVencer }} día(s)</span>
            <span v-else-if="c.estado === 'Vencida'"> · venció hace {{ Math.abs(c.diasParaVencer) }} día(s)</span>
            <span v-else-if="c.estado === 'Pagada' && c.pagadaEn"> · pagada el {{ fecha(c.pagadaEn) }}</span>
          </div>
        </div>

        <div class="right">
          <div class="monto-block">
            <template v-if="c.estado !== 'Pagada' && c.abonado > 0">
              <div class="monto-saldo">{{ money(c.saldo) }}</div>
              <div class="monto-sub">
                de {{ money(c.monto) }}
                <span class="tag-abono">Abonado {{ money(c.abonado) }}</span>
              </div>
            </template>
            <template v-else>
              <div class="monto">{{ money(c.monto) }}</div>
            </template>
          </div>

          <div class="card-acts">
            <a v-if="c.estado !== 'Pagada' && c.clienteTelefono" :href="whatsappCobro(c)" target="_blank" class="wa-btn" title="Recordatorio por WhatsApp">
              <ion-icon :icon="logoWhatsapp" />
            </a>
            <button v-if="c.estado !== 'Pagada'" class="pagar" :disabled="ocupado === c.id" @click="pagar(c)">
              {{ ocupado === c.id ? '…' : (c.abonado > 0 ? 'Liquidar saldo (' + money(c.saldo) + ')' : 'Marcar pagada') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Paginación -->
    <div class="pager" v-if="!cargando && totalPaginas > 1">
      <button class="pg" :disabled="pagina <= 1" @click="irPagina(pagina - 1)">
        <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <button v-for="n in paginasVisibles" :key="n" class="pg num" :class="{ on: n === pagina }" @click="irPagina(n)">{{ n }}</button>
      <button class="pg" :disabled="pagina >= totalPaginas" @click="irPagina(pagina + 1)">
        <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
    <p v-if="!cargando && itemsFiltrados.length" class="cuenta">
      {{ itemsFiltrados.length }} cuenta(s) · página {{ pagina }} de {{ totalPaginas }}
    </p>

    <!-- Guía interactiva -->
    <div class="guia-card">
      <div class="guia-header" @click="mostrarGuia = !mostrarGuia">
        <div class="guia-icon">💡</div>
        <div class="guia-tit">¿Cómo funciona el módulo de Créditos y Cuentas por Cobrar?</div>
        <div class="guia-badge">{{ mostrarGuia ? 'Ocultar guía' : 'Ver guía' }}</div>
      </div>
      <div v-if="mostrarGuia" class="guia-content">
        <div class="guia-item">
          <div class="gi-num">1</div>
          <div class="gi-text">
            <b>Generación automática:</b> Cada venta o pedido realizado con método de pago "Crédito" crea automáticamente una Cuenta por Cobrar con fecha límite de pago.
          </div>
        </div>
        <div class="guia-item">
          <div class="gi-num">2</div>
          <div class="gi-text">
            <b>Sincronización total con Deudas de Clientes:</b> Al abonar a la cuenta o marcarla como pagada, el saldo restante se calcula y sincroniza en tiempo real de forma exacta.
          </div>
        </div>
        <div class="guia-item">
          <div class="gi-num">3</div>
          <div class="gi-text">
            <b>Alertas y Cobranza WhatsApp:</b> Usa "Revisar vencimientos" para disparar las notificaciones del sistema y el botón de WhatsApp en cada tarjeta para enviar un recordatorio amistoso prellenado con el saldo exacto pendiente.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { IonIcon } from '@ionic/vue'
import {
  timeOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  notificationsOutline,
  logoWhatsapp
} from 'ionicons/icons'
import http from '@/api/http'

const emit = defineEmits(['ctx'])
const items = ref([])
const resumen = ref(null)
const cargando = ref(true)
const error = ref('')
const estado = ref('Pendiente')
const buscar = ref('')
const ocupado = ref(null)
const revisando = ref(false)
const avisoRevision = ref('')
const mostrarGuia = ref(false)

// Paginación
const pagina = ref(1)
const tamano = ref(24)

const filtros = [
  { k: 'Pendiente', t: 'Por cobrar' },
  { k: 'Vencida', t: 'Vencidas' },
  { k: 'Pagada', t: 'Liquidadas' }
]
const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const fecha = (f) => new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
const estadoTxt = (e) => ({ Pendiente: 'Por cobrar', Vencida: 'Vencida', Pagada: 'Liquidada' }[e] || e)
const claseEstado = (e) => ({ Pendiente: 'amber', Vencida: 'clay', Pagada: 'pine' }[e] || 'muted')
const iconoEstado = (e) => ({ Pendiente: timeOutline, Vencida: alertCircleOutline, Pagada: checkmarkCircleOutline }[e] || timeOutline)
const vacioTexto = computed(() => ({ Pendiente: 'Sin cuentas por cobrar vigentes.', Vencida: 'Sin cuentas vencidas.', Pagada: 'Aún no hay créditos liquidados.' }[estado.value]))

function setEstado(k) {
  estado.value = k
  pagina.value = 1
  cargar()
}

const itemsFiltrados = computed(() => {
  const q = buscar.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter(c => {
    const nom = (c.clienteNombre || '').toLowerCase()
    const ped = String(c.pedidoId || '')
    return nom.includes(q) || ped.includes(q)
  })
})

const totalPaginas = computed(() => Math.max(1, Math.ceil(itemsFiltrados.value.length / tamano.value)))
const paginasVisibles = computed(() => {
  const tp = totalPaginas.value, actual = pagina.value
  const rango = []
  let ini = Math.max(1, actual - 2), fin = Math.min(tp, ini + 4)
  ini = Math.max(1, fin - 4)
  for (let i = ini; i <= fin; i++) rango.push(i)
  return rango
})
const itemsPaginados = computed(() => {
  const ini = (pagina.value - 1) * tamano.value
  return itemsFiltrados.value.slice(ini, ini + tamano.value)
})

function irPagina(n) {
  if (n >= 1 && n <= totalPaginas.value) pagina.value = n
}

function whatsappCobro(c) {
  const tel = (c.clienteTelefono || '').replace(/\D/g, '')
  const num = tel.length === 10 ? '52' + tel : tel
  const saldoPendiente = (c.saldo != null && c.saldo > 0) ? c.saldo : c.monto
  let detAbono = ''
  if (c.abonado > 0) detAbono = ` (de un total de ${money(c.monto)}, con abonos previos de ${money(c.abonado)})`
  const msg = encodeURIComponent(`Hola ${c.clienteNombre}, le saludamos de Distribuidora. Le recordamos su saldo pendiente por pagar de ${money(saldoPendiente)}${detAbono} correspondiente al pedido #${c.pedidoId} con fecha límite ${fecha(c.fechaLimite)}. Agradecemos su confirmación de pago. ¡Muchas gracias!`)
  return `https://wa.me/${num}?text=${msg}`
}

async function cargar() {
  cargando.value = true; error.value = ''
  try {
    const [lista, res] = await Promise.all([
      http.get('/creditos', { params: { estado: estado.value, tamano: 200 } }),
      http.get('/creditos/resumen')
    ])
    items.value = lista.data.items || []
    resumen.value = res.data
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudieron cargar los créditos.'
  } finally {
    cargando.value = false
  }
}

async function pagar(c) {
  const montoALiquidar = (c.saldo != null && c.saldo > 0) ? c.saldo : c.monto
  const detalleExtra = c.abonado > 0 ? `\nYa se habían abonado previamente: ${money(c.abonado)}.` : ''
  if (!confirm(`¿Liquidar el saldo de ${c.clienteNombre} por ${money(montoALiquidar)}?${detalleExtra}\n\nEsto marcará la cuenta como pagada y actualizará en tiempo real el saldo en Deudas de Clientes.`)) return
  ocupado.value = c.id
  try {
    await http.post(`/creditos/${c.id}/pagar`)
    resumen.value = null
    await cargar()
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudo registrar el pago.'
  } finally {
    ocupado.value = null
  }
}

async function revisar() {
  revisando.value = true; avisoRevision.value = ''
  try {
    const { data } = await http.post('/creditos/alertas/notificar', null, { params: { dias: 2 } })
    if (data.nuevas > 0) avisoRevision.value = `Se enviaron ${data.nuevas} alerta(s) de crédito por vencer.`
    else if (data.revisadas > 0) avisoRevision.value = `Hay ${data.revisadas} cuenta(s) por vencer; ya estaban avisadas hoy.`
    else avisoRevision.value = 'No hay créditos próximos a vencer.'
  } catch (e) {
    avisoRevision.value = e.response?.data?.mensaje || 'No se pudo revisar.'
  } finally {
    revisando.value = false
  }
}

onMounted(() => {
  emit('ctx', { titulo: 'Créditos', sub: 'Control de cuentas por cobrar y vencimientos', back: null })
  cargar()
})
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; }
.err { color: var(--clay); font-weight: 600; margin-top: 16px; }

/* Resumen */
.resumen { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.rc { flex: 1; min-width: 160px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px 16px; box-shadow: var(--shadow); }
.rc .l { font-size: 11.5px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
.rc .v { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 24px; margin-top: 4px; font-variant-numeric: tabular-nums; }
.rc .s { font-size: 12px; color: var(--muted); margin-top: 2px; }
.rc.rojo .v { color: var(--clay); }
.rc.pine .v { color: var(--pine); }

/* Toolbar */
.toolbar { display: flex; gap: 10px; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
.search-box { display: flex; align-items: center; gap: 8px; background: var(--surface); border: 1px solid var(--line); border-radius: 13px; padding: 9px 13px; flex: 1; min-width: 220px; box-shadow: var(--shadow); }
.search-box svg { width: 17px; height: 17px; stroke: var(--muted); fill: none; stroke-width: 2; flex: 0 0 auto; }
.search-box input { border: none; background: transparent; outline: none; font-size: 14px; font-weight: 500; color: var(--ink); width: 100%; }

.tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.tabs button { border: 1px solid var(--line); background: var(--surface); color: var(--muted); font-family: "Hanken Grotesk"; font-weight: 700; font-size: 12.5px; padding: 8px 14px; border-radius: 11px; cursor: pointer; box-shadow: var(--shadow); transition: .15s; }
.tabs button.on { background: var(--pine); color: #fff; border-color: var(--pine); }

.revisar { display: flex; align-items: center; gap: 7px; border: 1px solid var(--line); background: var(--surface); color: var(--ink-soft); font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13px; padding: 9px 14px; border-radius: 11px; cursor: pointer; box-shadow: var(--shadow); }
.revisar ion-icon { font-size: 17px; color: var(--amber); }
.revisar:disabled { opacity: .6; }

.aviso { background: var(--amber-soft); border: 1px solid #EAD9B8; color: #8A6516; border-radius: 12px; padding: 10px 14px; font-size: 13px; font-weight: 600; margin-bottom: 14px; }

/* Grid de créditos */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 12px; }
.card { display: flex; align-items: center; gap: 13px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px; box-shadow: var(--shadow); }
.chip { width: 42px; height: 42px; border-radius: 11px; display: grid; place-items: center; flex: 0 0 auto; }
.chip ion-icon { font-size: 21px; }
.chip.amber { background: var(--amber-soft); } .chip.amber ion-icon { color: #B9781F; }
.chip.clay { background: var(--clay-soft); } .chip.clay ion-icon { color: var(--clay); }
.chip.pine { background: var(--pine-tint); } .chip.pine ion-icon { color: var(--pine); }
.info { flex: 1; min-width: 0; }
.cli { font-weight: 700; font-size: 15px; }
.sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
.estado { font-size: 12px; font-weight: 700; margin-top: 4px; }
.estado.amber { color: #B9781F; } .estado.clay { color: var(--clay); } .estado.pine { color: var(--pine); }

.right { text-align: right; flex: 0 0 auto; display: flex; flex-direction: column; align-items: flex-end; gap: 7px; }
.monto-block { display: flex; flex-direction: column; align-items: flex-end; }
.monto { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 17px; font-variant-numeric: tabular-nums; }
.monto-saldo { font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 18px; color: var(--clay); font-variant-numeric: tabular-nums; }
.monto-sub { font-size: 11px; color: var(--muted); font-weight: 600; margin-top: 2px; display: flex; align-items: center; gap: 5px; }
.tag-abono { background: var(--pine-tint); color: var(--pine-deep); font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; }
.card-acts { display: flex; align-items: center; gap: 6px; }
.wa-btn { width: 34px; height: 34px; border-radius: 10px; background: #E8F5E9; border: 1px solid #C8E6C9; color: #128C7E; display: grid; place-items: center; text-decoration: none; }
.wa-btn ion-icon { font-size: 18px; }
.pagar { background: var(--pine); color: #fff; border: none; border-radius: 10px; padding: 8px 12px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12.5px; cursor: pointer; white-space: nowrap; }
.pagar:disabled { opacity: .5; }

/* Paginación */
.pager { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 22px; }
.pg { min-width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); display: grid; place-items: center; cursor: pointer; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; color: var(--ink-soft); padding: 0 6px; }
.pg svg { width: 17px; height: 17px; stroke: var(--ink-soft); fill: none; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.pg:disabled { opacity: .4; cursor: default; }
.pg.num.on { background: var(--pine); color: #fff; border-color: var(--pine); }
.cuenta { text-align: center; color: var(--muted); font-size: 12px; font-weight: 600; margin-top: 10px; }

/* Guía interactiva */
.guia-card { margin-top: 26px; background: var(--surface); border: 1px solid var(--line); border-radius: 18px; overflow: hidden; box-shadow: var(--shadow); }
.guia-header { display: flex; align-items: center; gap: 10px; padding: 14px 18px; cursor: pointer; user-select: none; background: var(--paper); }
.guia-icon { font-size: 19px; }
.guia-tit { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; color: var(--ink); flex: 1; }
.guia-badge { font-size: 11.5px; font-weight: 700; color: var(--pine); background: var(--pine-tint); padding: 4px 10px; border-radius: 999px; }
.guia-content { padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; border-top: 1px solid var(--line); }
.guia-item { display: flex; gap: 12px; align-items: flex-start; }
.gi-num { width: 22px; height: 22px; border-radius: 50%; background: var(--pine-tint); color: var(--pine); display: grid; place-items: center; font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 11.5px; flex: 0 0 auto; margin-top: 2px; }
.gi-text { font-size: 12.5px; color: var(--ink-soft); line-height: 1.45; }
.gi-text b { color: var(--ink); font-weight: 700; }
</style>
