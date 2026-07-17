<template>
  <ion-page>
    <ion-content :fullscreen="true" class="pi">
      <div class="bar">
        <div class="iconbtn" @click="$router.back()"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></div>
        <div class="ttl"><div class="s">Ajustes</div><div class="n">Impresora</div></div>
      </div>

      <div class="body">
        <!-- Impresora guardada -->
        <div v-if="guardada" class="estado on">
          <div class="e-ic"><svg viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5h20v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg></div>
          <div class="e-tx">
            <div class="e-t">Impresora configurada</div>
            <div class="e-s">{{ guardada.nombre }}</div>
          </div>
          <button class="e-x" @click="olvidar()" title="Quitar"><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div v-else class="estado off">
          <div class="e-ic"><svg viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5h20v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg></div>
          <div class="e-tx">
            <div class="e-t">Sin impresora</div>
            <div class="e-s">Busca y elige tu impresora de tickets</div>
          </div>
        </div>

        <p v-if="mensaje" class="msg" :class="tipoMsg">{{ mensaje }}</p>

        <button class="btn buscar" :disabled="buscando" @click="buscar()">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
          {{ buscando ? 'Buscando…' : 'Buscar impresoras' }}
        </button>

        <div v-if="dispositivos.length" class="lista">
          <div class="l-t">Toca tu impresora para guardarla</div>
          <button v-for="dev in dispositivos" :key="dev.address" class="dev"
                  :class="{ sel: dev.address === (guardada && guardada.direccion) }" @click="elegir(dev)">
            <div class="d-ic"><svg viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5h20v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg></div>
            <div class="d-tx">
              <div class="d-n">{{ dev.name || 'Sin nombre' }}</div>
              <div class="d-a">{{ dev.address }}</div>
            </div>
            <div v-if="dev.address === (guardada && guardada.direccion)" class="d-ok"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></div>
          </button>
        </div>

        <button class="btn imprimir" :disabled="!guardada || probando" @click="probar()">
          <svg viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5h20v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>
          {{ probando ? 'Imprimiendo…' : 'Imprimir prueba' }}
        </button>
      </div>
    </ion-content>
  </ion-page>
</template>
<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { IonPage, IonContent } from '@ionic/vue'
import { CapacitorThermalPrinter } from 'capacitor-thermal-printer'
import { impresoraGuardada, guardarImpresora, olvidarImpresora, asegurarConexion } from '@/services/printer'

const dispositivos = ref([])
const buscando = ref(false)
const probando = ref(false)
const guardada = ref(impresoraGuardada())
const mensaje = ref('')
const tipoMsg = ref('info')
function aviso(t, tipo = 'info') { mensaje.value = t; tipoMsg.value = tipo }

let listener = null
onMounted(() => {
  listener = CapacitorThermalPrinter.addListener('discoverDevices', (data) => {
    dispositivos.value = data.devices || []
  })
})
onBeforeUnmount(() => { if (listener) listener.remove() })

async function buscar() {
  buscando.value = true; aviso(''); dispositivos.value = []
  try {
    await CapacitorThermalPrinter.startScan()
    setTimeout(async () => {
      try { await CapacitorThermalPrinter.stopScan() } catch { /* noop */ }
      buscando.value = false
      if (!dispositivos.value.length) aviso('No se encontraron impresoras. Verifica que esté encendida y vinculada.', 'warn')
    }, 6000)
  } catch (e) {
    buscando.value = false
    aviso('No se pudo buscar. ¿Diste permiso de Bluetooth? ' + (e?.message || ''), 'error')
  }
}

async function elegir(dev) {
  aviso('Conectando…')
  try {
    const res = await CapacitorThermalPrinter.connect({ address: dev.address })
    if (res === null) { aviso('No se pudo conectar a esa impresora.', 'error'); return }
    guardarImpresora(dev.address, dev.name || dev.address)
    guardada.value = impresoraGuardada()
    aviso('¡Impresora guardada! Ya no tendrás que elegirla de nuevo.', 'ok')
  } catch (e) {
    aviso('Error al conectar: ' + (e?.message || ''), 'error')
  }
}

function olvidar() {
  olvidarImpresora()
  guardada.value = null
  aviso('Impresora quitada.', 'info')
}

async function probar() {
  probando.value = true; aviso('')
  try {
    await asegurarConexion()
    await CapacitorThermalPrinter.begin()
      .align('center').bold().text('DISTRIBUIDORA\n').clearFormatting()
      .text('Prueba de impresora\n')
      .text('--------------------------------\n')
      .align('left').text('Todo funciona correctamente.\n')
      .text('Fecha: ' + new Date().toLocaleString('es-MX') + '\n')
      .align('center').text('\n\n\n')
      .write()
    aviso('Ticket enviado. ¿Salió impreso?', 'ok')
  } catch (e) {
    aviso('Error: ' + (e?.message || ''), 'error')
  } finally { probando.value = false }
}
</script>
<style scoped>
.pi { --background: var(--paper); }
.bar { display: flex; align-items: center; gap: 12px; padding: 14px 18px 10px; }
.iconbtn { width: 40px; height: 40px; border-radius: 13px; border: 1px solid var(--line); background: var(--surface); display: grid; place-items: center; cursor: pointer; flex: 0 0 auto; }
.iconbtn svg { width: 20px; height: 20px; stroke: var(--ink); fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.ttl .s { font-size: 11.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--pine); }
.ttl .n { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 19px; margin-top: 1px; }
.body { padding: 10px 18px 40px; }
.estado { display: flex; align-items: center; gap: 13px; border-radius: 16px; padding: 16px; margin-bottom: 14px; }
.estado.on { background: var(--pine-tint); border: 1px solid #BDE0C9; }
.estado.off { background: var(--surface); border: 1px solid var(--line); }
.e-ic { width: 46px; height: 46px; border-radius: 12px; display: grid; place-items: center; flex: 0 0 auto; }
.estado.on .e-ic { background: var(--pine); } .estado.off .e-ic { background: var(--paper-2); }
.e-ic svg { width: 22px; height: 22px; fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.estado.on .e-ic svg { stroke: #fff; } .estado.off .e-ic svg { stroke: var(--muted); }
.e-tx { flex: 1; min-width: 0; }
.e-t { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 16px; }
.e-s { font-size: 12.5px; color: var(--muted); font-weight: 500; margin-top: 2px; }
.e-x { width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); display: grid; place-items: center; cursor: pointer; flex: 0 0 auto; }
.e-x svg { width: 15px; height: 15px; stroke: var(--muted); fill: none; stroke-width: 2.4; stroke-linecap: round; }
.msg { font-size: 13px; font-weight: 600; padding: 11px 14px; border-radius: 11px; margin-bottom: 14px; }
.msg.info { background: var(--paper-2); color: var(--ink-soft); }
.msg.ok { background: var(--pine-tint); color: var(--pine-deep); }
.msg.warn { background: var(--amber-soft); color: #9A6512; }
.msg.error { background: var(--clay-soft); color: var(--clay); }
.btn { display: flex; align-items: center; justify-content: center; gap: 9px; width: 100%; border: none; border-radius: 14px; padding: 15px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; cursor: pointer; margin-bottom: 12px; }
.btn svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.btn.buscar { background: var(--surface); border: 1.5px solid var(--pine); color: var(--pine); }
.btn.imprimir { background: var(--pine); color: #fff; }
.btn:disabled { opacity: .5; }
.lista { margin: 4px 0 14px; }
.l-t { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 9px; }
.dev { display: flex; align-items: center; gap: 12px; width: 100%; background: var(--surface); border: 1.5px solid var(--line); border-radius: 13px; padding: 13px; margin-bottom: 8px; cursor: pointer; text-align: left; }
.dev.sel { border-color: var(--pine); background: var(--pine-tint); }
.d-ic { width: 38px; height: 38px; border-radius: 10px; background: var(--paper-2); display: grid; place-items: center; flex: 0 0 auto; }
.d-ic svg { width: 19px; height: 19px; stroke: var(--ink-soft); fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.d-tx { flex: 1; min-width: 0; }
.d-n { font-weight: 700; font-size: 14.5px; }
.d-a { font-size: 11.5px; color: var(--muted); margin-top: 1px; }
.d-ok svg { width: 20px; height: 20px; stroke: var(--pine); fill: none; stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }
</style>
