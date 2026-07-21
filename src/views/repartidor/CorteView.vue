<template>
  <ion-page>
    <ion-content :fullscreen="true" class="ct">
      <div class="bar">
        <div class="iconbtn" @click="salir()">
          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
        </div>
        <div class="ttl"><div class="s">Cierre de carga</div><div class="n">Corte de caja</div></div>
        <div class="iconbtn"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></div>
      </div>

      <!-- No hay carga cerrada esperando corte -->
      <div v-if="!cargando && resumen && !resumen.hayCargaPorCortar" class="vacio">
        <div class="v-ic"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></div>
        <div class="v-t">No hay corte pendiente</div>
        <div class="v-s">Cuando cierres tu carga, aquí harás el corte de caja de esa carga.</div>
        <button class="v-btn" @click="salir()">Volver</button>
      </div>

      <div class="body" v-else-if="!cargando && resumen">
        <div class="hero">
          <div class="top"><span class="t">Ventas de esta carga</span><span class="tag">Carga #{{ resumen.cargaId }}</span></div>
          <div class="val">{{ money(resumen.totalVentas) }}<span class="mxn">MXN</span></div>
          <div class="sub">
            <div><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7FD3BD" stroke-width="2.2" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg><b>{{ resumen.numeroPedidos }}</b>&nbsp;ventas</div>
            <div><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7FD3BD" stroke-width="2.2" stroke-linecap="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/></svg><b>{{ fechaTag }}</b></div>
          </div>
        </div>
        <div class="eyebrow">Cómo te pagaron</div>
        <div class="mrow cash">
          <div class="mic"><svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg></div>
          <div class="ml"><div class="k">Efectivo</div><div class="c">{{ conteo('Efectivo') }} ventas</div></div>
          <div class="mv">{{ money(resumen.totalEfectivo) }}<small>MXN</small></div>
        </div>
        <div class="mrow trans">
          <div class="mic"><svg viewBox="0 0 24 24"><path d="M4 9h16M4 15h16M8 5l-4 4 4 4M16 11l4 4-4 4"/></svg></div>
          <div class="ml"><div class="k">Transferencia</div><div class="c">{{ conteo('Transferencia') }} ventas</div></div>
          <div class="mv">{{ money(resumen.totalTransferencia) }}<small>MXN</small></div>
        </div>
        <div class="mrow card">
          <div class="mic"><svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg></div>
          <div class="ml"><div class="k">Tarjeta</div><div class="c">{{ conteo('Tarjeta') }} ventas</div></div>
          <div class="mv">{{ money(resumen.totalTarjeta) }}<small>MXN</small></div>
        </div>
        <div class="mrow cred">
          <div class="mic"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></svg></div>
          <div class="ml"><div class="k">Crédito</div><div class="c">{{ conteo('Credito') }} ventas</div></div>
          <div class="mv">{{ money(resumen.totalCredito) }}<small>MXN</small></div>
        </div>
        <div class="cred-note"><svg viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg> El crédito no se cobra hoy · pasa a cuentas por cobrar</div>
        <div class="eyebrow">Cuadre de efectivo</div>
        <div class="recon">
          <div class="rrow"><span class="l">Efectivo esperado</span><span class="v">{{ money(resumen.efectivoEsperado) }}</span></div>
          <div class="declare">
            <div class="fl">Efectivo que entrego</div>
            <div class="inwrap">
              <span class="pfx">$</span>
              <input v-model="cashStr" type="text" inputmode="numeric" @input="onCash" :disabled="resumen.yaTieneCorte">
              <span class="sfx">MXN</span>
            </div>
          </div>
          <div class="diff" :class="estadoDiff">
            <div class="dic" v-html="iconoDiff"></div>
            <div class="dt"><div class="a">{{ tituloDiff }}</div><div class="b">{{ subDiff }}</div></div>
            <div class="dv">{{ valorDiff }}</div>
          </div>
          <div class="note-field" v-show="diff !== 0">
            <div class="fl">Observación de la diferencia</div>
            <input v-model="observacion" placeholder="Explica el faltante o sobrante…">
          </div>
        </div>
        <div class="eyebrow">Mercancía</div>
        <div class="merc">
          <div class="mcard dev">
            <div class="k"><svg viewBox="0 0 24 24"><path d="M3 7h13a4 4 0 0 1 0 8H8M3 7l4-4M3 7l4 4"/></svg> Devuelto</div>
            <div class="v">{{ money(resumen.valorDevuelto) }}</div><div class="u">al almacén · MXN</div>
          </div>
          <div class="mcard mer">
            <div class="k"><svg viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg> Merma</div>
            <div class="v">{{ money(resumen.valorMerma) }}</div><div class="u">MXN</div>
          </div>
        </div>
        <p v-if="resumen.yaTieneCorte" class="cerrado">Esta carga ya tiene su corte.</p>
        <p v-if="error" class="err">{{ error }}</p>
      </div>
      <div v-else-if="cargando" class="loader">Calculando el corte…</div>
      <div v-else class="loader">{{ error || 'No se pudo cargar el corte.' }}</div>
      <div class="foot" v-if="!cargando && resumen && resumen.hayCargaPorCortar && !resumen.yaTieneCorte && !done">
        <button class="cta" :disabled="enviando" @click="cerrar()">
          {{ enviando ? 'Cerrando…' : 'Cerrar corte de esta carga' }}
          <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>
      </div>
      <!-- éxito -->
      <div class="done" :class="{ show: done }" v-if="corte">
        <div class="check"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></div>
        <h2>Corte cerrado</h2>
        <p>{{ corte.repartidorNombre }} · Carga #{{ corte.cargaId }} · {{ fechaCorte }}</p>
        <div class="slip">
          <div class="h"><div class="b">CORTE DE CAJA</div><small>Repartidor: {{ corte.repartidorNombre }}</small><small>Carga #{{ corte.cargaId }}</small></div>
          <div class="r"><span>Efectivo</span><span>{{ money2(corte.totalEfectivo) }}</span></div>
          <div class="r"><span>Transferencia</span><span>{{ money2(corte.totalTransferencia) }}</span></div>
          <div class="r"><span>Tarjeta</span><span>{{ money2(corte.totalTarjeta) }}</span></div>
          <div class="r"><span>Crédito (x cobrar)</span><span>{{ money2(corte.totalCredito) }}</span></div>
          <div class="r b"><span>VENTAS</span><span>{{ money2(corte.totalVentas) }}</span></div>
          <div class="r" style="margin-top:9px"><span>Efectivo entregado</span><span>{{ money2(corte.efectivoEntregado) }}</span></div>
          <div class="r"><span>Diferencia</span><span :class="{ ok: corte.diferencia===0 }">{{ signo(corte.diferencia) }}{{ money2(Math.abs(corte.diferencia)) }}</span></div>
          <div style="height:12px"></div>
        </div>
        <div class="acts">
          <button class="da ghost" :disabled="imprimiendo" @click="imprimirTicket()"><svg viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5h20v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg> {{ imprimiendo ? 'Imprimiendo...' : 'Imprimir' }}</button>
          <button class="da solid" @click="salir()">Listo <svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></button>
        </div>
        <p v-if="printMsg" class="print-msg">{{ printMsg }}</p>
      </div>
    </ion-content>
  </ion-page>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { IonPage, IonContent, onIonViewWillEnter } from '@ionic/vue'
import http from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { imprimirCorte } from '@/services/printer'


const router = useRouter()
const auth = useAuthStore()
const resumen = ref(null)
const cargando = ref(true)
const error = ref('')
const cashStr = ref('')
const observacion = ref('')
const enviando = ref(false)
const done = ref(false)
const corte = ref(null)
const imprimiendo = ref(false)
const printMsg = ref('')

const money = (n) => '$' + Math.abs(Number(n || 0)).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const money2 = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const signo = (n) => n < 0 ? '−' : n > 0 ? '+' : ''
const fechaTag = computed(() => resumen.value
  ? new Date(resumen.value.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
  : '')
const fechaCorte = computed(() => corte.value
  ? new Date(corte.value.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : '')
function conteo(metodo) {
  const m = resumen.value?.metodos?.find((x) => x.metodo === metodo)
  return m ? m.conteo : 0
}
const given = computed(() => {
  const n = parseFloat((cashStr.value || '').replace(/,/g, ''))
  return isNaN(n) ? 0 : n
})
const diff = computed(() => given.value - (resumen.value?.efectivoEsperado || 0))
const estadoDiff = computed(() => diff.value === 0 ? 'ok' : diff.value < 0 ? 'short' : 'over')
const CHECK = '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>'
const DOWN = '<svg viewBox="0 0 24 24"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>'
const UP = '<svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>'
const iconoDiff = computed(() => diff.value === 0 ? CHECK : diff.value < 0 ? DOWN : UP)
const tituloDiff = computed(() => diff.value === 0 ? 'Cuadra perfecto' : diff.value < 0 ? 'Faltante' : 'Sobrante')
const subDiff = computed(() => diff.value === 0 ? 'El efectivo coincide con lo esperado' : diff.value < 0 ? 'Entregas menos de lo esperado' : 'Entregas más de lo esperado')
const valorDiff = computed(() => (diff.value === 0 ? '$0' : (diff.value < 0 ? '−' : '+') + money(diff.value)))
function onCash() {
  let v = (cashStr.value || '').replace(/[^\d.]/g, '')
  const parts = v.split('.')
  v = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('').slice(0, 2) : parts[0]
  if (v === '') { cashStr.value = ''; return }
  const [ent, dec] = v.split('.')
  const entFmt = ent ? Number(ent).toLocaleString('es-MX') : '0'
  cashStr.value = dec !== undefined ? entFmt + '.' + dec : entFmt
}
function salir() { router.replace('/app/entregas') }
async function cargar() {
  cargando.value = true; error.value = ''
  try {
    // El corte es POR CARGA: el backend devuelve la última carga cerrada sin corte.
    const { data } = await http.get('/cortes/resumen', { params: { repartidorId: auth.usuarioId } })
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
    const { data } = await http.post('/cortes/cerrar', {
      repartidorId: auth.usuarioId,
      cargaId: resumen.value?.cargaId ?? null,
      efectivoEntregado: given.value,
      observacion: observacion.value || null
    })
    corte.value = data
    done.value = true
    imprimirAuto()
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudo cerrar el corte.'
  } finally { enviando.value = false }
}


// Datos para la impresora: del corte cerrado + lo que solo vive en el resumen.
function datosParaImprimir() {
  const c = corte.value || {}
  const r = resumen.value || {}
  return {
    repartidor: c.repartidorNombre || auth.usuario?.nombre,
    cargaId: c.cargaId ?? r.cargaId,
    fecha: c.fecha || Date.now(),
    totalEfectivo: c.totalEfectivo,
    totalTransferencia: c.totalTransferencia,
    totalTarjeta: c.totalTarjeta,
    totalCredito: c.totalCredito,
    totalVentas: c.totalVentas,
    efectivoEsperado: c.efectivoEsperado ?? r.efectivoEsperado,
    efectivoEntregado: c.efectivoEntregado,
    diferencia: c.diferencia,
    valorDevuelto: c.valorDevuelto ?? r.valorDevuelto,
    valorMerma: c.valorMerma ?? r.valorMerma
  }
}

// Reimprimir (botón).
async function imprimirTicket() {
  imprimiendo.value = true; printMsg.value = ''
  try {
    await imprimirCorte(datosParaImprimir())
    printMsg.value = 'Corte impreso.'
  } catch (e) {
    printMsg.value = e?.message || 'No se pudo imprimir.'
  } finally { imprimiendo.value = false }
}

// Automática al cerrar. NUNCA tumba el corte: si falla, solo avisa.
async function imprimirAuto() {
  try {
    await imprimirCorte(datosParaImprimir())
    printMsg.value = 'Corte impreso.'
  } catch (e) {
    printMsg.value = 'El corte se guardó, pero no se pudo imprimir. Usa "Imprimir".'
  }
}


onMounted(cargar)
onIonViewWillEnter(() => { if (!cargando.value && !done.value) cargar() })
</script>
<style scoped>
.ct { --background: var(--paper); --padding-top: 0; --padding-bottom: 0; }
.loader { padding: 60px 24px; text-align: center; color: var(--muted); font-weight: 600; }
.err { color: var(--clay); font-size: 13px; font-weight: 600; margin: 12px 4px; text-align: center; }
.cerrado { color: var(--pine); font-size: 13.5px; font-weight: 700; text-align: center; margin: 16px 4px; }
.vacio { text-align: center; padding: 70px 26px; }
.v-ic { width: 64px; height: 64px; border-radius: 18px; margin: 0 auto 16px; display: grid; place-items: center; background: var(--pine-tint); }
.v-ic svg { width: 30px; height: 30px; stroke: var(--pine); fill: none; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.v-t { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 19px; }
.v-s { color: var(--muted); font-size: 13.5px; margin: 8px 0 22px; line-height: 1.5; }
.v-btn { background: var(--pine); color: #fff; border: none; border-radius: 13px; padding: 13px 24px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; }
.bar { display: flex; align-items: center; gap: 12px; padding: 14px 18px 12px; }
.iconbtn { width: 40px; height: 40px; border-radius: 13px; border: 1px solid var(--line); background: var(--surface); display: grid; place-items: center; cursor: pointer; flex: 0 0 auto; }
.iconbtn svg { width: 20px; height: 20px; stroke: var(--ink); fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.bar .ttl { flex: 1; }
.bar .ttl .s { font-size: 11.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--pine); }
.bar .ttl .n { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 19px; letter-spacing: -.01em; margin-top: 1px; }
.body { padding: 2px 18px calc(150px + env(safe-area-inset-bottom)); }
.eyebrow { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 11.5px; letter-spacing: .13em; text-transform: uppercase; color: var(--muted); margin: 20px 4px 11px; }
.hero { background: linear-gradient(155deg,var(--pine),var(--pine-deep)); border-radius: 24px; padding: 20px; color: #fff; position: relative; overflow: hidden; box-shadow: 0 20px 40px -22px rgba(10,63,51,.9); }
.hero::before { content: ""; position: absolute; inset: 0; background: radial-gradient(140px 140px at 90% 8%,rgba(232,151,46,.28),transparent 70%); }
.hero .top { display: flex; justify-content: space-between; align-items: center; position: relative; }
.hero .top .t { font-size: 12.5px; font-weight: 600; color: #BFE0D5; }
.hero .top .tag { font-size: 11px; font-weight: 700; color: #9FC9BC; background: rgba(255,255,255,.10); padding: 5px 10px; border-radius: 999px; }
.hero .val { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 42px; letter-spacing: -.02em; margin: 10px 0 2px; position: relative; font-variant-numeric: tabular-nums; }
.hero .val .mxn { font-size: 14px; color: #9FC9BC; font-weight: 600; margin-left: 6px; }
.hero .sub { display: flex; gap: 18px; margin-top: 12px; position: relative; }
.hero .sub div { font-size: 12px; color: #A9D2C6; font-weight: 600; display: flex; align-items: center; gap: 7px; }
.hero .sub b { font-family: "Bricolage Grotesque"; color: #fff; font-size: 15px; }
.mrow { display: flex; align-items: center; gap: 13px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 13px 14px; margin-bottom: 9px; box-shadow: var(--shadow); }
.mic { width: 40px; height: 40px; border-radius: 11px; display: grid; place-items: center; flex: 0 0 auto; }
.mic svg { width: 19px; height: 19px; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.mrow.cash .mic { background: var(--pine-tint); } .mrow.cash .mic svg { stroke: var(--pine); }
.mrow.trans .mic { background: var(--sky-soft); } .mrow.trans .mic svg { stroke: var(--sky); }
.mrow.card .mic { background: var(--amber-soft); } .mrow.card .mic svg { stroke: #B9781F; }
.mrow.cred .mic { background: var(--clay-soft); } .mrow.cred .mic svg { stroke: var(--clay); }
.mrow .ml { flex: 1; }
.mrow .ml .k { font-weight: 700; font-size: 14.5px; }
.mrow .ml .c { font-size: 12px; color: var(--muted); font-weight: 600; margin-top: 1px; }
.mrow .mv { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; font-variant-numeric: tabular-nums; text-align: right; }
.mrow .mv small { display: block; font-size: 10px; color: var(--muted); font-weight: 600; letter-spacing: .04em; }
.cred-note { font-size: 11.5px; color: var(--clay); font-weight: 600; margin: 2px 4px 0; display: flex; align-items: center; gap: 6px; }
.cred-note svg { width: 13px; height: 13px; stroke: var(--clay); fill: none; stroke-width: 2.2; }
.recon { background: var(--surface); border: 1px solid var(--line); border-radius: 20px; padding: 6px 16px 16px; box-shadow: var(--shadow); }
.rrow { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid var(--line); }
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
.diff .dic { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; flex: 0 0 auto; }
.diff .dic :deep(svg) { width: 22px; height: 22px; fill: none; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.diff .dt { flex: 1; }
.diff .dt .a { font-weight: 700; font-size: 14.5px; }
.diff .dt .b { font-size: 12.5px; font-weight: 500; margin-top: 1px; }
.diff .dv { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 22px; font-variant-numeric: tabular-nums; }
.diff.ok { background: var(--pine-tint); } .diff.ok .dic { background: var(--pine); } .diff.ok .dic :deep(svg) { stroke: #fff; } .diff.ok .a, .diff.ok .dv { color: var(--pine-deep); } .diff.ok .b { color: var(--pine); }
.diff.short { background: var(--clay-soft); } .diff.short .dic { background: var(--clay); } .diff.short .dic :deep(svg) { stroke: #fff; } .diff.short .a, .diff.short .dv { color: var(--clay); } .diff.short .b { color: #9A4730; }
.diff.over { background: var(--amber-soft); } .diff.over .dic { background: var(--amber); } .diff.over .dic :deep(svg) { stroke: #fff; } .diff.over .a, .diff.over .dv { color: #9A6512; } .diff.over .b { color: #B9781F; }
.note-field { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px; margin-top: 11px; box-shadow: var(--shadow); }
.note-field .fl { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 9px; }
.note-field input { width: 100%; border: none; background: transparent; outline: none; font-family: "Hanken Grotesk"; font-size: 14px; font-weight: 500; color: var(--ink); }
.note-field input::placeholder { color: #AAB3AC; }
.merc { display: flex; gap: 10px; }
.mcard { flex: 1; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px; box-shadow: var(--shadow); }
.mcard .k { font-size: 11.5px; font-weight: 700; color: var(--muted); display: flex; align-items: center; gap: 6px; }
.mcard .k svg { width: 14px; height: 14px; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.mcard.dev .k svg { stroke: var(--pine); } .mcard.mer .k svg { stroke: var(--clay); }
.mcard .v { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 20px; margin-top: 7px; font-variant-numeric: tabular-nums; }
.mcard .u { font-size: 11px; color: var(--muted); font-weight: 600; margin-top: 1px; }
.foot { position: fixed; left: 0; right: 0; bottom: 0; padding: 14px 18px calc(14px + env(safe-area-inset-bottom)); background: linear-gradient(0deg,var(--paper) 72%,transparent); z-index: 20; }
.cta { display: flex; align-items: center; justify-content: center; gap: 9px; width: 100%; background: var(--ink); color: #fff; border: none; border-radius: 16px; padding: 16px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15.5px; cursor: pointer; box-shadow: 0 12px 22px -12px rgba(21,42,36,.7); }
.cta:disabled { opacity: .5; }
.cta svg { width: 18px; height: 18px; stroke: #fff; fill: none; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.done { position: fixed; inset: 0; background: linear-gradient(160deg,var(--pine),var(--pine-deep)); display: none; flex-direction: column; align-items: center; padding: 54px 26px 26px; z-index: 50; overflow: auto; }
.done.show { display: flex; animation: fade .4s ease; }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
.check { width: 74px; height: 74px; border-radius: 50%; background: rgba(255,255,255,.14); display: grid; place-items: center; margin-bottom: 16px; position: relative; }
.check::before { content: ""; position: absolute; inset: -8px; border-radius: 50%; border: 2px solid rgba(255,255,255,.2); animation: ring 1.6s ease-out infinite; }
@keyframes ring { 0% { transform: scale(.85); opacity: .8; } 100% { transform: scale(1.35); opacity: 0; } }
.check svg { width: 38px; height: 38px; stroke: #fff; fill: none; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 40; stroke-dashoffset: 40; animation: draw .5s ease .2s forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }
.done h2 { color: #fff; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 23px; }
.done p { color: #A9D2C6; font-size: 13.5px; font-weight: 500; margin-top: 5px; text-align: center; }
.slip { background: #fff; width: 250px; border-radius: 5px; margin-top: 22px; padding: 18px 18px 10px; color: #1c1c1c; box-shadow: 0 20px 40px -16px rgba(0,0,0,.5); }
.slip .h { text-align: center; border-bottom: 1.5px dashed #c9c9c9; padding-bottom: 10px; }
.slip .h .b { font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 15px; letter-spacing: .03em; }
.slip .h small { font-size: 10.5px; color: #777; display: block; margin-top: 2px; }
.slip .r { display: flex; justify-content: space-between; font-size: 11.5px; margin: 7px 0; font-variant-numeric: tabular-nums; }
.slip .r.b { font-family: "Bricolage Grotesque"; font-weight: 800; border-top: 1.5px dashed #c9c9c9; margin-top: 9px; padding-top: 9px; font-size: 13px; }
.slip .ok { color: #0E5C4A; font-weight: 700; }
.acts { display: flex; gap: 10px; margin-top: 24px; width: 100%; }
.da { flex: 1; border: none; border-radius: 14px; padding: 14px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
.da.ghost { background: rgba(255,255,255,.12); color: #fff; } .da.solid { background: var(--amber); color: #3a2607; }
.da svg { width: 17px; height: 17px; stroke: currentColor; fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.print-msg { color: #BFE0D5; font-size: 12.5px; margin-top: 14px; text-align: center; max-width: 320px; }
</style>
