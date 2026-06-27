<template>
  <transition name="fade">
    <div v-if="show" class="scan-ov" @click.self="cerrar()">
      <div class="sheet">
        <div class="head">
          <div class="t">Escanear código</div>
          <button class="x" @click="cerrar()"><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>

        <div class="cam-wrap">
          <div :id="readerId" class="reader"></div>
          <div v-if="camError" class="cam-msg">
            <div class="kbd-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg></div>
            <p>No se pudo abrir la cámara, pero puedes usar tu <b>lector físico</b>: dispáralo y se captura solo.</p>
          </div>
          <div v-else class="hint-cam">Apunta al código de barras</div>
        </div>

        <div class="manual">
          <input v-model="manualCode" placeholder="…o escribe el código" @keyup.enter="emitir(manualCode, true)">
          <button class="ok" :disabled="!manualCode.trim()" @click="emitir(manualCode, true)">Buscar</button>
        </div>

        <transition name="pop">
          <div v-if="resultado && resultado.texto" class="leido" :class="{ bad: resultado.tipo === 'err' }">
            <svg v-if="resultado.tipo !== 'err'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>
            <b>{{ resultado.texto }}</b>
          </div>
        </transition>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  continuo: { type: Boolean, default: false }, // si true, no se cierra tras leer (para escanear varios)
  resultado: { type: Object, default: null }   // { texto, tipo } que el padre actualiza tras cada lectura
})
const emit = defineEmits(['scan', 'close'])

const readerId = 'reader-' + Math.random().toString(36).slice(2, 8)
const camError = ref(false)
const manualCode = ref('')
let html5 = null
let bufferTeclado = ''
let ultimaTecla = 0

// ---- anti-rebote: evita que el mismo código se dispare muchas veces ----
let ultimoCode = ''
let ultimoCodeTime = 0
const VENTANA_MS = 2500 // mismo código ignorado durante este tiempo

/* ---- Lector físico (USB/Bluetooth): teclea rápido y manda Enter ---- */
function onKey(e) {
  const ahora = Date.now()
  if (ahora - ultimaTecla > 120) bufferTeclado = '' // reinicia si fue tecleo humano
  ultimaTecla = ahora
  if (e.key === 'Enter') {
    if (bufferTeclado.length >= 5) { emitir(bufferTeclado); e.preventDefault() }
    bufferTeclado = ''
    return
  }
  if (e.key.length === 1) bufferTeclado += e.key
}

/* ---- Cámara (html5-qrcode) ---- */
async function iniciarCamara() {
  camError.value = false
  try {
    const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
    html5 = new Html5Qrcode(readerId, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.QR_CODE
      ],
      verbose: false
    })
    await html5.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 140 } },
      (texto) => emitir(texto), () => {})
  } catch (e) {
    camError.value = true // sin cámara → el lector físico sigue funcionando
  }
}
async function detenerCamara() {
  try { if (html5) { await html5.stop(); await html5.clear() } } catch { /* noop */ }
  html5 = null
}

// manual = true cuando viene del input escrito (siempre se acepta)
function emitir(code, manual = false) {
  const c = String(code || '').trim()
  if (!c) return
  const ahora = Date.now()
  // anti-rebote: si es el MISMO código leído hace poco, lo ignoramos (salvo manual)
  if (!manual && c === ultimoCode && (ahora - ultimoCodeTime) < VENTANA_MS) return
  ultimoCode = c
  ultimoCodeTime = ahora

  emit('scan', c)
  manualCode.value = ''
  if (!props.continuo) cerrar()
}
function cerrar() { emit('close') }

watch(() => props.show, async (v) => {
  if (v) {
    bufferTeclado = ''
    ultimoCode = ''; ultimoCodeTime = 0
    window.addEventListener('keydown', onKey)
    setTimeout(iniciarCamara, 150) // espera a que el div exista
  } else {
    window.removeEventListener('keydown', onKey)
    await detenerCamara()
    manualCode.value = ''
  }
})
onUnmounted(() => { window.removeEventListener('keydown', onKey); detenerCamara() })
</script>

<style scoped>
.scan-ov { position: fixed; inset: 0; background: rgba(21,42,36,.55); z-index: 5000; display: flex; align-items: flex-end; justify-content: center; }
.sheet { background: var(--surface); width: 100%; max-width: 460px; border-radius: 22px 22px 0 0; padding: 16px 18px calc(20px + env(safe-area-inset-bottom)); }
@media (min-width: 560px) { .scan-ov { align-items: center; } .sheet { border-radius: 22px; margin: 0 16px; } }
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.head .t { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 17px; }
.x { width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); display: grid; place-items: center; cursor: pointer; }
.x svg { width: 18px; height: 18px; stroke: var(--ink); fill: none; stroke-width: 2.2; stroke-linecap: round; }
.cam-wrap { position: relative; background: #0A1512; border-radius: 16px; overflow: hidden; min-height: 220px; display: grid; place-items: center; }
.reader { width: 100%; }
.reader :deep(video) { border-radius: 16px; }
.hint-cam { position: absolute; bottom: 10px; left: 0; right: 0; text-align: center; color: #fff; font-size: 12.5px; font-weight: 600; text-shadow: 0 1px 4px rgba(0,0,0,.6); }
.cam-msg { padding: 30px 22px; text-align: center; color: #CFE0D9; }
.cam-msg .kbd-ic { display: grid; place-items: center; margin-bottom: 10px; }
.cam-msg .kbd-ic svg { width: 40px; height: 40px; stroke: #CFE0D9; }
.cam-msg p { font-size: 13.5px; line-height: 1.5; } .cam-msg b { color: #fff; }
.manual { display: flex; gap: 8px; margin-top: 12px; }
.manual input { flex: 1; border: 1px solid var(--line); background: var(--paper); border-radius: 12px; padding: 12px 13px; font-family: "Hanken Grotesk"; font-size: 15px; font-weight: 600; color: var(--ink); }
.manual .ok { background: var(--pine); color: #fff; border: none; border-radius: 12px; padding: 0 18px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; }
.manual .ok:disabled { opacity: .5; }
.leido { margin-top: 12px; background: var(--pine-tint); color: var(--pine-deep); border-radius: 11px; padding: 10px 13px; font-size: 13px; font-weight: 700; text-align: center; display: flex; align-items: center; justify-content: center; gap: 7px; }
.leido.bad { background: var(--clay-soft); color: var(--clay); }
.leido.bad svg { stroke: var(--clay); }
.leido svg { width: 15px; height: 15px; stroke: var(--pine-deep); fill: none; }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; } .fade-enter-from, .fade-leave-to { opacity: 0; }
.pop-enter-active { transition: transform .2s, opacity .2s; } .pop-enter-from { transform: scale(.9); opacity: 0; }
</style>
