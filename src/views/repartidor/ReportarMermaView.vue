<template>
  <ion-page>
    <ion-content :fullscreen="true" class="rm">
      <div class="bar">
        <div class="iconbtn" @click="$router.replace('/app/inventario')"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></div>
        <div class="ttl"><div class="s">En ruta</div><div class="n">Reportar merma</div></div>
        <button class="iconbtn scan" @click="mostrarScan = true" title="Escanear"><svg viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M3 12h18"/></svg></button>
      </div>

      <div class="body" v-show="!exito">
        <p v-if="cargando" class="muted">Cargando tu carga…</p>

        <div v-else-if="sinCarga" class="vacio">
          <div class="emoji-big"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5v-9z"/><path d="M3 7.5l9 4.5 9-4.5"/><path d="M12 12v9"/></svg></div>
          <p>No tienes una carga abierta.<br>Abre tu carga del día para poder reportar mermas de lo que llevas.</p>
          <button class="cta-line" @click="$router.replace('/app/inventario')">Ir a inventario</button>
        </div>

        <template v-else>
          <p class="intro">Reporta merma <b>solo de lo que traes en tu carga</b>. Adjunta foto como evidencia; el dueño la revisa y, si la acepta, se descuenta del inventario. Devuelves la mercancía al cerrar tu jornada.</p>

          <!-- selección de producto de la carga -->
          <div class="lista" v-if="!seleccion">
            <div class="search">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
              <input v-model="buscar" placeholder="Buscar en mi carga…">
            </div>
            <p v-if="!disponibles.length" class="muted">Ya no traes mercancía en la camioneta.</p>
            <div v-for="l in filtrados" :key="l.id" class="prod" @click="elegir(l)">
              <div class="emoji"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5v-9z"/><path d="M3 7.5l9 4.5 9-4.5"/><path d="M12 12v9"/></svg></div>
              <div class="info"><div class="nm">{{ l.productoNombre }}</div><div class="pr">llevas <b>{{ fmt(l.cantidadCargada) }}</b> · te quedan <b>{{ fmt(l.restante) }}</b></div></div>
              <svg class="chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>
            </div>
          </div>

          <!-- detalle de la merma -->
          <div v-else class="detalle">
            <div class="elegido">
              <div class="emoji"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5v-9z"/><path d="M3 7.5l9 4.5 9-4.5"/><path d="M12 12v9"/></svg></div>
              <div class="info"><div class="nm">{{ seleccion.productoNombre }}</div><div class="pr">te quedan {{ fmt(seleccion.restante) }} en la camioneta</div></div>
              <button class="cambiar" @click="reset()">Cambiar</button>
            </div>

            <div class="field"><div class="fl">Cantidad mermada * <span class="max">máx {{ fmt(seleccion.restante) }}</span></div>
              <div class="stepper">
                <button @click="cantidad = Math.max(1, +(cantidad - 1).toFixed(2))">−</button>
                <input v-model.number="cantidad" type="number" step="any" min="1" :max="seleccion.restante" @input="clamp">
                <button @click="cantidad = Math.min(seleccion.restante, +(cantidad + 1).toFixed(2))">+</button>
              </div>
              <p v-if="excede" class="warn">Solo traes {{ fmt(seleccion.restante) }}, no puedes reportar más.</p>
            </div>

            <div class="field"><div class="fl">Motivo *</div>
              <div class="chips">
                <button v-for="m in motivos" :key="m" class="mchip" :class="{ on: motivo === m }" @click="motivo = m">{{ m }}</button>
              </div>
              <input class="inp" v-model="motivoLibre" placeholder="Otro motivo (opcional)">
            </div>

            <div class="field"><div class="fl">Evidencia (foto) *</div>
              <input ref="fileInput" type="file" accept="image/*" capture="environment" hidden @change="onFoto">
              <div v-if="!fotoPreview" class="foto-btn" @click="$refs.fileInput.click()">
                <svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/></svg>
                Tomar foto de la merma
              </div>
              <div v-else class="foto-prev"><img :src="fotoPreview" alt="evidencia"><button class="recambiar" @click="$refs.fileInput.click()">Cambiar foto</button></div>
            </div>

            <p v-if="error" class="err">{{ error }}</p>
            <button class="cta" :disabled="enviando || !puede" @click="reportar()">{{ enviando ? 'Enviando…' : 'Reportar merma' }}</button>
          </div>
        </template>
      </div>

      <transition name="fadem"><div v-if="scanMsg" class="scanmsg">{{ scanMsg }}</div></transition>
      <BarcodeScanner :show="mostrarScan" @scan="onScan" @close="mostrarScan = false" />

      <ExitoOverlay :show="exito" titulo="Merma reportada" :subtitulo="seleccion?.productoNombre" :detalle="exitoDet" cta-texto="Volver al inventario" @done="$router.replace('/app/inventario')" />
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { IonPage, IonContent } from '@ionic/vue'
import http from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import ExitoOverlay from '@/components/ExitoOverlay.vue'
import BarcodeScanner from '@/components/BarcodeScanner.vue'

const auth = useAuthStore()
const carga = ref(null)
const cargando = ref(true)
const sinCarga = ref(false)
const buscar = ref('')
const seleccion = ref(null)
const cantidad = ref(1)
const motivo = ref('')
const motivoLibre = ref('')
const enviando = ref(false)
const error = ref('')
const exito = ref(false)
const exitoDet = ref([])
const fileInput = ref(null)
const fotoPreview = ref('')
let fotoFile = null
const motivos = ['Dañado', 'Caducado', 'Roto en transporte', 'Mal estado']
const mostrarScan = ref(false)
const scanMsg = ref('')
const codMap = ref({})  // codigoBarras -> productoId

const fmt = (n) => Number(n || 0).toLocaleString('es-MX')
const disponibles = computed(() => (carga.value?.lineas || []).filter((l) => l.restante > 0))
const filtrados = computed(() => { const t = buscar.value.trim().toLowerCase(); return t ? disponibles.value.filter((l) => l.productoNombre.toLowerCase().includes(t)) : disponibles.value })
const excede = computed(() => seleccion.value && cantidad.value > seleccion.value.restante)
const motivoFinal = computed(() => (motivoLibre.value.trim() || motivo.value).trim())
const puede = computed(() => seleccion.value && cantidad.value > 0 && !excede.value && motivoFinal.value && fotoFile)

function elegir(l) { seleccion.value = l; cantidad.value = 1 }
function reset() { seleccion.value = null; cantidad.value = 1; motivo.value = ''; motivoLibre.value = ''; fotoFile = null; fotoPreview.value = ''; error.value = '' }
function clamp() { if (seleccion.value && cantidad.value > seleccion.value.restante) cantidad.value = seleccion.value.restante }
function onFoto(e) { const f = e.target.files?.[0]; if (!f) return; fotoFile = f; fotoPreview.value = URL.createObjectURL(f) }

function onScan(code) {
  const pid = codMap.value[String(code || '').replace(/\s/g, '')]
  const l = pid ? disponibles.value.find((x) => x.productoId === pid) : null
  if (!l) { scanMsg.value = `Código ${code}: no lo traes en la carga`; setTimeout(() => { scanMsg.value = '' }, 2500); return }
  elegir(l)
  scanMsg.value = `${l.productoNombre} seleccionado`
  setTimeout(() => { scanMsg.value = '' }, 2000)
}

async function subir(file, nombre) {
  const fd = new FormData(); fd.append('archivo', file, nombre)
  const { data } = await http.post('/archivos/subir', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  return data.url
}
async function reportar() {
  if (!puede.value) return
  enviando.value = true; error.value = ''
  try {
    const fotoUrl = await subir(fotoFile, fotoFile.name || 'merma.jpg')
    await http.post('/mermas', { productoId: seleccion.value.productoId, pedidoLineaId: null, cantidad: cantidad.value, motivo: motivoFinal.value, fotoUrl, escenario: 0 })
    exitoDet.value = [{ k: 'Cantidad', v: fmt(cantidad.value) }, { k: 'Motivo', v: motivoFinal.value }]
    exito.value = true
  } catch (e) { error.value = e.response?.data?.mensaje || 'No se pudo reportar la merma.' }
  finally { enviando.value = false }
}
onMounted(async () => {
  try {
    const { data } = await http.get(`/cargas/repartidor/${auth.usuarioId}/abierta`); carga.value = data
    try {
      const pr = await http.get('/productos', { params: { tamano: 200 } })
      const m = {}; pr.data.items.forEach((x) => { if (x.codigoBarras) m[String(x.codigoBarras).replace(/\s/g, '')] = x.id })
      codMap.value = m
    } catch { /* el escaneo por código quedará limitado */ }
  }
  catch { sinCarga.value = true }
  finally { cargando.value = false }
})
</script>

<style scoped>
.rm { --background: var(--paper); }
.err { color: var(--clay); font-size: 13px; font-weight: 600; margin: 10px 2px; }
.warn { color: var(--clay); font-size: 12.5px; font-weight: 600; margin: 8px 2px 0; }
.muted { color: var(--muted); padding: 16px 2px; }
.bar { display: flex; align-items: center; gap: 12px; padding: 14px 18px 10px; }
.iconbtn { width: 40px; height: 40px; border-radius: 13px; border: 1px solid var(--line); background: var(--surface); display: grid; place-items: center; cursor: pointer; flex: 0 0 auto; }
.iconbtn.ghost { border-color: transparent; background: transparent; }
.iconbtn.scan svg { width: 21px; height: 21px; }
.iconbtn svg { width: 20px; height: 20px; stroke: var(--ink); fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.ttl { flex: 1; }
.ttl .s { font-size: 11.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--clay); }
.ttl .n { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 19px; margin-top: 1px; }
.body { padding: 6px 18px 30px; }
.vacio { text-align: center; padding: 50px 20px; }
.emoji-big { margin-bottom: 14px; color: var(--muted); text-align: center; }
.emoji-big svg { width: 52px; height: 52px; }
.vacio p { color: var(--muted); font-weight: 500; line-height: 1.5; margin-bottom: 18px; }
.cta-line { background: var(--pine); color: #fff; border: none; border-radius: 13px; padding: 13px 22px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; }
.intro { font-size: 13px; color: var(--muted); font-weight: 500; line-height: 1.5; margin-bottom: 14px; }
.intro b { color: var(--ink-soft); }
.search { display: flex; align-items: center; gap: 10px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; margin-bottom: 14px; box-shadow: var(--shadow); }
.search svg { width: 18px; height: 18px; stroke: var(--muted); fill: none; stroke-width: 2; flex: 0 0 auto; }
.search input { border: none; background: transparent; outline: none; font-size: 14.5px; font-weight: 500; color: var(--ink); width: 100%; }
.prod { display: flex; align-items: center; gap: 12px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; margin-bottom: 9px; box-shadow: var(--shadow); cursor: pointer; }
.emoji { width: 42px; height: 42px; border-radius: 11px; background: var(--paper-2); display: grid; place-items: center; color: var(--ink-soft); flex: 0 0 auto; }
.emoji svg { width: 22px; height: 22px; }
.info { flex: 1; min-width: 0; }
.nm { font-weight: 700; font-size: 14.5px; }
.pr { font-size: 12px; color: var(--muted); margin-top: 1px; }
.pr b { color: var(--ink-soft); font-variant-numeric: tabular-nums; }
.chev { width: 18px; height: 18px; stroke: var(--muted); fill: none; stroke-width: 2.2; flex: 0 0 auto; }
.elegido { display: flex; align-items: center; gap: 12px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; box-shadow: var(--shadow); margin-bottom: 14px; }
.cambiar { background: var(--paper-2); border: none; border-radius: 9px; padding: 7px 11px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12px; color: var(--ink-soft); cursor: pointer; }
.field { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px; box-shadow: var(--shadow); margin-bottom: 12px; }
.fl { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
.fl .max { color: var(--clay); font-weight: 700; }
.stepper { display: flex; align-items: center; background: var(--paper); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
.stepper button { width: 48px; height: 46px; border: none; background: transparent; font-size: 22px; color: var(--clay); cursor: pointer; }
.stepper input { flex: 1; text-align: center; border: none; background: transparent; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; color: var(--ink); outline: none; width: 100%; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.mchip { border: 1px solid var(--line); background: var(--paper); border-radius: 10px; padding: 8px 12px; font-family: "Hanken Grotesk"; font-weight: 600; font-size: 13px; color: var(--ink-soft); cursor: pointer; }
.mchip.on { background: var(--clay-soft); color: var(--clay); border-color: #EAC9BC; }
.inp { width: 100%; border: 1px solid var(--line); background: var(--paper); border-radius: 11px; padding: 11px 13px; font-size: 14.5px; font-weight: 500; color: var(--ink); }
.foto-btn { display: flex; align-items: center; justify-content: center; gap: 9px; border: 1.5px dashed #D9CFBC; border-radius: 12px; padding: 18px; color: var(--ink-soft); font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; background: var(--paper); }
.foto-btn svg { width: 20px; height: 20px; stroke: var(--clay); fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.foto-prev { position: relative; }
.foto-prev img { width: 100%; border-radius: 12px; max-height: 240px; object-fit: cover; display: block; }
.recambiar { position: absolute; right: 8px; bottom: 8px; background: rgba(21,42,36,.78); color: #fff; border: none; border-radius: 9px; padding: 7px 11px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12px; cursor: pointer; }
.cta { width: 100%; background: var(--clay); color: #fff; border: none; border-radius: 14px; padding: 16px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; cursor: pointer; box-shadow: 0 12px 22px -12px rgba(192,87,59,.8); margin-top: 4px; }
.cta:disabled { opacity: .5; }
.scanmsg { position: fixed; left: 50%; transform: translateX(-50%); bottom: 30px; z-index: 4500; background: var(--ink); color: #fff; border-radius: 12px; padding: 10px 16px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; box-shadow: 0 12px 24px -10px rgba(0,0,0,.5); }
.fadem-enter-active, .fadem-leave-active { transition: opacity .2s; } .fadem-enter-from, .fadem-leave-to { opacity: 0; }
</style>
