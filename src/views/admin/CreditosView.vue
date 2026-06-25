<template>
  <div>
    <div class="resumen" v-if="resumen">
      <div class="rc"><div class="l">Por cobrar</div><div class="v">{{ money(resumen.totalPendiente) }}</div><div class="s">{{ resumen.cuentasPendientes }} cuentas</div></div>
      <div class="rc rojo"><div class="l">Vencido</div><div class="v">{{ money(resumen.totalVencido) }}</div><div class="s">{{ resumen.cuentasVencidas }} cuentas</div></div>
    </div>

    <div class="acc">
      <div class="tabs">
        <button v-for="f in filtros" :key="f.k" :class="{ on: estado === f.k }" @click="setEstado(f.k)">{{ f.t }}</button>
      </div>
      <button class="revisar" :disabled="revisando" @click="revisar()">
        <ion-icon :icon="notificationsOutline" />{{ revisando ? 'Revisando…' : 'Revisar vencimientos' }}
      </button>
    </div>
    <p v-if="avisoRevision" class="aviso">{{ avisoRevision }}</p>

    <p v-if="cargando" class="muted">Cargando…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else-if="!items.length" class="muted">{{ vacioTexto }}</p>

    <div class="grid">
      <div v-for="c in items" :key="c.id" class="card">
        <div class="chip" :class="claseEstado(c.estado)"><ion-icon :icon="iconoEstado(c.estado)" /></div>
        <div class="info">
          <div class="cli">{{ c.clienteNombre }}</div>
          <div class="sub">Pedido #{{ c.pedidoId }} · límite {{ fecha(c.fechaLimite) }} <span v-if="c.repartidorNombre">· {{ c.repartidorNombre }}</span></div>
          <div class="estado" :class="claseEstado(c.estado)">
            {{ estadoTxt(c.estado) }}
            <span v-if="c.estado === 'Pendiente' && c.diasParaVencer >= 0"> · vence en {{ c.diasParaVencer }} día(s)</span>
            <span v-else-if="c.estado === 'Vencida'"> · venció hace {{ Math.abs(c.diasParaVencer) }} día(s)</span>
            <span v-else-if="c.estado === 'Pagada' && c.pagadaEn"> · {{ fecha(c.pagadaEn) }}</span>
          </div>
        </div>
        <div class="right">
          <div class="monto">{{ money(c.monto) }}</div>
          <button v-if="c.estado !== 'Pagada'" class="pagar" :disabled="ocupado === c.id" @click="pagar(c)">{{ ocupado === c.id ? '…' : 'Marcar pagada' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { IonIcon } from '@ionic/vue'
import { timeOutline, alertCircleOutline, checkmarkCircleOutline, notificationsOutline } from 'ionicons/icons'
import http from '@/api/http'

const emit = defineEmits(['ctx'])
const items = ref([])
const resumen = ref(null)
const cargando = ref(true)
const error = ref('')
const estado = ref('Pendiente')
const ocupado = ref(null)
const revisando = ref(false)
const avisoRevision = ref('')

const filtros = [{ k: 'Pendiente', t: 'Por cobrar' }, { k: 'Vencida', t: 'Vencidas' }, { k: 'Pagada', t: 'Liquidadas' }]
const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const fecha = (f) => new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
const estadoTxt = (e) => ({ Pendiente: 'Por cobrar', Vencida: 'Vencida', Pagada: 'Liquidada' }[e] || e)
const claseEstado = (e) => ({ Pendiente: 'amber', Vencida: 'clay', Pagada: 'pine' }[e] || 'muted')
const iconoEstado = (e) => ({ Pendiente: timeOutline, Vencida: alertCircleOutline, Pagada: checkmarkCircleOutline }[e] || timeOutline)
const vacioTexto = computed(() => ({ Pendiente: 'Sin cuentas por cobrar.', Vencida: 'Sin cuentas vencidas.', Pagada: 'Aún no hay créditos liquidados.' }[estado.value]))

function setEstado(k) { estado.value = k; cargar() }
async function cargar() {
  cargando.value = true; error.value = ''
  try {
    const [lista, res] = await Promise.all([
      http.get('/creditos', { params: { estado: estado.value, tamano: 100 } }),
      resumen.value ? Promise.resolve({ data: resumen.value }) : http.get('/creditos/resumen')
    ])
    items.value = lista.data.items
    resumen.value = res.data
  } catch (e) { error.value = e.response?.data?.mensaje || 'No se pudieron cargar los créditos.' }
  finally { cargando.value = false }
}
async function pagar(c) {
  if (!confirm(`¿Marcar como pagada la cuenta de ${c.clienteNombre} por ${money(c.monto)}?`)) return
  ocupado.value = c.id
  try { await http.post(`/creditos/${c.id}/pagar`); resumen.value = null; await cargar() }
  catch (e) { error.value = e.response?.data?.mensaje || 'No se pudo registrar el pago.' }
  finally { ocupado.value = null }
}
async function revisar() {
  revisando.value = true; avisoRevision.value = ''
  try {
    const { data } = await http.post('/creditos/alertas/notificar', null, { params: { dias: 2 } })
    if (data.nuevas > 0) avisoRevision.value = `Se enviaron ${data.nuevas} alerta(s) de crédito por vencer.`
    else if (data.revisadas > 0) avisoRevision.value = `Hay ${data.revisadas} cuenta(s) por vencer; ya estaban avisadas hoy.`
    else avisoRevision.value = 'No hay créditos próximos a vencer.'
  } catch (e) { avisoRevision.value = e.response?.data?.mensaje || 'No se pudo revisar.' }
  finally { revisando.value = false }
}
onMounted(() => { emit('ctx', { titulo: 'Créditos', sub: 'Cuentas por cobrar y liquidadas', back: null }); cargar() })
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; } .err { color: var(--clay); font-weight: 600; margin-top: 16px; }
.resumen { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.rc { flex: 1; min-width: 160px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px 16px; box-shadow: var(--shadow); }
.rc .l { font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
.rc .v { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 24px; margin-top: 4px; font-variant-numeric: tabular-nums; }
.rc .s { font-size: 12px; color: var(--muted); margin-top: 2px; }
.rc.rojo .v { color: var(--clay); }
.acc { display: flex; gap: 12px; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
.tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.tabs button { border: 1px solid var(--line); background: var(--surface); color: var(--muted); font-family: "Hanken Grotesk"; font-weight: 700; font-size: 13px; padding: 8px 14px; border-radius: 11px; cursor: pointer; box-shadow: var(--shadow); }
.tabs button.on { background: var(--pine); color: #fff; border-color: var(--pine); }
.revisar { display: flex; align-items: center; gap: 7px; border: 1px solid var(--line); background: var(--surface); color: var(--ink-soft); font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13px; padding: 9px 14px; border-radius: 11px; cursor: pointer; box-shadow: var(--shadow); }
.revisar ion-icon { font-size: 17px; color: var(--amber); }
.revisar:disabled { opacity: .6; }
.aviso { background: var(--amber-soft); border: 1px solid #EAD9B8; color: #8A6516; border-radius: 12px; padding: 10px 14px; font-size: 13px; font-weight: 600; margin-bottom: 14px; }
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
.monto { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 17px; font-variant-numeric: tabular-nums; }
.pagar { background: var(--pine); color: #fff; border: none; border-radius: 10px; padding: 8px 12px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12.5px; cursor: pointer; }
.pagar:disabled { opacity: .5; }
</style>
