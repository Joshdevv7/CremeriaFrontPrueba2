<template>
  <div>
    <p v-if="cargando" class="muted">Cargando pendientes…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <div v-else-if="!items.length" class="vacio">
      <div class="v-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg></div>
      <div class="v-t">No hay nada por autorizar</div>
      <div class="v-s">Cuando un repartidor mande una carga o pida reabastecer, aparecerá aquí.</div>
    </div>

    <div v-else class="grid">
      <div v-for="it in items" :key="it.tipo + '-' + it.id" class="card" :class="{ reab: it.tipo === 'reabastecimiento' }">
        <div class="c-head">
          <div class="c-rep">
            <div class="av" :class="{ reab: it.tipo === 'reabastecimiento' }">{{ ini(it.repartidorNombre) }}</div>
            <div>
              <div class="nm">{{ it.repartidorNombre }}</div>
              <div class="meta">
                <span class="tag" :class="it.tipo">{{ it.tipo === 'carga' ? 'Carga nueva' : 'Reabastecer' }}</span>
                #{{ it.id }} · {{ fecha(it.fecha) }}
              </div>
            </div>
          </div>
          <div class="c-val">{{ money(it.valor) }}</div>
        </div>
        <div class="c-lineas">
          <div class="cl" v-for="l in it.lineas" :key="l.id">
            <span class="pkg"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5v-9z"/><path d="M3 7.5l9 4.5 9-4.5"/><path d="M12 12v9"/></svg></span>
            <span class="cl-nm">{{ l.productoNombre }}</span>
            <span class="cl-q">{{ fmtQty(l.cantidad) }}</span>
          </div>
        </div>
        <button class="revisar" @click="abrir(it)">Revisar y autorizar</button>
      </div>
    </div>

    <!-- Modal de revisión -->
    <div v-if="modal" class="modal-bg" @click.self="cerrar()">
      <div class="modal">
        <div class="m-head">
          <div>
            <div class="m-title">{{ modal.tipo === 'carga' ? 'Autorizar carga' : 'Autorizar reabastecimiento' }} #{{ modal.id }}</div>
            <div class="m-sub">{{ modal.repartidorNombre }} · {{ money(totalAjustado) }}</div>
          </div>
          <button class="m-x" @click="cerrar()"><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div class="m-body">
          <div class="m-hint">
            {{ modal.tipo === 'carga'
              ? 'Revisa lo que lleva el repartidor. Puedes ajustar cantidades antes de autorizar.'
              : 'El repartidor pide agregar esto a su carga abierta. Puedes ajustar cantidades antes de autorizar.' }}
          </div>
          <div class="m-linea" v-for="l in editable" :key="l.id">
            <div class="ml-info">
              <div class="ml-nm">{{ l.productoNombre }}</div>
              <div class="ml-sub">Pidió {{ fmtQty(l.original) }}</div>
            </div>
            <div class="stepper">
              <button @click="l.cantidad = Math.max(0, +(l.cantidad - 1).toFixed(3))" :disabled="l.cantidad <= 0">−</button>
              <input class="q" type="number" step="any" v-model.number="l.cantidad">
              <button @click="l.cantidad = +(l.cantidad + 1).toFixed(3)">+</button>
            </div>
          </div>
          <p v-if="modalError" class="m-err">{{ modalError }}</p>
        </div>
        <div class="m-foot" v-if="!modoRechazo">
          <button class="m-rechazar" @click="modoRechazo = true">Rechazar</button>
          <button class="m-ok" :disabled="procesando || !hayCantidades" @click="autorizar()">
            {{ procesando ? 'Autorizando…' : 'Autorizar' }}
          </button>
        </div>
        <div v-if="modoRechazo" class="rechazo">
          <div class="r-fl">Motivo del rechazo (opcional)</div>
          <textarea class="r-inp" v-model="motivo" rows="2" placeholder="Ej. Solo hay 15 de queso, ajusta la cantidad"></textarea>
          <div class="r-foot">
            <button class="r-cancel" @click="modoRechazo = false">Volver</button>
            <button class="r-ok" :disabled="procesando" @click="rechazar()">{{ procesando ? 'Rechazando…' : 'Confirmar rechazo' }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import http from '@/api/http'

const emit = defineEmits(['ctx'])
const items = ref([])
const cargando = ref(true)
const error = ref('')

const modal = ref(null)
const editable = ref([])
const modalError = ref('')
const procesando = ref(false)
const modoRechazo = ref(false)
const motivo = ref('')

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const fmtQty = (n) => Number(n || 0).toLocaleString('es-MX')
const fecha = (f) => new Date(f).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const ini = (n) => (n || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

const totalAjustado = computed(() =>
  editable.value.reduce((s, l) => s + (Number(l.cantidad) || 0) * l.precioVenta, 0))
const hayCantidades = computed(() => editable.value.some((l) => Number(l.cantidad) > 0))

// Trae cargas pendientes y reabastecimientos pendientes, y los une en una sola lista.
async function cargar() {
  cargando.value = true; error.value = ''
  try {
    const [cargas, reabs] = await Promise.all([
      http.get('/cargas', { params: { estado: 'PendienteAutorizacion', tamano: 50 } }),
      http.get('/cargas/reabastecimientos', { params: { estado: 'Pendiente', tamano: 50 } })
    ])
    const listaCargas = (cargas.data.items || []).map((c) => ({
      tipo: 'carga', id: c.id, repartidorNombre: c.repartidorNombre, fecha: c.fecha,
      valor: c.valorCargado,
      lineas: c.lineas.map((l) => ({ id: l.id, productoNombre: l.productoNombre, precioVenta: l.precioVenta, cantidad: l.cantidadCargada }))
    }))
    const listaReabs = (reabs.data.items || []).map((r) => ({
      tipo: 'reabastecimiento', id: r.id, repartidorNombre: r.repartidorNombre, fecha: r.fecha,
      valor: r.valorSolicitado,
      lineas: r.lineas.map((l) => ({ id: l.id, productoNombre: l.productoNombre, precioVenta: l.precioVenta, cantidad: l.cantidad }))
    }))
    items.value = [...listaCargas, ...listaReabs].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudieron cargar los pendientes.'
  } finally { cargando.value = false }
}

function abrir(it) {
  modal.value = it
  editable.value = it.lineas.map((l) => ({
    id: l.id, productoNombre: l.productoNombre, precioVenta: l.precioVenta,
    original: l.cantidad, cantidad: l.cantidad
  }))
  modalError.value = ''; modoRechazo.value = false; motivo.value = ''
}
function cerrar() { modal.value = null }

async function autorizar() {
  const esCarga = modal.value.tipo === 'carga'
  const ajustes = editable.value
    .filter((l) => Number(l.cantidad) !== l.original)
    .map((l) => esCarga
      ? { cargaLineaId: l.id, cantidad: Number(l.cantidad) }
      : { reabastecimientoLineaId: l.id, cantidad: Number(l.cantidad) })
  const url = esCarga
    ? `/cargas/${modal.value.id}/autorizar`
    : `/cargas/reabastecimientos/${modal.value.id}/autorizar`
  procesando.value = true; modalError.value = ''
  try {
    await http.post(url, { lineas: ajustes.length ? ajustes : null })
    cerrar()
    await cargar()
  } catch (e) {
    modalError.value = e.response?.data?.mensaje || 'No se pudo autorizar.'
  } finally { procesando.value = false }
}

async function rechazar() {
  const esCarga = modal.value.tipo === 'carga'
  const url = esCarga
    ? `/cargas/${modal.value.id}/rechazar`
    : `/cargas/reabastecimientos/${modal.value.id}/rechazar`
  procesando.value = true; modalError.value = ''
  try {
    await http.post(url, { motivo: motivo.value.trim() || null })
    cerrar()
    await cargar()
  } catch (e) {
    modalError.value = e.response?.data?.mensaje || 'No se pudo rechazar.'
  } finally { procesando.value = false }
}

onMounted(() => {
  emit('ctx', { titulo: 'Cargas por autorizar', sub: 'Valida lo que sale del almacén', back: null })
  cargar()
})
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; }
.err { color: var(--clay); font-weight: 600; margin-top: 24px; }
.vacio { text-align: center; padding: 60px 20px; }
.v-ic { width: 64px; height: 64px; border-radius: 18px; margin: 0 auto 16px; display: grid; place-items: center; background: var(--pine-tint); }
.v-ic svg { width: 30px; height: 30px; stroke: var(--pine); fill: none; }
.v-t { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; }
.v-s { color: var(--muted); font-size: 13.5px; margin-top: 6px; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 14px; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 20px; padding: 16px; box-shadow: var(--shadow); }
.card.reab { border-color: #C7DDE7; }
.c-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.c-rep { display: flex; align-items: center; gap: 11px; }
.c-rep .av { width: 40px; height: 40px; border-radius: 12px; background: var(--amber-soft); display: grid; place-items: center; color: #B9781F; font-weight: 700; font-size: 14px; flex: 0 0 auto; }
.c-rep .av.reab { background: var(--sky-soft); color: #1F5269; }
.c-rep .nm { font-weight: 700; font-size: 15px; }
.c-rep .meta { font-size: 12px; color: var(--muted); margin-top: 3px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.tag { font-size: 10px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; padding: 2px 7px; border-radius: 6px; }
.tag.carga { color: #B9781F; background: var(--amber-soft); }
.tag.reabastecimiento { color: #1F5269; background: var(--sky-soft); }
.c-val { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; flex: 0 0 auto; }
.c-lineas { background: var(--paper); border: 1px solid var(--line); border-radius: 12px; padding: 6px 12px; margin-bottom: 12px; }
.cl { display: flex; align-items: center; gap: 9px; padding: 8px 0; border-bottom: 1px solid var(--line); }
.cl:last-child { border-bottom: none; }
.cl .pkg svg { width: 16px; height: 16px; stroke: var(--ink-soft); fill: none; }
.cl-nm { flex: 1; font-size: 13.5px; font-weight: 600; }
.cl-q { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; font-variant-numeric: tabular-nums; }
.revisar { width: 100%; background: var(--pine); color: #fff; border: none; border-radius: 13px; padding: 13px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; }

.modal-bg { position: fixed; inset: 0; background: rgba(21,42,36,.45); backdrop-filter: blur(3px); display: grid; place-items: center; z-index: 3000; padding: 20px; }
.modal { background: var(--surface); border-radius: 22px; width: 100%; max-width: 460px; box-shadow: 0 30px 60px -20px rgba(0,0,0,.5); overflow: hidden; max-height: 90vh; display: flex; flex-direction: column; }
.m-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 20px 14px; border-bottom: 1px solid var(--line); }
.m-title { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; }
.m-sub { font-size: 13px; color: var(--muted); font-weight: 600; margin-top: 2px; }
.m-x { width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--line); background: var(--paper); display: grid; place-items: center; cursor: pointer; flex: 0 0 auto; }
.m-x svg { width: 16px; height: 16px; stroke: var(--muted); fill: none; stroke-width: 2.4; stroke-linecap: round; }
.m-body { padding: 16px 20px; overflow: auto; }
.m-hint { font-size: 12.5px; color: var(--muted); font-weight: 500; margin-bottom: 14px; line-height: 1.4; }
.m-linea { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--line); }
.m-linea:last-child { border-bottom: none; }
.ml-nm { font-weight: 700; font-size: 14.5px; }
.ml-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
.stepper { display: flex; align-items: center; background: var(--paper); border: 1px solid var(--line); border-radius: 11px; overflow: hidden; }
.stepper button { width: 34px; height: 38px; border: none; background: transparent; font-size: 19px; color: var(--pine); cursor: pointer; font-weight: 600; }
.stepper button:disabled { color: #C7CFC9; }
.stepper .q { width: 60px; text-align: center; border: none; background: transparent; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; font-variant-numeric: tabular-nums; }
.m-err { color: var(--clay); font-size: 13px; font-weight: 600; margin-top: 12px; }
.m-foot { display: flex; gap: 10px; padding: 4px 20px 20px; }
.m-rechazar { flex: 1; border: 1px solid var(--clay-soft); background: var(--clay-soft); color: var(--clay); border-radius: 13px; padding: 13px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; }
.m-ok { flex: 1.6; border: none; background: var(--pine); color: #fff; border-radius: 13px; padding: 13px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; }
.m-ok:disabled { opacity: .5; }
.rechazo { padding: 0 20px 20px; border-top: 1px solid var(--line); margin-top: 4px; padding-top: 16px; }
.r-fl { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
.r-inp { width: 100%; border: 1px solid var(--line); background: var(--paper); border-radius: 11px; padding: 11px 13px; font-family: "Hanken Grotesk"; font-size: 14px; font-weight: 500; color: var(--ink); resize: vertical; }
.r-foot { display: flex; gap: 10px; margin-top: 12px; }
.r-cancel { flex: 1; border: 1px solid var(--line); background: var(--surface); color: var(--ink-soft); border-radius: 12px; padding: 12px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; cursor: pointer; }
.r-ok { flex: 1.4; border: none; background: var(--clay); color: #fff; border-radius: 12px; padding: 12px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; cursor: pointer; }
.r-ok:disabled { opacity: .5; }
</style>
