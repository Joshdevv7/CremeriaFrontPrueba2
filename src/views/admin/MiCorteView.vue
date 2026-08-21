<template>
  <div class="corte-wrap">
    <p v-if="cargando" class="muted">Cargando…</p>

    <div v-else-if="!resumen?.hayCargaPorCortar && !cerrado" class="vacio">
      <div class="v-ic"><ion-icon :icon="checkmarkDoneOutline" /></div>
      <div class="v-t">No hay corte pendiente</div>
      <div class="v-s">Cuando tengas ventas de mostrador sin cortar, aquí harás tu corte de caja.</div>
    </div>

    <template v-else-if="!cerrado">
      <div class="grid2">
        <div class="col">
          <div class="hero">
            <div class="top"><span class="t">Ventas por cortar</span><span class="tag">{{ resumen.numeroPedidos }} venta(s)</span></div>
            <div class="val">{{ money(resumen.totalVentas) }}<span class="mxn">MXN</span></div>
          </div>

          <div class="eyebrow">Cómo te pagaron</div>
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
          <p v-if="resumen.totalCredito > 0" class="cred-note">El crédito no se cobra hoy · pasa a cuentas por cobrar</p>
        </div>

        <div class="col">
          <div class="eyebrow">Cuadre de efectivo</div>
          <div class="recon">
            <div class="rrow"><span class="l">Efectivo esperado</span><span class="v">{{ money(resumen.efectivoEsperado) }}</span></div>
            <div class="declare">
              <div class="fl">Efectivo que entregas</div>
              <div class="inwrap">
                <span class="pfx">$</span>
                <input v-model="cashStr" type="text" inputmode="numeric" @input="onCash">
                <span class="sfx">MXN</span>
              </div>
            </div>
            <div class="diff" :class="estadoDiff">
              <div class="dt"><div class="a">{{ tituloDiff }}</div><div class="b">{{ subDiff }}</div></div>
              <div class="dv">{{ valorDiff }}</div>
            </div>
            <div class="note-field" v-show="diff !== 0">
              <div class="fl">Observación de la diferencia</div>
              <input v-model="observacion" placeholder="Explica el faltante o sobrante…">
            </div>
          </div>
          <p v-if="error" class="err">{{ error }}</p>
          <button class="cta" :disabled="enviando" @click="cerrar()">{{ enviando ? 'Cerrando…' : 'Cerrar mi corte' }}</button>
        </div>
      </div>
    </template>

    <div v-else class="hecho">
      <div class="check"><ion-icon :icon="checkmarkDoneOutline" /></div>
      <h2>Corte cerrado</h2>
      <p>{{ corte.repartidorNombre }} · {{ fechaCorte }}</p>
      <div class="slip">
        <div class="h"><div class="b">CORTE DE CAJA</div><small>Mostrador</small></div>
        <div class="r"><span>Efectivo</span><span>{{ money2(corte.totalEfectivo) }}</span></div>
        <div class="r"><span>Transferencia</span><span>{{ money2(corte.totalTransferencia) }}</span></div>
        <div class="r"><span>Tarjeta</span><span>{{ money2(corte.totalTarjeta) }}</span></div>
        <div class="r"><span>Crédito (x cobrar)</span><span>{{ money2(corte.totalCredito) }}</span></div>
        <div class="r b"><span>VENTAS</span><span>{{ money2(corte.totalVentas) }}</span></div>
        <div class="r" style="margin-top:9px"><span>Efectivo entregado</span><span>{{ money2(corte.efectivoEntregado) }}</span></div>
        <div class="r"><span>Diferencia</span><span :class="{ ok: corte.diferencia === 0 }">{{ signo(corte.diferencia) }}{{ money2(Math.abs(corte.diferencia)) }}</span></div>
      </div>
      <button class="cta2" @click="nuevoCorte()">Listo</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { IonIcon } from '@ionic/vue'
import { cashOutline, swapHorizontalOutline, cardOutline, timeOutline, checkmarkDoneOutline } from 'ionicons/icons'
import http from '@/api/http'
import { useAuthStore } from '@/stores/auth'

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

const money = (n) => '$' + Math.abs(Number(n || 0)).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const money2 = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const signo = (n) => n < 0 ? '−' : n > 0 ? '+' : ''
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
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudo cerrar el corte.'
  } finally { enviando.value = false }
}

function nuevoCorte() {
  cerrado.value = false; corte.value = null
  observacion.value = ''; cashStr.value = ''
  cargar()
}

onMounted(() => { emit('ctx', { titulo: 'Mi corte', sub: 'Corte de caja de tus ventas de mostrador', back: null }); cargar() })
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; }
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
.cta2 { margin-top: 20px; background: var(--pine); color: #fff; border: none; border-radius: 14px; padding: 13px 26px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; }
@media (max-width: 860px) { .grid2 { grid-template-columns: 1fr; } }
</style>
