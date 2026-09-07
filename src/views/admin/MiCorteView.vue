<template>
  <div class="corte-wrap">
    <p v-if="cargando" class="muted">Cargando corte de caja…</p>

    <div v-else-if="!resumen?.hayCargaPorCortar && !cerrado" class="vacio">
      <div class="v-ic"><ion-icon :icon="checkmarkDoneOutline" /></div>
      <div class="v-t">No hay corte pendiente</div>
      <div class="v-s">Todas tus ventas de mostrador están al día o ya fueron cerradas en un corte previo.</div>
    </div>

    <template v-else-if="!cerrado">
      <div class="grid2">
        <div class="col">
          <div class="hero">
            <div class="top"><span class="t">Ventas por cortar</span><span class="tag">{{ resumen.numeroPedidos }} venta(s)</span></div>
            <div class="val">{{ money(resumen.totalVentas) }}<span class="mxn">MXN</span></div>
          </div>

          <div class="eyebrow">Desglose por método de pago</div>
          <div class="mrow cash">
            <div class="mic"><ion-icon :icon="cashOutline" /></div>
            <div class="ml"><div class="k">Efectivo</div><div class="c">{{ conteo('Efectivo') }} ventas</div></div>
            <div class="mv">{{ money(resumen.totalEfectivo) }}<small>MXN</small></div>
          </div>
          <div class="mrow trans">
            <div class="mic"><ion-icon :icon="swapHorizontalOutline" /></div>
            <div class="ml"><div class="k">Transferencia</div><div class="c">{{ conteo('Transferencia') }} ventas</div></div>
            <div class="mv">{{ money(resumen.totalTransferencia) }}<small>MXN</small></div>
          </div>
          <div class="mrow card">
            <div class="mic"><ion-icon :icon="cardOutline" /></div>
            <div class="ml"><div class="k">Tarjeta</div><div class="c">{{ conteo('Tarjeta') }} ventas</div></div>
            <div class="mv">{{ money(resumen.totalTarjeta) }}<small>MXN</small></div>
          </div>
          <div class="mrow cred">
            <div class="mic"><ion-icon :icon="timeOutline" /></div>
            <div class="ml"><div class="k">Crédito</div><div class="c">{{ conteo('Credito') }} ventas</div></div>
            <div class="mv">{{ money(resumen.totalCredito) }}<small>MXN</small></div>
          </div>
          <p v-if="resumen.totalCredito > 0" class="cred-note">El crédito no se cobra hoy · pasa automáticamente a Cuentas por Cobrar</p>

          <!-- Botón y lista de ventas incluidas en este corte -->
          <button class="btn-desglose" @click="toggleVentasPorCortar()">
            <ion-icon :icon="listOutline" />
            <span>{{ mostrarVentas ? 'Ocultar tickets por cortar' : 'Ver detalle de tickets por cortar (' + resumen.numeroPedidos + ')' }}</span>
            <ion-icon :icon="mostrarVentas ? chevronUp : chevronDown" />
          </button>

          <div v-if="mostrarVentas" class="lista-tickets">
            <p v-if="cargandoVentas" class="muted2">Cargando tickets…</p>
            <div v-else-if="!ventasPorCortar.length" class="muted2">No se encontraron tickets detallados.</div>
            <div v-for="v in ventasPorCortar" :key="v.id" class="ticket-mini">
              <div class="tm-info">
                <div class="tm-cli">#{{ v.id }} · {{ v.clienteNombreMostrar }}</div>
                <div class="tm-sub">{{ fechaHora(v.fecha) }} · {{ v.metodoPago }} <span v-if="v.estadoPago === 'Pendiente'" class="tag-pend">Pendiente</span></div>
              </div>
              <div class="tm-tot">{{ money(v.total) }}</div>
            </div>
          </div>
        </div>

        <div class="col">
          <div class="eyebrow">Cuadre de efectivo físico</div>
          <div class="recon">
            <div class="rrow" v-if="resumen.efectivoPendiente > 0">
              <span class="l">Efectivo cobrado bruto</span>
              <span class="v">{{ money(resumen.totalEfectivo) }}</span>
            </div>
            <div class="rrow pend" v-if="resumen.efectivoPendiente > 0">
              <span class="l">Ventas entregadas c/ pago pendiente</span>
              <span class="v">−{{ money(resumen.efectivoPendiente) }}</span>
            </div>

            <!-- Alerta explicativa de pago pendiente -->
            <div v-if="resumen.efectivoPendiente > 0" class="alerta-pend-efectivo">
              ℹ️ <b>Pago pendiente:</b> Se descontaron {{ money(resumen.efectivoPendiente) }} porque la mercancía se entregó sin recibir el dinero en mano aún.
            </div>

            <div class="rrow" :class="{ total: resumen.efectivoPendiente > 0 }">
              <span class="l">Efectivo esperado en mano</span>
              <span class="v">{{ money(resumen.efectivoEsperado) }}</span>
            </div>
            <div class="declare">
              <div class="fl">Efectivo físico que entregas</div>
              <div class="inwrap">
                <span class="pfx">$</span>
                <input v-model="cashStr" type="text" inputmode="decimal" @input="onCash">
                <span class="sfx">MXN</span>
              </div>
            </div>
            <div class="diff" :class="estadoDiff">
              <div class="dt"><div class="a">{{ tituloDiff }}</div><div class="b">{{ subDiff }}</div></div>
              <div class="dv">{{ valorDiff }}</div>
            </div>
            <div class="note-field" v-show="!esCero">
              <div class="fl">Observación o justificación de la diferencia</div>
              <input v-model="observacion" placeholder="Explica la causa del faltante o sobrante…">
            </div>
          </div>
          <p v-if="error" class="err">{{ error }}</p>
          <button class="cta" :disabled="enviando" @click="cerrar()">{{ enviando ? 'Cerrando corte…' : 'Cerrar mi corte de caja' }}</button>
        </div>
      </div>

      <!-- Guía interactiva -->
      <div class="guia-card">
        <div class="guia-header" @click="mostrarGuia = !mostrarGuia">
          <div class="guia-icon">💡</div>
          <div class="guia-tit">¿Cómo se calcula y concilia el Corte de Caja de Mostrador?</div>
          <div class="guia-badge">{{ mostrarGuia ? 'Ocultar guía' : 'Ver guía' }}</div>
        </div>
        <div v-if="mostrarGuia" class="guia-content">
          <div class="guia-item">
            <div class="gi-num">1</div>
            <div class="gi-text">
              <b>Fórmula del Efectivo Esperado:</b>
              El monto esperado a entregar es exactamente el <code>Efectivo Total Cobrado − Efectivo con Pago Pendiente</code>.
            </div>
          </div>
          <div class="guia-item">
            <div class="gi-num">2</div>
            <div class="gi-text">
              <b>Transferencias y Tarjetas:</b>
              Aparecen desglosadas en el resumen para comprobar los ingresos del negocio, pero no se suman al efectivo en mano porque entraron por cuenta bancaria.
            </div>
          </div>
          <div class="guia-item">
            <div class="gi-num">3</div>
            <div class="gi-text">
              <b>Ventas a Crédito:</b>
              Quedan registradas formalmente en Cuentas por Cobrar y se liquidan mediante abonos en el módulo <i>Deudas de Clientes</i>.
            </div>
          </div>
          <div class="guia-item">
            <div class="gi-num">4</div>
            <div class="gi-text">
              <b>Impresión de Comprobante:</b>
              Al cerrar el corte se genera un ticket sellado con fecha, hora, desglose y diferencias, listo para imprimir en tu impresora Bluetooth portátil MUNBYN.
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="hecho">
      <div class="check"><ion-icon :icon="checkmarkDoneOutline" /></div>
      <h2>Corte cerrado exitosamente</h2>
      <p>{{ corte.repartidorNombre }} · {{ fechaCorte }}</p>
      <div class="slip">
        <div class="h"><div class="b">CORTE DE CAJA</div><small>Mostrador</small></div>
        <div class="r"><span>Efectivo cobrado</span><span>{{ money2(corte.totalEfectivo) }}</span></div>
        <div class="r"><span>Transferencia</span><span>{{ money2(corte.totalTransferencia) }}</span></div>
        <div class="r"><span>Tarjeta</span><span>{{ money2(corte.totalTarjeta) }}</span></div>
        <div class="r"><span>Crédito (x cobrar)</span><span>{{ money2(corte.totalCredito) }}</span></div>
        <div class="r b"><span>VENTAS TOTALES</span><span>{{ money2(corte.totalVentas) }}</span></div>
        <div class="r" style="margin-top:9px"><span>Efectivo esperado</span><span>{{ money2(corte.efectivoEsperado) }}</span></div>
        <div class="r"><span>Efectivo entregado</span><span>{{ money2(corte.efectivoEntregado) }}</span></div>
        <div class="r"><span>Diferencia</span><span :class="{ ok: Math.abs(corte.diferencia) < 0.005 }">{{ signo(corte.diferencia) }}{{ money2(Math.abs(corte.diferencia)) }}</span></div>
      </div>
      <div class="acts">
        <button class="cta-print" :disabled="imprimiendo" @click="imprimirTicket()">
          <ion-icon :icon="printOutline" /> {{ imprimiendo ? 'Imprimiendo…' : 'Imprimir comprobante térmico' }}
        </button>
        <button class="cta2" @click="nuevoCorte()">Listo / Continuar</button>
      </div>
      <p v-if="printMsg" class="print-msg">{{ printMsg }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { IonIcon } from '@ionic/vue'
import {
  cashOutline,
  swapHorizontalOutline,
  cardOutline,
  timeOutline,
  checkmarkDoneOutline,
  printOutline,
  listOutline,
  chevronDown,
  chevronUp
} from 'ionicons/icons'
import http from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { imprimirCorte } from '@/services/printer'

const emit = defineEmits(['ctx'])
const auth = useAuthStore()
const resumen = ref(null)
const cargando = ref(true)
const error = ref('')
const cashStr = ref('')
const observacion = ref('')
const enviando = ref(false)
const cerrado = ref(false)
const corte = ref(null)
const imprimiendo = ref(false)
const printMsg = ref('')

const mostrarVentas = ref(false)
const ventasPorCortar = ref([])
const cargandoVentas = ref(false)
const mostrarGuia = ref(false)

const money = (n) => '$' + Math.abs(Number(n || 0)).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const money2 = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const signo = (n) => n < 0 ? '−' : n > 0 ? '+' : ''
const fechaCorte = computed(() => corte.value
  ? new Date(corte.value.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : '')
const fechaHora = (f) => new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

function conteo(metodo) {
  const m = resumen.value?.metodos?.find((x) => x.metodo === metodo)
  return m ? m.conteo : 0
}
const given = computed(() => {
  const n = parseFloat((cashStr.value || '').replace(/,/g, ''))
  return isNaN(n) ? 0 : n
})
const diff = computed(() => Math.round((given.value - (resumen.value?.efectivoEsperado || 0)) * 100) / 100)
const esCero = computed(() => Math.abs(diff.value) < 0.005)
const estadoDiff = computed(() => esCero.value ? 'ok' : diff.value < 0 ? 'short' : 'over')
const tituloDiff = computed(() => esCero.value ? 'Cuadra perfecto' : diff.value < 0 ? 'Faltante' : 'Sobrante')
const subDiff = computed(() => esCero.value ? 'El efectivo coincide exactamente con lo esperado' : diff.value < 0 ? 'Entregas menos de lo esperado' : 'Entregas más de lo esperado')
const valorDiff = computed(() => (esCero.value ? '$0' : (diff.value < 0 ? '−' : '+') + money(diff.value)))

function onCash() {
  let v = (cashStr.value || '').replace(/[^\d.]/g, '')
  const parts = v.split('.')
  v = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('').slice(0, 2) : parts[0]
  if (v === '') { cashStr.value = ''; return }
  const [ent, dec] = v.split('.')
  const entFmt = ent ? Number(ent).toLocaleString('es-MX') : '0'
  cashStr.value = dec !== undefined ? entFmt + '.' + dec : entFmt
}

async function toggleVentasPorCortar() {
  mostrarVentas.value = !mostrarVentas.value
  if (mostrarVentas.value && !ventasPorCortar.value.length) {
    cargandoVentas.value = true
    try {
      const { data } = await http.get('/pedidos', {
        params: { repartidorId: auth.usuarioId, esVentaLibre: true, tamano: 100 }
      })
      ventasPorCortar.value = (data.items || []).filter(v => !v.corteCajaId)
    } catch { /* continuar */ }
    finally { cargandoVentas.value = false }
  }
}

async function cargar() {
  cargando.value = true; error.value = ''
  try {
    const { data } = await http.get('/cortes/resumen-vendedor', { params: { vendedorId: auth.usuarioId } })
    resumen.value = data
    if (data.hayCargaPorCortar) {
      cashStr.value = Number(data.efectivoEsperado || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudo cargar el corte.'
  } finally { cargando.value = false }
}

async function cerrar() {
  enviando.value = true; error.value = ''
  try {
    const { data } = await http.post('/cortes/cerrar-vendedor', {
      vendedorId: auth.usuarioId,
      efectivoEntregado: given.value,
      observacion: observacion.value || null
    })
    corte.value = data
    cerrado.value = true
    imprimirAuto()
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudo cerrar el corte.'
  } finally { enviando.value = false }
}

async function imprimirTicket() {
  imprimiendo.value = true; printMsg.value = ''
  try {
    const c = corte.value || {}
    await imprimirCorte({
      repartidor: c.repartidorNombre || auth.usuario?.nombre,
      cargaId: null,
      fecha: c.fecha || Date.now(),
      totalEfectivo: c.totalEfectivo,
      totalTransferencia: c.totalTransferencia,
      totalTarjeta: c.totalTarjeta,
      totalCredito: c.totalCredito,
      totalVentas: c.totalVentas,
      efectivoEsperado: c.efectivoEsperado,
      efectivoEntregado: c.efectivoEntregado,
      diferencia: c.diferencia,
      valorDevuelto: 0,
      valorMerma: 0,
      devueltos: []
    })
    printMsg.value = 'Corte impreso con éxito.'
  } catch (e) {
    printMsg.value = e?.message || 'No se pudo imprimir.'
  } finally { imprimiendo.value = false }
}

async function imprimirAuto() {
  try {
    const c = corte.value || {}
    await imprimirCorte({
      repartidor: c.repartidorNombre || auth.usuario?.nombre,
      cargaId: null,
      fecha: c.fecha || Date.now(),
      totalEfectivo: c.totalEfectivo,
      totalTransferencia: c.totalTransferencia,
      totalTarjeta: c.totalTarjeta,
      totalCredito: c.totalCredito,
      totalVentas: c.totalVentas,
      efectivoEsperado: c.efectivoEsperado,
      efectivoEntregado: c.efectivoEntregado,
      diferencia: c.diferencia,
      valorDevuelto: 0,
      valorMerma: 0,
      devueltos: []
    })
    printMsg.value = 'Corte impreso automáticamente.'
  } catch {
    printMsg.value = 'El corte se guardó. Usa "Imprimir comprobante" si requieres el ticket impreso.'
  }
}

function nuevoCorte() {
  cerrado.value = false; corte.value = null
  observacion.value = ''; cashStr.value = ''; printMsg.value = ''
  ventasPorCortar.value = []
  mostrarVentas.value = false
  cargar()
}

onMounted(() => {
  emit('ctx', { titulo: 'Mi corte', sub: 'Cierre y cuadre de caja de tus ventas de mostrador', back: null })
  cargar()
})
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; }
.muted2 { color: var(--muted); font-size: 13px; padding: 6px 4px; }
.err { color: var(--clay); font-size: 13px; font-weight: 600; margin: 10px 2px; }
.vacio { text-align: center; padding: 70px 26px; }
.v-ic { width: 64px; height: 64px; border-radius: 18px; margin: 0 auto 16px; display: grid; place-items: center; background: var(--pine-tint); }
.v-ic ion-icon { font-size: 30px; color: var(--pine); }
.v-t { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 19px; }
.v-s { color: var(--muted); font-size: 13.5px; margin: 8px auto 0; line-height: 1.5; max-width: 360px; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
.eyebrow { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 11.5px; letter-spacing: .13em; text-transform: uppercase; color: var(--muted); margin: 16px 2px 11px; }
.hero { background: linear-gradient(155deg,var(--pine),var(--pine-deep)); border-radius: 24px; padding: 20px; color: #fff; position: relative; overflow: hidden; box-shadow: 0 20px 40px -22px rgba(10,63,51,.9); }
.hero .top { display: flex; justify-content: space-between; align-items: center; position: relative; }
.hero .top .t { font-size: 12.5px; font-weight: 600; color: #BFE0D5; }
.hero .top .tag { font-size: 11px; font-weight: 700; color: #9FC9BC; background: rgba(255,255,255,.10); padding: 5px 10px; border-radius: 999px; }
.hero .val { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 38px; letter-spacing: -.02em; margin-top: 10px; position: relative; font-variant-numeric: tabular-nums; }
.hero .val .mxn { font-size: 14px; color: #9FC9BC; font-weight: 600; margin-left: 6px; }

.mrow { display: flex; align-items: center; gap: 13px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 13px 14px; margin-bottom: 9px; box-shadow: var(--shadow); }
.mic { width: 40px; height: 40px; border-radius: 11px; display: grid; place-items: center; flex: 0 0 auto; }
.mic ion-icon { font-size: 19px; }
.mrow.cash .mic { background: var(--pine-tint); } .mrow.cash .mic ion-icon { color: var(--pine); }
.mrow.trans .mic { background: var(--sky-soft); } .mrow.trans .mic ion-icon { color: var(--sky); }
.mrow.card .mic { background: var(--amber-soft); } .mrow.card .mic ion-icon { color: #B9781F; }
.mrow.cred .mic { background: var(--clay-soft); } .mrow.cred .mic ion-icon { color: var(--clay); }
.mrow .ml { flex: 1; }
.mrow .ml .k { font-weight: 700; font-size: 14.5px; }
.mrow .ml .c { font-size: 12px; color: var(--muted); font-weight: 600; margin-top: 1px; }
.mrow .mv { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; font-variant-numeric: tabular-nums; text-align: right; }
.mrow .mv small { display: block; font-size: 10px; color: var(--muted); font-weight: 600; letter-spacing: .04em; }
.cred-note { font-size: 11.5px; color: var(--clay); font-weight: 600; margin: 2px 4px 0; }

/* Botón y lista de tickets */
.btn-desglose { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; margin-top: 12px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13px; color: var(--ink-soft); cursor: pointer; box-shadow: var(--shadow); }
.btn-desglose ion-icon { font-size: 17px; color: var(--pine); }
.lista-tickets { margin-top: 8px; max-height: 260px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
.ticket-mini { display: flex; align-items: center; justify-content: space-between; background: var(--paper); border: 1px solid var(--line); border-radius: 11px; padding: 10px 12px; }
.tm-info { flex: 1; min-width: 0; }
.tm-cli { font-size: 13px; font-weight: 700; }
.tm-sub { font-size: 11px; color: var(--muted); margin-top: 2px; }
.tag-pend { font-size: 9.5px; font-weight: 700; background: var(--clay-soft); color: var(--clay); padding: 1px 6px; border-radius: 4px; }
.tm-tot { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14.5px; font-variant-numeric: tabular-nums; }

/* Cuadre de efectivo */
.recon { background: var(--surface); border: 1px solid var(--line); border-radius: 20px; padding: 6px 16px 16px; box-shadow: var(--shadow); }
.rrow { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid var(--line); }
.rrow.pend { border-bottom: 1px dashed var(--line); }
.rrow.pend .l { font-size: 13px; color: var(--clay); font-weight: 600; }
.rrow.pend .v { color: var(--clay); font-size: 15px; }
.alerta-pend-efectivo { background: var(--amber-soft); border: 1px solid #EAD9B8; border-radius: 11px; padding: 9px 12px; font-size: 12px; color: #8A6516; line-height: 1.4; margin: 10px 0 6px; }
.rrow.total { border-bottom: none; padding-top: 10px; }
.rrow.total .l { font-weight: 700; color: var(--ink); }
.rrow.total .v { font-size: 19px; color: var(--pine); }
.rrow .l { font-size: 14px; font-weight: 600; color: var(--ink-soft); }
.rrow .v { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 17px; font-variant-numeric: tabular-nums; }
.declare { padding: 15px 0 6px; }
.declare .fl { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 9px; }
.inwrap { display: flex; align-items: center; background: var(--paper); border: 1.5px solid var(--line); border-radius: 13px; padding: 4px 14px; transition: border-color .2s; }
.inwrap:focus-within { border-color: var(--pine); }
.inwrap .pfx { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 22px; color: var(--ink-soft); margin-right: 6px; }
.inwrap input { border: none; background: transparent; outline: none; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 24px; color: var(--ink); width: 100%; font-variant-numeric: tabular-nums; }
.inwrap .sfx { font-size: 13px; color: var(--muted); font-weight: 600; }
.diff { margin-top: 14px; border-radius: 15px; padding: 15px; display: flex; align-items: center; gap: 13px; transition: .25s; }
.diff .dt { flex: 1; }
.diff .dt .a { font-weight: 700; font-size: 14.5px; }
.diff .dt .b { font-size: 12.5px; font-weight: 500; margin-top: 1px; }
.diff .dv { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 22px; font-variant-numeric: tabular-nums; }
.diff.ok { background: var(--pine-tint); } .diff.ok .a, .diff.ok .dv { color: var(--pine-deep); } .diff.ok .b { color: var(--pine); }
.diff.short { background: var(--clay-soft); } .diff.short .a, .diff.short .dv { color: var(--clay); } .diff.short .b { color: #9A4730; }
.diff.over { background: var(--amber-soft); } .diff.over .a, .diff.over .dv { color: #9A6512; } .diff.over .b { color: #B9781F; }
.note-field { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px; margin-top: 11px; box-shadow: var(--shadow); }
.note-field .fl { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 9px; }
.note-field input { width: 100%; border: none; background: transparent; outline: none; font-family: "Hanken Grotesk"; font-size: 14px; font-weight: 500; color: var(--ink); }
.note-field input::placeholder { color: #AAB3AC; }
.cta { width: 100%; margin-top: 14px; background: var(--ink); color: #fff; border: none; border-radius: 16px; padding: 16px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15.5px; cursor: pointer; box-shadow: 0 12px 22px -12px rgba(21,42,36,.7); }
.cta:disabled { opacity: .5; }

/* Hecho */
.hecho { text-align: center; padding: 50px 20px; }
.check { width: 74px; height: 74px; border-radius: 50%; background: var(--pine-tint); display: grid; place-items: center; margin: 0 auto 16px; }
.check ion-icon { font-size: 34px; color: var(--pine); }
.hecho h2 { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 23px; }
.hecho p { color: var(--muted); font-size: 13.5px; font-weight: 500; margin-top: 5px; }
.slip { background: #fff; width: 260px; border: 1px solid var(--line); border-radius: 8px; margin: 22px auto 0; padding: 18px 18px 10px; color: #1c1c1c; box-shadow: var(--shadow); }
.slip .h { text-align: center; border-bottom: 1.5px dashed #c9c9c9; padding-bottom: 10px; }
.slip .h .b { font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 15px; letter-spacing: .03em; }
.slip .h small { font-size: 10.5px; color: #777; display: block; margin-top: 2px; }
.slip .r { display: flex; justify-content: space-between; font-size: 11.5px; margin: 7px 0; font-variant-numeric: tabular-nums; }
.slip .r.b { font-family: "Bricolage Grotesque"; font-weight: 800; border-top: 1.5px dashed #c9c9c9; margin-top: 9px; padding-top: 9px; font-size: 13px; }
.slip .ok { color: #0E5C4A; font-weight: 700; }
.acts { display: flex; gap: 10px; justify-content: center; margin-top: 22px; flex-wrap: wrap; }
.cta-print { background: var(--surface); color: var(--ink); border: 1px solid var(--line); border-radius: 14px; padding: 13px 20px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 7px; box-shadow: var(--shadow); }
.cta-print:disabled { opacity: .5; }
.cta-print ion-icon { font-size: 18px; color: var(--pine); }
.print-msg { font-size: 12.5px; color: var(--muted); margin-top: 12px; font-weight: 500; text-align: center; }
.cta2 { background: var(--pine); color: #fff; border: none; border-radius: 14px; padding: 13px 26px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; }

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
.gi-text code { font-family: monospace; background: var(--paper-2); padding: 2px 5px; border-radius: 4px; font-size: 11.5px; }

@media (max-width: 860px) { .grid2 { grid-template-columns: 1fr; } }
</style>
