<template>
  <div>
    <div class="tabs">
      <button v-for="f in filtros" :key="f.k" :class="{ on: estado === f.k }" @click="setEstado(f.k)">{{ f.t }}</button>
    </div>

    <p v-if="cargando" class="muted">Cargando…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else-if="!items.length" class="muted">{{ vacioTexto }}</p>

    <div class="grid">
      <div v-for="m in items" :key="m.id" class="card" @click="abrir(m)">
        <div class="head">
          <div class="chip" :class="escClase(m.escenario)"><ion-icon :icon="alertOutline" /></div>
          <div class="info">
            <div class="nombre">{{ m.productoNombre }}</div>
            <div class="sub">{{ fmt(m.cantidad) }} · {{ escTxt(m.escenario) }} · {{ fecha(m.fecha) }}</div>
          </div>
          <span class="badge" :class="estClase(m.estado)">{{ estTxt(m.estado) }}</span>
        </div>
        <div class="motivo">“{{ m.motivo }}”</div>
        <div class="pie">
          <span class="rep">{{ m.reportadoPorNombre }}</span>
          <span v-if="m.fotoUrl" class="ev"><ion-icon :icon="imageOutline" /> evidencia</span>
          <span v-if="m.afectoInventario" class="inv">descontado</span>
        </div>
      </div>
    </div>

    <!-- MODAL -->
    <transition name="modal">
      <div v-if="sel" class="overlay" @click.self="cerrar()">
        <div class="modal">
          <div class="mhead">
            <div><div class="mtit">{{ sel.productoNombre }}</div><div class="msub">{{ escTxt(sel.escenario) }} · {{ fecha(sel.fecha) }}</div></div>
            <button class="x" @click="cerrar()"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
          </div>

          <div class="mfoto" v-if="sel.fotoUrl"><img :src="imgSrc(sel.fotoUrl)" alt="evidencia" @click="ampliar = !ampliar" :class="{ zoom: ampliar }"></div>
          <div class="mfoto-no" v-else><ion-icon :icon="imageOutline" /> Sin evidencia adjunta</div>

          <div class="mrows">
            <div class="mrow"><span>Cantidad</span><b>{{ fmt(sel.cantidad) }}</b></div>
            <div class="mrow"><span>Motivo</span><b>{{ sel.motivo }}</b></div>
            <div class="mrow"><span>Reportó</span><b>{{ sel.reportadoPorNombre }}</b></div>
            <div class="mrow"><span>Estado</span><b><span class="badge" :class="estClase(sel.estado)">{{ estTxt(sel.estado) }}</span></b></div>
            <div class="mrow" v-if="sel.afectoInventario"><span>Inventario</span><b class="rojo">ya descontado</b></div>
          </div>

          <p v-if="errorAccion" class="err">{{ errorAccion }}</p>

          <div class="macciones">
            <button v-if="sel.estado === 'Reportada'" class="b verde" :disabled="ocupado" @click="accion('verificar')">{{ ocupado ? '…' : 'Verificar y descontar' }}</button>
            <button v-if="sel.estado === 'Reportada' && !sel.afectoInventario" class="b roja" :disabled="ocupado" @click="accion('rechazar')">Rechazar</button>
            <button v-if="sel.afectoInventario && sel.estado !== 'Restablecida'" class="b azul" :disabled="ocupado" @click="accion('restablecer')">Proveedor repuso (restablecer)</button>
            <button v-if="!accionDisponible" class="b gris" @click="cerrar()">Cerrar</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { IonIcon } from '@ionic/vue'
import { alertOutline, imageOutline } from 'ionicons/icons'
import http from '@/api/http'

const emit = defineEmits(['ctx'])
const items = ref([])
const cargando = ref(true)
const error = ref('')
const errorAccion = ref('')
const estado = ref('Reportada')
const ocupado = ref(false)
const sel = ref(null)
const ampliar = ref(false)

const filtros = [{ k: 'Reportada', t: 'Por revisar' }, { k: 'Verificada', t: 'Verificadas' }, { k: 'Restablecida', t: 'Restablecidas' }, { k: 'Rechazada', t: 'Rechazadas' }, { k: '', t: 'Todas' }]
const fmt = (n) => Number(n || 0).toLocaleString('es-MX')
const fecha = (f) => new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const escTxt = (e) => ({ EnRuta: 'En ruta', ReporteCliente: 'Reporte de cliente' }[e] || e)
const escClase = (e) => ({ EnRuta: 'amber', ReporteCliente: 'clay' }[e] || 'muted')
const estTxt = (e) => ({ Reportada: 'Por revisar', Verificada: 'Verificada', Restablecida: 'Restablecida', Rechazada: 'Rechazada' }[e] || e)
const estClase = (e) => ({ Reportada: 'amber', Verificada: 'pine', Restablecida: 'sky', Rechazada: 'muted' }[e] || 'muted')
const vacioTexto = computed(() => estado.value === 'Reportada' ? 'No hay mermas por revisar. 👍' : 'Sin mermas en este estado.')
const accionDisponible = computed(() => sel.value && (sel.value.estado === 'Reportada' || (sel.value.afectoInventario && sel.value.estado !== 'Restablecida')))

function imgSrc(url) { if (!url) return ''; if (/^https?:/.test(url)) return url; const base = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, ''); return base + url }
function abrir(m) { sel.value = m; ampliar.value = false; errorAccion.value = '' }
function cerrar() { sel.value = null }
function setEstado(k) { estado.value = k; cargar() }

async function cargar() {
  cargando.value = true; error.value = ''
  try {
    const params = { tamano: 100 }
    if (estado.value) params.estado = estado.value
    const { data } = await http.get('/mermas', { params })
    items.value = data.items
  } catch (e) { error.value = e.response?.data?.mensaje || 'No se pudieron cargar las mermas.' }
  finally { cargando.value = false }
}
async function accion(tipo) {
  ocupado.value = true; errorAccion.value = ''
  try { await http.post(`/mermas/${sel.value.id}/${tipo}`); cerrar(); await cargar() }
  catch (e) { errorAccion.value = e.response?.data?.mensaje || 'No se pudo completar la acción.' }
  finally { ocupado.value = false }
}
onMounted(() => { emit('ctx', { titulo: 'Mermas', sub: 'Reportes de producto dañado o devuelto', back: null }); cargar() })
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; } .err { color: var(--clay); font-weight: 600; margin-top: 16px; }
.tabs { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.tabs button { border: 1px solid var(--line); background: var(--surface); color: var(--muted); font-family: "Hanken Grotesk"; font-weight: 700; font-size: 13px; padding: 8px 14px; border-radius: 11px; cursor: pointer; box-shadow: var(--shadow); }
.tabs button.on { background: var(--pine); color: #fff; border-color: var(--pine); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 15px; box-shadow: var(--shadow); cursor: pointer; transition: transform .12s; }
.card:hover { transform: translateY(-2px); }
.head { display: flex; align-items: center; gap: 12px; }
.chip { width: 40px; height: 40px; border-radius: 11px; display: grid; place-items: center; flex: 0 0 auto; }
.chip ion-icon { font-size: 20px; }
.chip.amber { background: var(--amber-soft); } .chip.amber ion-icon { color: #B9781F; }
.chip.clay { background: var(--clay-soft); } .chip.clay ion-icon { color: var(--clay); }
.chip.muted { background: var(--paper-2); } .chip.muted ion-icon { color: var(--muted); }
.info { flex: 1; min-width: 0; }
.nombre { font-weight: 700; font-size: 15px; }
.sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
.badge { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; padding: 3px 8px; border-radius: 7px; flex: 0 0 auto; }
.badge.amber { color: #B9781F; background: var(--amber-soft); } .badge.pine { color: var(--pine); background: var(--pine-tint); } .badge.sky { color: var(--sky); background: var(--sky-soft); } .badge.muted { color: var(--muted); background: var(--paper-2); }
.motivo { font-size: 13.5px; color: var(--ink-soft); font-style: italic; margin: 11px 0 8px; }
.pie { display: flex; align-items: center; gap: 10px; font-size: 11.5px; color: var(--muted); font-weight: 600; }
.pie .ev { display: inline-flex; align-items: center; gap: 3px; color: var(--sky); }
.pie .ev ion-icon { font-size: 13px; }
.pie .inv { color: var(--clay); margin-left: auto; }

/* modal */
.overlay { position: fixed; inset: 0; background: rgba(21,42,36,.45); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; }
.modal { background: var(--surface); border: 1px solid var(--line); border-radius: 22px; width: 100%; max-width: 440px; max-height: 90vh; overflow: auto; padding: 20px; box-shadow: 0 30px 60px -20px rgba(21,42,36,.5); }
.mhead { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.mtit { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 19px; }
.msub { font-size: 12.5px; color: var(--muted); font-weight: 600; margin-top: 2px; }
.x { width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--line); background: var(--paper); display: grid; place-items: center; cursor: pointer; flex: 0 0 auto; }
.x svg { width: 18px; height: 18px; stroke: var(--ink-soft); fill: none; stroke-width: 2.2; stroke-linecap: round; }
.mfoto { border-radius: 14px; overflow: hidden; margin-bottom: 14px; background: var(--paper-2); }
.mfoto img { width: 100%; display: block; max-height: 260px; object-fit: cover; cursor: zoom-in; transition: max-height .2s; }
.mfoto img.zoom { max-height: 70vh; object-fit: contain; cursor: zoom-out; }
.mfoto-no { display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--muted); font-weight: 600; font-size: 13px; background: var(--paper-2); border-radius: 14px; padding: 24px; margin-bottom: 14px; }
.mfoto-no ion-icon { font-size: 18px; }
.mrows { display: flex; flex-direction: column; gap: 1px; background: var(--line); border-radius: 12px; overflow: hidden; margin-bottom: 14px; }
.mrow { display: flex; justify-content: space-between; align-items: center; gap: 12px; background: var(--paper); padding: 12px 14px; font-size: 13.5px; }
.mrow span { color: var(--muted); font-weight: 600; }
.mrow b { font-weight: 700; text-align: right; }
.mrow b.rojo { color: var(--clay); }
.macciones { display: flex; flex-direction: column; gap: 9px; }
.b { border: none; border-radius: 13px; padding: 14px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14.5px; cursor: pointer; }
.b:disabled { opacity: .5; }
.b.verde { background: var(--pine); color: #fff; }
.b.roja { background: var(--clay-soft); color: var(--clay); }
.b.azul { background: var(--sky-soft); color: var(--sky); }
.b.gris { background: var(--paper-2); color: var(--ink-soft); }

.modal-enter-active, .modal-leave-active { transition: opacity .2s; }
.modal-enter-active .modal, .modal-leave-active .modal { transition: transform .2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal, .modal-leave-to .modal { transform: translateY(20px) scale(.97); }

@media (max-width: 560px) {
  .overlay { align-items: flex-end; padding: 0; }
  .modal { max-width: 100%; border-radius: 22px 22px 0 0; max-height: 92vh; }
  .modal-enter-from .modal, .modal-leave-to .modal { transform: translateY(100%); }
}
</style>
