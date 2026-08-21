<template>
  <div>
    <p v-if="cargando" class="muted">Cargando…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else-if="!items.length" class="muted">Aún no hay compras registradas. Registra una con “Nueva compra”.</p>

    <div class="grid">
      <div v-for="c in items" :key="c.id" class="card" :class="{ open: abierta === c.id }">
        <div class="head" @click="toggle(c.id)">
          <div class="chip"><ion-icon :icon="cubeOutline" /></div>
          <div class="info">
            <div class="prov">{{ c.proveedorNombre }}</div>
            <div class="sub">
              {{ fecha(c.fecha) }} · {{ c.lineas.length }} producto(s)<span v-if="c.referencia"> · {{ c.referencia }}</span>
              <span v-if="c.registradoPorNombre"> · registró {{ c.registradoPorNombre }}</span>
            </div>
          </div>
          <div class="total">{{ money(c.total) }}</div>
          <ion-icon :icon="abierta === c.id ? chevronUp : chevronDown" class="arrow" />
        </div>

        <div class="detalle" v-if="abierta === c.id">
          <div class="linea" v-for="l in c.lineas" :key="l.id">
            <span class="ln">{{ l.productoNombre }}</span>
            <span class="lc">{{ cantMostrar(l) }} × {{ costoMostrar(l) }}</span>
            <span class="ls">{{ money(l.subtotal) }}</span>
          </div>
          <button class="pdf-b" :disabled="descargando === c.id" @click="descargarPdf(c)">
            <ion-icon :icon="documentTextOutline" />{{ descargando === c.id ? 'Generando…' : 'Descargar comprobante PDF' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { IonIcon } from '@ionic/vue'
import { cubeOutline, chevronDown, chevronUp, documentTextOutline } from 'ionicons/icons'
import http from '@/api/http'

const emit = defineEmits(['ctx'])
const items = ref([])
const cargando = ref(true)
const error = ref('')
const abierta = ref(null)
const descargando = ref(null)
const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const fmt = (n) => Number(n || 0).toLocaleString('es-MX')
const fecha = (f) => new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })

function esCajaLinea(l) { return !!l.esCaja && l.piezasPorCaja > 0 }
function cantMostrar(l) { return esCajaLinea(l) ? `${fmt(l.cantidad / l.piezasPorCaja)} caja(s)` : fmt(l.cantidad) }
function costoMostrar(l) { return esCajaLinea(l) ? money(l.costoUnitario * l.piezasPorCaja) : money(l.costoUnitario) }

function toggle(id) { abierta.value = abierta.value === id ? null : id }

async function descargarPdf(c) {
  descargando.value = c.id
  try {
    const res = await http.get(`/compras/${c.id}/pdf`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url; a.download = `compra-${c.id}.pdf`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => window.URL.revokeObjectURL(url), 4000)
  } catch { error.value = 'No se pudo generar el PDF.' }
  finally { descargando.value = null }
}

async function cargar() {
  cargando.value = true; error.value = ''
  try { const { data } = await http.get('/compras', { params: { tamano: 100 } }); items.value = data.items }
  catch (e) { error.value = e.response?.data?.mensaje || 'No se pudieron cargar las compras.' }
  finally { cargando.value = false }
}
onMounted(() => { emit('ctx', { titulo: 'Compras', sub: 'Entradas de mercancía de proveedores', back: null, acciones: { boton: { texto: 'Nueva compra', to: '/panel/compra/nuevo' } } }); cargar() })
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; } .err { color: var(--clay); font-weight: 600; margin-top: 16px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 12px; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow); overflow: hidden; }
.head { display: flex; align-items: center; gap: 13px; padding: 14px; cursor: pointer; }
.chip { width: 42px; height: 42px; border-radius: 11px; background: var(--sky-soft); display: grid; place-items: center; flex: 0 0 auto; }
.chip ion-icon { font-size: 21px; color: var(--sky); }
.info { flex: 1; min-width: 0; }
.prov { font-weight: 700; font-size: 15px; }
.sub { font-size: 12px; color: var(--muted); margin-top: 3px; }
.total { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; font-variant-numeric: tabular-nums; flex: 0 0 auto; }
.arrow { color: var(--muted); font-size: 18px; flex: 0 0 auto; }
.detalle { border-top: 1px solid var(--line); padding: 12px 14px; background: var(--paper); }
.linea { display: flex; align-items: center; gap: 10px; font-size: 12.5px; padding: 6px 0; }
.linea .ln { flex: 1; min-width: 0; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.linea .lc { color: var(--muted); flex: 0 0 auto; }
.linea .ls { font-weight: 700; flex: 0 0 auto; min-width: 64px; text-align: right; font-variant-numeric: tabular-nums; }
.pdf-b { display: flex; align-items: center; gap: 8px; width: 100%; margin-top: 10px; background: var(--surface); border: 1px solid var(--line); color: var(--ink-soft); border-radius: 11px; padding: 10px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12.5px; cursor: pointer; justify-content: center; }
.pdf-b ion-icon { font-size: 16px; color: var(--sky); }
.pdf-b:disabled { opacity: .6; }
</style>
