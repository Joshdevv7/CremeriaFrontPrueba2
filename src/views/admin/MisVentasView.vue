<template>
  <div>
    <p v-if="cargando" class="muted">Cargando…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else-if="!items.length" class="muted">Aún no tienes ventas registradas.</p>

    <div class="grid">
      <div v-for="v in items" :key="v.id" class="card" :class="{ open: abierta === v.id }">
        <div class="head" @click="toggle(v)">
          <div class="chip"><ion-icon :icon="cartOutline" /></div>
          <div class="info">
            <div class="cli">{{ v.clienteNombreMostrar }}</div>
            <div class="sub">
              {{ fecha(v.fecha) }} · {{ v.metodoPago || '—' }}
              <span v-if="v.editadoEn" class="badge-ed">Editada</span>
            </div>
          </div>
          <div class="total">{{ money(v.total) }}</div>
          <ion-icon :icon="abierta === v.id ? chevronUp : chevronDown" class="arrow" />
        </div>

        <div class="detalle" v-if="abierta === v.id">
          <p v-if="cargandoDetalle" class="muted2">Cargando detalle…</p>
          <template v-else-if="detalle">
            <template v-if="editando !== v.id">
              <div class="linea" v-for="l in detalle.lineas" :key="l.id">
                <span class="ln">{{ l.productoNombre }}</span>
                <span class="lc">{{ fmt(l.cantidadEntregada) }} × {{ money(l.precioUnitario) }}</span>
                <span class="ls">{{ money(l.subtotal) }}</span>
              </div>
              <div class="acciones">
                <button class="pdf-b" :disabled="descargando === v.id" @click="descargarPdf(v)">
                  <ion-icon :icon="documentTextOutline" />{{ descargando === v.id ? 'Generando…' : 'Ticket PDF' }}
                </button>
                <button v-if="puedeEditar(v)" class="edit-b" @click="iniciarEdicion(v)">
                  <ion-icon :icon="createOutline" /> Corregir venta
                </button>
              </div>
              <p v-if="!puedeEditar(v) && esLaMasReciente(v) && v.corteCajaId" class="hint-nc">
                Ya no se puede corregir: quedó incluida en tu corte de caja.
              </p>
              <p v-else-if="!esLaMasReciente(v)" class="hint-nc">
                Solo puedes corregir tu venta más reciente.
              </p>
            </template>
            <template v-else>
              <p class="hint-nc">Ajusta la cantidad de cada producto a lo que en realidad se llevó el cliente.</p>
              <div class="linea edit" v-for="l in detalle.lineas" :key="l.id">
                <span class="ln">{{ l.productoNombre }}</span>
                <input class="qty" type="number" min="0" step="0.001" v-model.number="cantEdit[l.id]">
                <span class="ls">{{ money((cantEdit[l.id] || 0) * l.precioUnitario) }}</span>
              </div>
              <div class="tot-edit">Nuevo total: <b>{{ money(totalEdit) }}</b></div>
              <p v-if="errorEdit" class="err">{{ errorEdit }}</p>
              <div class="acciones">
                <button class="cancel-b" @click="cancelarEdicion()">Cancelar</button>
                <button class="save-b" :disabled="guardando" @click="guardarEdicion(v)">{{ guardando ? 'Guardando…' : 'Guardar corrección' }}</button>
              </div>
            </template>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { IonIcon } from '@ionic/vue'
import { cartOutline, chevronDown, chevronUp, documentTextOutline, createOutline } from 'ionicons/icons'
import http from '@/api/http'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits(['ctx'])
const auth = useAuthStore()
const items = ref([])
const cargando = ref(true)
const error = ref('')
const abierta = ref(null)
const detalle = ref(null)
const cargandoDetalle = ref(false)
const descargando = ref(null)
const editando = ref(null)
const cantEdit = reactive({})
const guardando = ref(false)
const errorEdit = ref('')

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const fmt = (n) => Number(n || 0).toLocaleString('es-MX')
const fecha = (f) => new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// Misma regla que valida el backend: solo la venta más reciente, y solo mientras
// no tenga corte de caja, se puede corregir.
function esLaMasReciente(v) { return items.value[0]?.id === v.id }
function puedeEditar(v) { return esLaMasReciente(v) && !v.corteCajaId }

async function toggle(v) {
  if (abierta.value === v.id) { abierta.value = null; return }
  abierta.value = v.id
  editando.value = null
  await cargarDetalle(v.id)
}

async function cargarDetalle(id) {
  cargandoDetalle.value = true; detalle.value = null
  try { const { data } = await http.get(`/pedidos/${id}`); detalle.value = data }
  catch { /* el usuario puede reintentar cerrando y abriendo la tarjeta */ }
  finally { cargandoDetalle.value = false }
}

function iniciarEdicion(v) {
  editando.value = v.id
  errorEdit.value = ''
  Object.keys(cantEdit).forEach((k) => delete cantEdit[k])
  detalle.value.lineas.forEach((l) => { cantEdit[l.id] = l.cantidadEntregada })
}
function cancelarEdicion() { editando.value = null; errorEdit.value = '' }
const totalEdit = computed(() => detalle.value ? detalle.value.lineas.reduce((s, l) => s + (cantEdit[l.id] || 0) * l.precioUnitario, 0) : 0)

async function guardarEdicion(v) {
  guardando.value = true; errorEdit.value = ''
  try {
    const lineas = detalle.value.lineas
      .filter((l) => Number(cantEdit[l.id]) !== l.cantidadEntregada)
      .map((l) => ({ pedidoLineaId: l.id, nuevaCantidad: Number(cantEdit[l.id]) || 0 }))
    if (!lineas.length) { errorEdit.value = 'No hay cambios que guardar.'; guardando.value = false; return }
    const { data } = await http.put(`/pedidos/${v.id}/editar-venta`, { lineas })
    detalle.value = data
    const idx = items.value.findIndex((x) => x.id === v.id)
    if (idx >= 0) items.value[idx] = { ...items.value[idx], total: data.total, editadoEn: data.editadoEn }
    editando.value = null
  } catch (e) { errorEdit.value = e.response?.data?.mensaje || 'No se pudo guardar la corrección.' }
  finally { guardando.value = false }
}

async function descargarPdf(v) {
  descargando.value = v.id
  try {
    const res = await http.get(`/pedidos/${v.id}/pdf`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url; a.download = `venta-${v.id}.pdf`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => window.URL.revokeObjectURL(url), 4000)
  } catch { error.value = 'No se pudo generar el ticket.' }
  finally { descargando.value = null }
}

async function cargar() {
  cargando.value = true; error.value = ''
  try {
    const { data } = await http.get('/pedidos', { params: { repartidorId: auth.usuarioId, esVentaLibre: true, tamano: 50 } })
    items.value = data.items
  } catch (e) { error.value = e.response?.data?.mensaje || 'No se pudieron cargar tus ventas.' }
  finally { cargando.value = false }
}
onMounted(() => { emit('ctx', { titulo: 'Mis ventas', sub: 'Historial de tus ventas de mostrador', back: null }); cargar() })
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; } .muted2 { color: var(--muted); font-size: 13px; padding: 6px 2px; }
.err { color: var(--clay); font-weight: 600; margin-top: 16px; font-size: 13px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 12px; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow); overflow: hidden; }
.head { display: flex; align-items: center; gap: 13px; padding: 14px; cursor: pointer; }
.chip { width: 42px; height: 42px; border-radius: 11px; background: var(--pine-tint); display: grid; place-items: center; flex: 0 0 auto; }
.chip ion-icon { font-size: 21px; color: var(--pine); }
.info { flex: 1; min-width: 0; }
.cli { font-weight: 700; font-size: 15px; }
.sub { font-size: 12px; color: var(--muted); margin-top: 3px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.badge-ed { background: var(--amber-soft); color: #B9781F; font-weight: 700; font-size: 10.5px; letter-spacing: .03em; text-transform: uppercase; padding: 2px 7px; border-radius: 999px; }
.total { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; font-variant-numeric: tabular-nums; flex: 0 0 auto; }
.arrow { color: var(--muted); font-size: 18px; flex: 0 0 auto; }
.detalle { border-top: 1px solid var(--line); padding: 12px 14px; background: var(--paper); }
.linea { display: flex; align-items: center; gap: 10px; font-size: 12.5px; padding: 6px 0; }
.linea .ln { flex: 1; min-width: 0; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.linea .lc { color: var(--muted); flex: 0 0 auto; }
.linea .ls { font-weight: 700; flex: 0 0 auto; min-width: 64px; text-align: right; font-variant-numeric: tabular-nums; }
.linea.edit .qty { width: 70px; border: 1px solid var(--line); background: var(--surface); border-radius: 8px; padding: 5px 7px; font-weight: 700; text-align: center; }
.acciones { display: flex; gap: 8px; margin-top: 10px; }
.pdf-b, .edit-b, .cancel-b, .save-b { display: flex; align-items: center; gap: 8px; flex: 1; background: var(--surface); border: 1px solid var(--line); color: var(--ink-soft); border-radius: 11px; padding: 10px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12.5px; cursor: pointer; justify-content: center; }
.pdf-b ion-icon { font-size: 16px; color: var(--sky); }
.edit-b ion-icon { font-size: 16px; color: var(--pine); }
.pdf-b:disabled, .save-b:disabled { opacity: .6; }
.save-b { background: var(--pine); color: #fff; border-color: var(--pine); }
.hint-nc { font-size: 11.5px; color: var(--muted); margin-top: 9px; line-height: 1.4; }
.tot-edit { font-size: 13.5px; font-weight: 600; margin-top: 10px; text-align: right; }
.tot-edit b { font-family: "Bricolage Grotesque"; font-size: 16px; }
</style>
