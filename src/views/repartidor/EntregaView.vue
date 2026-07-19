<template>
  <ion-page>
    <ion-content :fullscreen="true" class="ec">
      <div class="shell" v-if="!cargando && pedido">
        <!-- app bar -->
        <div class="bar">
          <div class="iconbtn" @click="back()">
            <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
          </div>
          <div class="ttl">
            <div class="s">Entrega</div>
            <div class="n">{{ pedido.clienteNombre }}</div>
          </div>
          <div class="iconbtn">
            <svg viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        </div>

        <!-- steps -->
        <div class="steps">
          <div class="stepi" :class="{ on: step===1, done: step>1 }"><div class="num">1</div><div class="tx">Productos</div><div class="ln"></div></div>
          <div class="stepi" :class="{ on: step===2, done: step>2 }"><div class="num">2</div><div class="tx">Cobro</div><div class="ln"></div></div>
          <div class="stepi" :class="{ on: step===3 }"><div class="num">3</div><div class="tx">Verificar</div></div>
        </div>

        <div class="body" ref="bodyRef">
          <!-- PASO 1: PRODUCTOS -->
          <div class="view" :class="{ show: step===1 }">
            <div class="eyebrow">Confirma lo que entregas</div>
            <div>
              <div v-for="(l, i) in lineas" :key="l.id" class="line" :class="{ short: l.entregado < l.cantidadPedida }">
                <div class="line-top">
                  <div class="emoji"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5v-9z"/><path d="M3 7.5l9 4.5 9-4.5"/><path d="M12 12v9"/></svg></div>
                  <div class="line-info">
                    <div class="nm">{{ l.productoNombre }}</div>
                    <div class="sub">Pedido: <b>{{ fmtQty(l.cantidadPedida) }}</b><span v-if="l.conCarga"> · Traes <b :class="{ falta: l.disponible < l.cantidadPedida }">{{ fmtQty(l.disponible) }}</b></span> · {{ money2(l.precioUnitario) }}</div>
                  </div>
                  <div class="stepper">
                    <button @click="dec(i)" :disabled="l.entregado<=0">−</button>
                    <span class="q">{{ fmtQty(l.entregado) }}</span>
                    <button @click="inc(i)" :disabled="l.entregado>=maxEnt(l)">+</button>
                  </div>
                </div>
                <div class="diff" v-show="l.entregado < l.cantidadPedida">
                  <span class="txt"><b>{{ fmtQty(l.cantidadPedida - l.entregado) }}</b> sin entregar</span>
                  <div class="seg2">
                    <button :class="{ on: l.fate==='dev' }" @click="l.fate='dev'">Devolución</button>
                    <button class="merma" :class="{ on: l.fate==='mer' }" @click="l.fate='mer'">Merma</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- PASO 2: COBRO -->
          <div class="view" :class="{ show: step===2 }">
            <div class="eyebrow">Método de pago</div>
            <div class="pay-grid">
              <div class="pm" :class="{ on: pay==='efectivo' }" @click="selPay('efectivo')">
                <span class="chk"></span>
                <div class="ic"><svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg></div>
                <span class="lbl">Efectivo</span>
              </div>
              <div class="pm" :class="{ on: pay==='transferencia' }" @click="selPay('transferencia')">
                <span class="chk"></span>
                <div class="ic"><svg viewBox="0 0 24 24"><path d="M4 9h16M4 15h16M8 5l-4 4 4 4M16 11l4 4-4 4"/></svg></div>
                <span class="lbl">Transferencia</span>
              </div>
              <div class="pm" :class="{ on: pay==='tarjeta' }" @click="selPay('tarjeta')">
                <span class="chk"></span>
                <div class="ic"><svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg></div>
                <span class="lbl">Tarjeta</span>
              </div>
              <div class="pm" :class="{ on: pay==='credito' }" @click="selPay('credito')">
                <span class="chk"></span>
                <div class="ic"><svg viewBox="0 0 24 24"><path d="M12 8v4l3 2"/><circle cx="12" cy="12" r="9"/></svg></div>
                <span class="lbl">Crédito</span>
              </div>
            </div>

            <!-- crédito -->
            <div v-show="pay==='credito'">
              <div class="field">
                <div class="fl">Fecha límite de pago <span class="due">7 días</span></div>
                <input class="inp" type="text" :value="fechaLimiteTexto" readonly>
              </div>
              <div class="field sigwrap">
                <div class="fl">Firma del cliente</div>
                <canvas class="sigpad" ref="sigRef"></canvas>
                <div class="sighint"><span>Firma con el dedo sobre la línea</span><a @click="clearSig()">Borrar</a></div>
              </div>
            </div>
            <!-- tarjeta -->
            <div v-show="pay==='tarjeta'">
              <div class="field"><div class="fl">Referencia de la terminal</div>
                <input class="inp" type="text" v-model="referencia" placeholder="Ej. 004821 · aprobada"></div>
            </div>
            <!-- efectivo -->
            <div v-show="pay==='efectivo'">
              <div class="field"><div class="fl">Efectivo recibido</div>
                <input class="inp" type="text" v-model="efectivoRecibido" placeholder="$ 0.00" inputmode="numeric"></div>
            </div>
            <!-- transferencia -->
            <div v-show="pay==='transferencia'">
              <div class="field"><div class="fl">Comprobante / referencia</div>
                <input class="inp" type="text" v-model="referencia" placeholder="Folio de la transferencia" :disabled="pagoPendiente"></div>
            </div>

            <!-- Pago pendiente: se entrega el producto pero el pago llega después -->
            <div v-show="pay!=='credito'" class="pend-toggle" :class="{ on: pagoPendiente }" @click="pagoPendiente = !pagoPendiente">
              <div class="pt-check"><svg v-if="pagoPendiente" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></div>
              <div class="pt-tx">
                <div class="pt-t">Pago pendiente</div>
                <div class="pt-s">Se entrega el producto ahora; el pago y su folio se registran después.</div>
              </div>
            </div>
          </div>

          <!-- PASO 3: VERIFICACIÓN -->
          <div class="view" :class="{ show: step===3 }">
            <div class="eyebrow">Evidencia de entrega (obligatoria)</div>
            <div class="photo">
              <div class="cam" :class="{ shot: fotoTomada }" @click="abrirCamara()">
                <div class="ph">
                  <svg viewBox="0 0 24 24"><path d="M3 7h3l2-2h8l2 2h3v12H3z"/><circle cx="12" cy="13" r="4"/></svg>
                  <span>Tomar foto del producto</span>
                  <small>con el cliente final</small>
                </div>
                <div class="captured" :style="fotoPreview ? { backgroundImage:`url(${fotoPreview})`, backgroundSize:'cover', backgroundPosition:'center' } : {}"></div>
                <div class="badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg> Foto capturada</div>
                <div class="retake">↻ Repetir</div>
              </div>
              <input ref="fileRef" type="file" accept="image/*" capture="environment" hidden @change="onFoto">
            </div>
            <div class="vsum">
              <div class="vrow"><span class="l"><svg viewBox="0 0 24 24"><path d="M3 7h18M3 12h18M3 17h12"/></svg> Productos entregados</span><span class="r">{{ totalEntregado }} de {{ totalPedido }}</span></div>
              <div class="vrow"><span class="l"><svg viewBox="0 0 24 24"><path d="M12 8v4l3 2"/><circle cx="12" cy="12" r="9"/></svg> Método de pago</span><span class="r" :class="{ cred: pay==='credito' }">{{ payLabel }}<template v-if="pagoPendiente"> · pendiente</template></span></div>
              <div class="vrow"><span class="l"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg> Firma del cliente</span><span class="r">{{ pay==='credito' ? (firmado ? 'Registrada' : 'Pendiente') : 'No requerida' }}</span></div>
              <div class="vrow"><span class="l"><svg viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg> Ubicacion de entrega</span><span class="r">{{ gpsEstado==='ok' ? 'Capturada' : gpsEstado==='cargando' ? 'Obteniendo...' : 'No disponible' }}</span></div>
              <div class="vrow"><span class="l"><svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Total</span><span class="r">{{ money(total) }}</span></div>
            </div>

            <!-- Actualizar ubicación del cliente (opción C: se captura en sitio) -->
            <div class="ubicli" :class="{ ok: ubicGuardada }">
              <div class="ubicli-info">
                <div class="ubicli-t">Ubicación del cliente</div>
                <div class="ubicli-s">
                  <template v-if="ubicGuardada">Guardada con tu posición actual</template>
                  <template v-else-if="gpsEstado==='ok'">Estás aquí. Puedes guardar esta ubicación para el cliente.</template>
                  <template v-else>Se usará tu ubicación de entrega (obteniéndola…)</template>
                </div>
              </div>
              <button v-if="!ubicGuardada" class="ubicli-btn" :disabled="gpsEstado!=='ok' || guardandoUbic" @click="guardarUbicacionCliente()">
                <svg viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                {{ guardandoUbic ? 'Guardando…' : 'Guardar aquí' }}
              </button>
              <div v-else class="ubicli-done"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></div>
            </div>
            <p v-if="ubicMsg" class="ubicli-msg" :class="ubicTipo">{{ ubicMsg }}</p>

            <p v-if="error" class="err">{{ error }}</p>
          </div>
        </div>

        <!-- footer -->
        <div class="foot">
          <div class="totbar">
            <div class="k">Total de la entrega<b>{{ totalEntregado }} de {{ totalPedido }} productos</b></div>
            <div class="v">{{ money(total) }}</div>
          </div>
          <button class="cta" :class="{ green: step===3 }" :disabled="enviando" @click="next()">
            <span>{{ botonTexto }}</span>
            <svg v-if="step<3" class="arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
        </div>
      </div>

      <div v-else-if="cargando" class="loader">Cargando entrega…</div>
      <div v-else class="loader">{{ error || 'No se encontró el pedido.' }}</div>

      <!-- ÉXITO -->
      <div class="done-view" :class="{ show: done }">
        <div class="check"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></div>
        <h2>Entrega confirmada</h2>
        <p>{{ pedido?.clienteNombre }} · {{ resultadoEstado }}</p>
        <div class="ticket" v-if="ticket">
          <div class="th"><div class="b">DISTRIBUIDORA</div><small>Ticket #{{ ticket.id }} · {{ ticket.fecha }}</small></div>
          <div class="tr" v-for="t in ticket.lineas" :key="t.nombre"><span>{{ t.nombre }} ({{ t.cant }})</span><span>{{ money2(t.sub) }}</span></div>
          <div class="tr muted"><span>Cliente</span><span>{{ pedido?.clienteNombre }}</span></div>
          <div class="tt"><span>TOTAL</span><span>{{ money2(ticket.total) }}</span></div>
          <div class="credit" v-if="ticket.credito">CRÉDITO · vence {{ ticket.vence }} · firmado</div>
          <div style="height:14px"></div>
        </div>
        <div class="pend" v-if="hayPendiente">
          <div class="pend-txt"><b>Quedó producto pendiente.</b> Puedes reprogramarlo como un nuevo pedido con lo que faltó.</div>
          <button v-if="!reprogramado" class="pend-btn" :disabled="reprogramando" @click="reprogramar()">{{ reprogramando ? 'Reprogramando…' : 'Reprogramar lo pendiente' }}</button>
          <div v-else class="pend-ok"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg> Pendiente reprogramado</div>
        </div>
        <div class="done-actions">
          <button class="da ghost" :disabled="imprimiendo" @click="imprimirTicket()"><svg viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5h20v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg> {{ imprimiendo ? 'Imprimiendo...' : 'Reimprimir' }}</button>
          <button class="da solid" @click="salir()">Siguiente parada <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
        </div>
        <p v-if="printMsg" class="print-msg">{{ printMsg }}</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRoute, useRouter } from 'vue-router'
import { IonPage, IonContent } from '@ionic/vue'
import http from '@/api/http'
import { tomarFotoNativa, obtenerUbicacion, esNativo } from '@/composables/useNativo'
import { imprimirTicketEntrega } from '@/services/printer'

const route = useRoute()
const router = useRouter()

const auth = useAuthStore()
const pedido = ref(null)
const lineas = reactive([])
const cargando = ref(true)
const enviando = ref(false)
const error = ref('')

const step = ref(1)
const pay = ref('credito')
const referencia = ref('')
const pagoPendiente = ref(false)
const efectivoRecibido = ref('')

const sigRef = ref(null)
const bodyRef = ref(null)
const fileRef = ref(null)
const firmado = ref(false)
const fotoTomada = ref(false)
const fotoPreview = ref('')
let fotoFile = null
let cx = null
const latEntrega = ref(null)
const lngEntrega = ref(null)
const gpsEstado = ref('idle')

// ubicación del cliente (opción C)
const guardandoUbic = ref(false)
const ubicGuardada = ref(false)
const ubicMsg = ref('')
const ubicTipo = ref('')

const done = ref(false)
const ticket = ref(null)
const resultadoEstado = ref('')
const imprimiendo = ref(false)
const printMsg = ref('')

const METODO = { efectivo: 0, transferencia: 1, tarjeta: 2, credito: 3 }
const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const money2 = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtQty = (n) => Number(n).toLocaleString('es-MX')

const fechaLimite = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d })()
const fechaLimiteTexto = computed(() =>
  fechaLimite.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))

const total = computed(() => lineas.reduce((s, l) => s + l.entregado * l.precioUnitario, 0))
const totalEntregado = computed(() => lineas.reduce((s, l) => s + l.entregado, 0))
const totalPedido = computed(() => lineas.reduce((s, l) => s + l.cantidadPedida, 0))
const payLabel = computed(() => ({ credito: 'Crédito · 7 días', tarjeta: 'Tarjeta', efectivo: 'Efectivo', transferencia: 'Transferencia' }[pay.value]))
const botonTexto = computed(() => {
  if (enviando.value) return 'Confirmando…'
  return step.value === 1 ? 'Continuar al cobro' : step.value === 2 ? 'Continuar a verificación' : 'Confirmar entrega e imprimir'
})

function maxEnt(l) { return l.conCarga ? Math.min(l.cantidadPedida, l.disponible) : l.cantidadPedida }
function inc(i) { if (lineas[i].entregado < maxEnt(lineas[i])) lineas[i].entregado++ }
function dec(i) { if (lineas[i].entregado > 0) lineas[i].entregado-- }
function selPay(p) { pay.value = p; if (p === 'credito') pagoPendiente.value = false }

function back() { if (step.value > 1) step.value-- ; else salir() }
function salir() { router.replace('/app/entregas') }

async function next() {
  error.value = ''
  if (step.value < 3) {
    step.value++
    if (step.value === 2) await nextTick(), fitCanvas()
    if (step.value === 3) capturarGps()
    bodyRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  await confirmar()
}

/* ---- firma ---- */
function fitCanvas() {
  const cv = sigRef.value
  if (!cv) return
  const r = cv.getBoundingClientRect()
  cv.width = r.width * 2; cv.height = r.height * 2
  cx = cv.getContext('2d')
  cx.scale(2, 2); cx.strokeStyle = '#152A24'; cx.lineWidth = 2.2; cx.lineCap = 'round'; cx.lineJoin = 'round'
}
let drawing = false
function pos(e) { const r = sigRef.value.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return { x: t.clientX - r.left, y: t.clientY - r.top } }
function startDraw(e) { if (!cx) fitCanvas(); drawing = true; firmado.value = true; const p = pos(e); cx.beginPath(); cx.moveTo(p.x, p.y); e.preventDefault() }
function moveDraw(e) { if (!drawing) return; const p = pos(e); cx.lineTo(p.x, p.y); cx.stroke(); e.preventDefault() }
function endDraw() { drawing = false }
function clearSig() { if (cx) cx.clearRect(0, 0, sigRef.value.width, sigRef.value.height); firmado.value = false }

watch(sigRef, (cv) => {
  if (!cv) return
  cv.addEventListener('mousedown', startDraw); cv.addEventListener('mousemove', moveDraw)
  window.addEventListener('mouseup', endDraw)
  cv.addEventListener('touchstart', startDraw, { passive: false })
  cv.addEventListener('touchmove', moveDraw, { passive: false })
  cv.addEventListener('touchend', endDraw)
})

/* ---- foto: cámara nativa en APK, input file en web ---- */
async function abrirCamara() {
  error.value = ''
  if (esNativo()) {
    try {
      const file = await tomarFotoNativa()
      if (!file) return // el usuario canceló
      fotoFile = file
      if (fotoPreview.value) URL.revokeObjectURL(fotoPreview.value)
      fotoPreview.value = URL.createObjectURL(file)
      fotoTomada.value = true
    } catch (e) {
      const msg = String(e?.message || '')
      if (!/cancel/i.test(msg)) error.value = 'No se pudo abrir la cámara. Revisa los permisos.'
    }
    return
  }
  fileRef.value?.click()
}
function onFoto(e) {
  const f = e.target.files?.[0]
  if (!f) return
  fotoFile = f
  if (fotoPreview.value) URL.revokeObjectURL(fotoPreview.value)
  fotoPreview.value = URL.createObjectURL(f)
  fotoTomada.value = true
}

/* ---- subida de archivos ---- */
async function subir(file, nombre) {
  const fd = new FormData()
  fd.append('archivo', file, nombre)
  const { data } = await http.post('/archivos/subir', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  return data.url
}
function canvasABlob() {
  return new Promise((res) => sigRef.value.toBlob((b) => res(b), 'image/png'))
}

/* ---- gps de entrega: nativo en APK, navigator en web (best-effort) ---- */
async function capturarGps() {
  gpsEstado.value = 'cargando'
  try {
    const { lat, lng } = await obtenerUbicacion()
    latEntrega.value = lat; lngEntrega.value = lng; gpsEstado.value = 'ok'
  } catch {
    gpsEstado.value = 'nd'
  }
}

/* ---- guardar ubicación del cliente con la posición actual (opción C) ---- */
async function guardarUbicacionCliente() {
  if (gpsEstado.value !== 'ok' || latEntrega.value == null) return
  guardandoUbic.value = true; ubicMsg.value = ''; ubicTipo.value = ''
  try {
    await http.put(`/clientes/${pedido.value.clienteId}/ubicacion`, {
      latitud: latEntrega.value, longitud: lngEntrega.value
    })
    ubicGuardada.value = true
    ubicMsg.value = 'Ubicación del cliente actualizada.'
    ubicTipo.value = ''
  } catch (e) {
    ubicMsg.value = e.response?.data?.mensaje || 'No se pudo guardar la ubicación del cliente.'
    ubicTipo.value = 'err'
  } finally { guardandoUbic.value = false }
}

/* ---- reprogramar lo pendiente ---- */
const hayPendiente = ref(false)
const reprogramando = ref(false)
const reprogramado = ref(false)
async function reprogramar() {
  reprogramando.value = true; error.value = ''
  try { await http.post(`/pedidos/${pedido.value.id}/reprogramar`); reprogramado.value = true }
  catch (e) { error.value = e.response?.data?.mensaje || 'No se pudo reprogramar.' }
  finally { reprogramando.value = false }
}

/* ---- confirmar ---- */
async function confirmar() {
  error.value = ''
  if (!fotoFile) {
    error.value = 'La foto de entrega es obligatoria para cerrar el pedido.'
    return
  }
  if (pay.value === 'credito' && !firmado.value) {
    error.value = 'Falta la firma del cliente para la venta a crédito.'
    return
  }
  enviando.value = true
  try {
    let firmaUrl = null, fotoUrl = null
    if (pay.value === 'credito' && firmado.value) {
      const blob = await canvasABlob()
      firmaUrl = await subir(blob, 'firma.png')
    }
    if (fotoFile) fotoUrl = await subir(fotoFile, fotoFile.name || 'entrega.jpg')

    const payload = {
      metodoPago: METODO[pay.value],
      pagoPendiente: pagoPendiente.value,
      referenciaPago: (!pagoPendiente.value && (pay.value === 'tarjeta' || pay.value === 'transferencia')) ? (referencia.value || null) : null,
      firmaUrl, fotoEntregaUrl: fotoUrl,
      fechaLimiteCredito: pay.value === 'credito' ? fechaLimite.toISOString() : null,
      latitudEntrega: latEntrega.value, longitudEntrega: lngEntrega.value,
      lineas: lineas.map((l) => ({
        pedidoLineaId: l.id,
        cantidadEntregada: l.entregado,
        cantidadMermada: l.fate === 'mer' ? (l.cantidadPedida - l.entregado) : 0,
        motivoMerma: l.fate === 'mer' ? 'Merma en entrega' : null
      }))
    }

    const { data } = await http.post(`/pedidos/${pedido.value.id}/confirmar`, payload)
    armarTicket(data)
    done.value = true
    imprimirAuto()
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudo confirmar la entrega.'
  } finally {
    enviando.value = false
  }
}

function armarTicket(d) {
  const estados = { CerradoCompleto: 'Entrega completa', CerradoParcial: 'Entrega parcial', CerradoNoEntregado: 'No entregado' }
  resultadoEstado.value = estados[d.estado] || 'Cerrada'
  hayPendiente.value = d.estado === 'CerradoParcial' || d.estado === 'CerradoNoEntregado'
  ticket.value = {
    id: d.id,
    fechaIso: d.fecha,
    metodoPago: d.metodoPago,
    fecha: new Date(d.fecha).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    lineas: d.lineas.filter((l) => l.cantidadEntregada > 0).map((l) => ({ nombre: l.productoNombre, cant: fmtQty(l.cantidadEntregada), sub: l.subtotal })),
    total: d.total,
    credito: d.metodoPago === 'Credito',
    vence: fechaLimite.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
  }
}


// Datos para la impresora: se toman de las líneas reales de la entrega.
function datosParaImprimir() {
  return {
    pedidoId: pedido.value?.id,
    fecha: ticket.value?.fechaIso || Date.now(),
    cliente: pedido.value?.clienteNombre,
    repartidor: auth.usuario?.nombre,
    folio: (pay.value === 'tarjeta' || pay.value === 'transferencia') ? (referencia.value || null) : null,
    metodo: payLabel.value,
    pagoPendiente: pagoPendiente.value,
    credito: pay.value === 'credito',
    vence: ticket.value?.vence,
    total: ticket.value?.total ?? total.value,
    items: lineas.filter((l) => l.entregado > 0).map((l) => ({
      nombre: l.productoNombre,
      cantidad: l.entregado,
      precio: l.precioUnitario
    }))
  }
}

// Reimprimir (botón).
async function imprimirTicket() {
  imprimiendo.value = true; printMsg.value = ''
  try {
    await imprimirTicketEntrega(datosParaImprimir())
    printMsg.value = 'Ticket impreso.'
  } catch (e) {
    printMsg.value = e?.message || 'No se pudo imprimir.'
  } finally { imprimiendo.value = false }
}

// Automática al confirmar. NUNCA tumba la entrega: si falla, solo avisa.
async function imprimirAuto() {
  try {
    await imprimirTicketEntrega(datosParaImprimir())
    printMsg.value = 'Ticket impreso.'
  } catch (e) {
    printMsg.value = 'La entrega se guardó, pero no se pudo imprimir. Usa "Reimprimir".'
  }
}

onMounted(async () => {
  try {
    const id = route.params.id
    const { data } = await http.get(`/pedidos/${id}`)
    pedido.value = data
    // Disponible real según la carga abierta del repartidor (lo que trae en la camioneta)
    let dispMap = null
    try {
      const cg = await http.get(`/cargas/repartidor/${auth.usuarioId}/abierta`)
      dispMap = {}
      cg.data.lineas.forEach((cl) => { dispMap[cl.productoId] = cl.restante })
    } catch { dispMap = null } // sin carga abierta: no se topa (respaldo almacén)
    data.lineas.forEach((l) => {
      const conCarga = dispMap !== null
      const disponible = conCarga ? (dispMap[l.productoId] ?? 0) : l.cantidadPedida
      const max = Math.min(l.cantidadPedida, disponible)
      lineas.push({
        id: l.id, productoId: l.productoId, productoNombre: l.productoNombre,
        cantidadPedida: l.cantidadPedida, precioUnitario: l.precioUnitario,
        disponible, conCarga, entregado: max, fate: 'dev'
      })
    })
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudo cargar el pedido.'
  } finally {
    cargando.value = false
  }
})
</script>

<style scoped>
.ec { --background: var(--paper); --padding-top: 0; --padding-bottom: 0; }
.shell { display: flex; flex-direction: column; height: 100%; }
.loader { padding: 60px 24px; text-align: center; color: var(--muted); font-weight: 600; }
.err { color: var(--clay); font-size: 13px; font-weight: 600; margin: 12px 4px 0; }

/* app bar */
.bar { display: flex; align-items: center; gap: 12px; padding: 14px 18px 12px; flex: 0 0 auto; }
.iconbtn { width: 40px; height: 40px; border-radius: 13px; border: 1px solid var(--line); background: var(--surface); display: grid; place-items: center; cursor: pointer; flex: 0 0 auto; transition: transform .12s; }
.iconbtn:active { transform: scale(.93); }
.iconbtn svg { width: 20px; height: 20px; stroke: var(--ink); fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.bar .ttl { flex: 1; min-width: 0; }
.bar .ttl .s { font-size: 11.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--pine); }
.bar .ttl .n { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; letter-spacing: -.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }

/* steps */
.steps { display: flex; align-items: center; gap: 6px; padding: 0 20px 12px; flex: 0 0 auto; }
.stepi { display: flex; align-items: center; gap: 7px; flex: 1; }
.stepi .num { width: 25px; height: 25px; border-radius: 50%; display: grid; place-items: center; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12px; background: var(--paper-2); color: var(--muted); border: 1.5px solid var(--line); flex: 0 0 auto; transition: .25s; }
.stepi .tx { font-size: 11.5px; font-weight: 600; color: var(--muted); transition: .25s; white-space: nowrap; }
.stepi .ln { height: 2px; flex: 1; background: var(--line); border-radius: 2px; transition: .25s; }
.stepi.on .num { background: var(--pine); color: #fff; border-color: var(--pine); }
.stepi.on .tx { color: var(--ink); }
.stepi.done .num { background: var(--pine-tint); color: var(--pine); border-color: var(--pine); }
.stepi.done .ln { background: var(--pine); }

.body { flex: 1 1 auto; overflow: auto; padding: 4px 18px 20px; position: relative; }
.body::-webkit-scrollbar { display: none; }
.view { display: none; animation: fade .35s ease; }
.view.show { display: block; }
@keyframes fade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

.eyebrow { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 11.5px; letter-spacing: .13em; text-transform: uppercase; color: var(--muted); margin: 8px 4px 10px; }

/* product line */
.line { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 14px; margin-bottom: 11px; box-shadow: var(--shadow); transition: border-color .2s; }
.line.short { border-color: var(--amber); }
.line-top { display: flex; align-items: center; gap: 12px; }
.emoji { width: 42px; height: 42px; border-radius: 12px; background: var(--paper-2); display: grid; place-items: center; flex: 0 0 auto; color: var(--ink-soft); }
.emoji svg { width: 22px; height: 22px; }
.line-info { flex: 1; min-width: 0; }
.line-info .nm { font-weight: 700; font-size: 15px; letter-spacing: -.01em; }
.line-info .sub { font-size: 12.5px; color: var(--muted); font-weight: 500; margin-top: 1px; }
.line-info .sub b { color: var(--ink-soft); font-variant-numeric: tabular-nums; }
.line-info .sub b.falta { color: var(--clay); }
.stepper { display: flex; align-items: center; gap: 0; background: var(--paper); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; flex: 0 0 auto; }
.stepper button { width: 34px; height: 36px; border: none; background: transparent; font-size: 20px; color: var(--pine); cursor: pointer; font-weight: 600; display: grid; place-items: center; transition: background .12s; }
.stepper button:active { background: var(--pine-tint); }
.stepper button:disabled { color: #C7CFC9; cursor: not-allowed; }
.stepper .q { min-width: 34px; text-align: center; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 16px; font-variant-numeric: tabular-nums; }
.diff { margin-top: 11px; padding-top: 11px; border-top: 1px dashed var(--line); display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.diff .txt { font-size: 12.5px; font-weight: 600; color: var(--clay); }
.diff .txt b { font-variant-numeric: tabular-nums; }
.seg2 { display: flex; background: var(--paper); border: 1px solid var(--line); border-radius: 10px; padding: 2px; gap: 2px; }
.seg2 button { border: none; background: transparent; font-size: 11.5px; font-weight: 700; color: var(--muted); padding: 5px 10px; border-radius: 8px; cursor: pointer; transition: .15s; }
.seg2 button.on { background: var(--surface); color: var(--ink); box-shadow: 0 1px 3px rgba(0,0,0,.1); }
.seg2 button.on.merma { color: var(--clay); }

/* payment */
.pay-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 6px; }
.pm { background: var(--surface); border: 1.5px solid var(--line); border-radius: 16px; padding: 15px 14px; cursor: pointer; transition: .18s; display: flex; flex-direction: column; gap: 9px; position: relative; }
.pm .ic { width: 34px; height: 34px; border-radius: 10px; background: var(--paper-2); display: grid; place-items: center; }
.pm .ic svg { width: 19px; height: 19px; stroke: var(--ink-soft); fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.pm .lbl { font-weight: 700; font-size: 14.5px; }
.pm.on { border-color: var(--pine); background: var(--pine-tint); }
.pm.on .ic { background: var(--pine); }
.pm.on .ic svg { stroke: #fff; }
.pm .chk { position: absolute; top: 12px; right: 12px; width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--line); transition: .18s; }
.pm.on .chk { border-color: var(--pine); background: var(--pine); }
.pm.on .chk::after { content: ""; position: absolute; left: 5px; top: 2px; width: 5px; height: 9px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg); }

.field { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 15px; margin-top: 14px; box-shadow: var(--shadow); }
.field .fl { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 9px; display: flex; align-items: center; justify-content: space-between; }
.field .fl .due { color: var(--amber); background: var(--amber-soft); padding: 3px 9px; border-radius: 7px; letter-spacing: .02em; }
.inp { width: 100%; border: 1px solid var(--line); background: var(--paper); border-radius: 11px; padding: 12px 13px; font-family: "Hanken Grotesk"; font-size: 15px; font-weight: 600; color: var(--ink); }
.inp::placeholder { color: #AAB3AC; font-weight: 500; }

/* signature */
.sigpad { width: 100%; height: 130px; background: var(--paper); border: 1.5px dashed var(--line); border-radius: 12px; touch-action: none; display: block; cursor: crosshair; }
.sighint { text-align: center; font-size: 12px; color: var(--muted); font-weight: 500; margin-top: 7px; display: flex; align-items: center; justify-content: center; gap: 14px; }
.sighint a { color: var(--clay); font-weight: 700; cursor: pointer; }

/* foto */
.photo { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 16px; box-shadow: var(--shadow); text-align: center; }
.cam { height: 190px; border-radius: 14px; border: 1.5px dashed var(--line); background: linear-gradient(135deg,#EEF3EE,#E7EEE8); display: grid; place-items: center; cursor: pointer; position: relative; overflow: hidden; transition: .2s; }
.cam:hover { border-color: var(--pine); }
.cam .ph { display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--muted); }
.cam .ph svg { width: 38px; height: 38px; stroke: var(--pine); fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.cam .ph span { font-weight: 700; font-size: 14px; color: var(--ink); }
.cam .ph small { font-size: 12px; color: var(--muted); }
.cam.shot { border-style: solid; border-color: var(--pine); }
.cam.shot .ph { display: none; }
.cam .captured { display: none; position: absolute; inset: 0; }
.cam.shot .captured { display: block; }
.cam .badge { display: none; position: absolute; left: 12px; bottom: 12px; background: rgba(21,42,36,.85); color: #fff; font-size: 11px; font-weight: 600; padding: 6px 11px; border-radius: 999px; align-items: center; gap: 6px; backdrop-filter: blur(4px); }
.cam.shot .badge { display: flex; }
.cam .retake { display: none; position: absolute; right: 12px; bottom: 12px; background: rgba(255,255,255,.92); color: var(--ink); font-size: 11px; font-weight: 700; padding: 6px 11px; border-radius: 999px; }
.cam.shot .retake { display: flex; }

.vsum { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 6px 16px; margin-top: 14px; box-shadow: var(--shadow); }
.vrow { display: flex; align-items: center; justify-content: space-between; padding: 13px 0; border-bottom: 1px solid var(--line); }
.vrow:last-child { border-bottom: none; }
.vrow .l { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; color: var(--ink-soft); }
.vrow .l svg { width: 18px; height: 18px; stroke: var(--pine); fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.vrow .r { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; font-variant-numeric: tabular-nums; }
.vrow .r.cred { color: var(--sky); }

/* ubicación del cliente (opción C) */
.ubicli { display: flex; align-items: center; gap: 12px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px; margin-top: 12px; box-shadow: var(--shadow); transition: border-color .2s, background .2s; }
.ubicli.ok { border-color: var(--pine); background: var(--pine-tint); }
.ubicli-info { flex: 1; min-width: 0; }
.ubicli-t { font-weight: 700; font-size: 14px; }
.ubicli-s { font-size: 12px; color: var(--muted); font-weight: 500; margin-top: 2px; line-height: 1.35; }
.ubicli-btn { display: flex; align-items: center; gap: 7px; background: var(--pine-tint); color: var(--pine); border: 1px solid #C8E0D6; border-radius: 11px; padding: 10px 13px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12.5px; cursor: pointer; flex: 0 0 auto; }
.ubicli-btn:disabled { opacity: .5; cursor: default; }
.ubicli-btn svg { width: 15px; height: 15px; stroke: var(--pine); fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.ubicli-done { width: 34px; height: 34px; border-radius: 10px; background: var(--pine); display: grid; place-items: center; flex: 0 0 auto; }
.ubicli-done svg { width: 18px; height: 18px; stroke: #fff; fill: none; stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }
.ubicli-msg { font-size: 12px; font-weight: 600; margin: 8px 4px 0; }
.ubicli-msg.err { color: var(--clay); }
.ubicli-msg:not(.err) { color: var(--pine); }

/* footer */
.foot { flex: 0 0 auto; padding: 14px 18px calc(14px + env(safe-area-inset-bottom)); background: linear-gradient(0deg,var(--paper) 72%,transparent); }
.totbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 11px; padding: 0 4px; }
.totbar .k { font-size: 12.5px; color: var(--muted); font-weight: 600; }
.totbar .k b { display: block; color: var(--ink); font-size: 11px; font-weight: 600; margin-top: 1px; }
.totbar .v { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 27px; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
.cta { display: flex; align-items: center; justify-content: center; gap: 9px; width: 100%; background: var(--ink); color: #fff; border: none; border-radius: 16px; padding: 16px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15.5px; cursor: pointer; box-shadow: 0 12px 22px -12px rgba(21,42,36,.7); transition: transform .15s, box-shadow .15s, opacity .2s; }
.cta:hover { transform: translateY(-1px); }
.cta:active { transform: translateY(1px) scale(.99); }
.cta:disabled { opacity: .4; cursor: not-allowed; transform: none; }
.cta.green { background: var(--pine); box-shadow: 0 12px 22px -12px rgba(14,92,74,.8); }
.cta .arrow { transition: transform .2s; }
.cta:hover .arrow { transform: translateX(3px); }

/* éxito + ticket */
.done-view { position: absolute; inset: 0; background: linear-gradient(160deg,var(--pine),var(--pine-deep)); display: none; flex-direction: column; align-items: center; justify-content: flex-start; padding: 60px 26px 26px; z-index: 50; overflow: auto; }
.done-view.show { display: flex; animation: fade .4s ease; }
.check { width: 78px; height: 78px; border-radius: 50%; background: rgba(255,255,255,.14); display: grid; place-items: center; margin-bottom: 18px; position: relative; }
.check::before { content: ""; position: absolute; inset: -8px; border-radius: 50%; border: 2px solid rgba(255,255,255,.2); animation: ring 1.6s ease-out infinite; }
@keyframes ring { 0% { transform: scale(.85); opacity: .8; } 100% { transform: scale(1.35); opacity: 0; } }
.check svg { width: 40px; height: 40px; stroke: #fff; fill: none; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 40; stroke-dashoffset: 40; animation: draw .5s ease .2s forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }
.done-view h2 { color: #fff; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 24px; letter-spacing: -.01em; }
.done-view p { color: #A9D2C6; font-size: 14px; font-weight: 500; margin-top: 6px; text-align: center; }
.ticket { background: #fff; width: 240px; border-radius: 4px; margin-top: 24px; padding: 18px 18px 8px; font-family: "Hanken Grotesk"; color: #1c1c1c; position: relative; box-shadow: 0 20px 40px -16px rgba(0,0,0,.5); }
.ticket .th { text-align: center; border-bottom: 1.5px dashed #c9c9c9; padding-bottom: 11px; }
.ticket .th .b { font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 17px; letter-spacing: .02em; }
.ticket .th small { font-size: 10.5px; color: #777; display: block; margin-top: 2px; }
.ticket .tr { display: flex; justify-content: space-between; font-size: 11.5px; margin: 7px 0; font-variant-numeric: tabular-nums; }
.ticket .tr.muted { color: #888; }
.ticket .tt { border-top: 1.5px dashed #c9c9c9; margin-top: 9px; padding-top: 9px; display: flex; justify-content: space-between; font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 14px; }
.ticket .credit { background: #f0f6f3; border: 1px dashed #9cc5b6; border-radius: 6px; font-size: 10.5px; text-align: center; padding: 7px; margin-top: 10px; color: #0A3F33; font-weight: 600; }
.done-actions { display: flex; gap: 10px; margin-top: 26px; width: 100%; }
.da { flex: 1; border: none; border-radius: 14px; padding: 14px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
.da.ghost { background: rgba(255,255,255,.12); color: #fff; }
.da.solid { background: var(--amber); color: #3a2607; }
.da svg { width: 17px; height: 17px; stroke: currentColor; fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.pend { background: var(--amber-soft); border: 1px solid #EAD9B8; border-radius: 16px; padding: 14px; margin: 4px 0 14px; text-align: left; }
.pend-txt { font-size: 13px; color: #8A6516; font-weight: 500; line-height: 1.45; margin-bottom: 11px; }
.pend-txt b { color: #6E500F; }
.pend-btn { width: 100%; background: var(--amber); color: #fff; border: none; border-radius: 12px; padding: 13px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; }
.pend-btn:disabled { opacity: .6; }
.pend-ok { display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--green); font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; }
.pend-ok svg { width: 18px; height: 18px; stroke: var(--green); fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }

.pend-toggle { display: flex; align-items: center; gap: 12px; background: var(--surface); border: 1.5px solid var(--line); border-radius: 16px; padding: 14px; margin-top: 14px; cursor: pointer; transition: .18s; }
.pend-toggle.on { border-color: var(--amber); background: var(--amber-soft); }
.pt-check { width: 24px; height: 24px; border-radius: 7px; border: 2px solid var(--line); display: grid; place-items: center; flex: 0 0 auto; transition: .18s; }
.pend-toggle.on .pt-check { background: var(--amber); border-color: var(--amber); }
.pt-check svg { width: 15px; height: 15px; stroke: #fff; fill: none; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.pt-tx { flex: 1; }
.pt-t { font-weight: 700; font-size: 14.5px; }
.pt-s { font-size: 12px; color: var(--muted); font-weight: 500; margin-top: 2px; line-height: 1.35; }
.print-msg { color: #BFE0D5; font-size: 12.5px; margin-top: 14px; text-align: center; max-width: 320px; }
</style>
