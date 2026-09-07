<template>
  <div class="editor">
    <p v-if="cargando" class="muted">Cargando producto…</p>
    <template v-else>
      <div class="form" v-show="!exito">
        <!-- Columna Datos Generales -->
        <div class="col">
          <div class="eyebrow">Datos generales</div>
          <div class="field"><div class="fl">Nombre del producto *</div><input class="inp" v-model="form.nombre" placeholder="Ej. Queso barra 1kg"></div>
          <div class="field"><div class="fl">Categoría</div><input class="inp" v-model="form.categoria" placeholder="Ej. Lácteos, Abarrotes, Embutidos"></div>
          <div class="field"><div class="fl">Código de barras</div>
            <div class="cod-row">
              <input class="inp" v-model="form.codigoBarras" placeholder="Ej. 7501000000016" inputmode="numeric">
              <button class="scan-b" type="button" @click="mostrarScan = true" title="Escanear con cámara"><svg viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M3 12h18"/></svg></button>
            </div>
          </div>
          <div class="field"><div class="fl">Unidad de medida</div>
            <select class="inp sel" v-model.number="form.unidad"><option :value="0">Pieza (u)</option><option :value="1">Peso (kg)</option><option :value="2">Caja</option></select>
          </div>
          <div class="field">
            <div class="fl">Proveedor habitual</div>
            <select class="inp sel" v-model="form.proveedorId">
              <option :value="null">Sin proveedor asignado</option>
              <option v-for="pv in proveedores" :key="pv.id" :value="pv.id">{{ pv.nombre }}</option>
            </select>
            <small v-if="provSeleccionado?.whatsapp" class="prov-wa-hint">
              📱 WhatsApp configurado: <b>{{ provSeleccionado.whatsapp }}</b> (activo para reorden en 1 toque)
            </small>
          </div>
        </div>

        <!-- Columna Precios e Inventario -->
        <div class="col">
          <div class="eyebrow">Precios, utilidad e inventario</div>
          <div class="dosfields">
            <div class="field">
              <div class="fl">Precio de venta *</div>
              <input class="inp" v-model.number="form.precioVenta" type="number" step="any" placeholder="0.00">
            </div>
            <div class="field">
              <div class="fl">Costo promedio (CPP)</div>
              <input class="inp" v-model.number="form.costoPromedio" type="number" step="any" placeholder="0.00">
            </div>
          </div>

          <!-- Margen de Ganancia en Tiempo Real -->
          <div class="margen-card" :class="margenPza.clase">
            <div class="margen-main">
              <span class="m-pct">{{ margenPza.pct }}% margen bruto</span>
              <span class="m-utilidad">{{ money(margenPza.ganancia) }} ganancia / pza</span>
            </div>
            <div class="m-sub">Basado en costo unitario de {{ money(form.costoPromedio) }}</div>
          </div>

          <div class="field">
            <div class="fl">Stock físico en almacén</div>
            <input class="inp" v-model.number="form.stockAlmacen" type="number" step="any" placeholder="0">
          </div>

          <div class="dosfields">
            <div class="field">
              <div class="fl">Stock mínimo</div>
              <input class="inp" v-model.number="form.stockMinimo" type="number" step="any" placeholder="0">
            </div>
            <div class="field">
              <div class="fl">Stock objetivo</div>
              <input class="inp" v-model.number="form.stockObjetivo" type="number" step="any" placeholder="0">
            </div>
          </div>
          <p class="hint">Al caer al mínimo, el sistema calcula pedir {{ Math.max(0, (form.stockObjetivo || 0) - (form.stockAlmacen || 0)) }} pzas hasta el objetivo.</p>

          <!-- Venta por caja -->
          <div class="field caja">
            <div class="caja-head">
              <div>
                <div class="ct">Venta por caja</div>
                <div class="cd">Vender el producto por pieza y por caja cerrada</div>
              </div>
              <button type="button" class="sw" :class="{ on: form.vendePorCaja }" @click="form.vendePorCaja = !form.vendePorCaja"><span></span></button>
            </div>
            <div v-if="form.vendePorCaja" class="caja-body">
              <div class="dosfields">
                <div>
                  <div class="fl">Piezas por caja *</div>
                  <input class="inp" v-model.number="form.piezasPorCaja" type="number" min="2" step="1" placeholder="12">
                </div>
                <div>
                  <div class="fl">Precio de la caja *</div>
                  <input class="inp" v-model.number="form.precioCaja" type="number" step="any" placeholder="0.00">
                </div>
              </div>

              <div class="margen-caja-card" v-if="margenCaja">
                <div>Costo caja: <b>{{ money(margenCaja.costoCaja) }}</b></div>
                <div class="mc-gan">Ganancia: <b>{{ money(margenCaja.ganancia) }}</b> ({{ margenCaja.pct }}% margen)</div>
              </div>

              <p class="hint">El inventario siempre vive en piezas. Al vender 1 caja se descuentan {{ form.piezasPorCaja || 0 }} piezas de almacén o carga.</p>
            </div>
          </div>
        </div>
      </div>

      <p v-if="error" class="err">{{ error }}</p>

      <div class="guardar-bar" v-show="!exito">
        <button class="cta" :disabled="enviando || !form.nombre.trim()" @click="guardar()">
          {{ enviando ? 'Guardando…' : (esNuevo ? 'Crear producto' : 'Guardar cambios') }}
        </button>
        <button v-if="!esNuevo" class="trash" type="button" @click="desactivar()">Desactivar</button>
      </div>
    </template>

    <BarcodeScanner :show="mostrarScan" @scan="onScan" @close="mostrarScan = false" />
    <ExitoOverlay :show="exito" :titulo="exitoTit" :subtitulo="form.nombre" :detalle="exitoDet" cta-texto="Ver inventario" @done="salir" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import http from '@/api/http'
import ExitoOverlay from '@/components/ExitoOverlay.vue'
import BarcodeScanner from '@/components/BarcodeScanner.vue'

const emit = defineEmits(['ctx'])
const route = useRoute()
const router = useRouter()
const esNuevo = computed(() => route.params.id === 'nuevo')
const form = reactive({
  nombre: '',
  categoria: '',
  codigoBarras: '',
  unidad: 0,
  precioVenta: 0,
  costoPromedio: 0,
  stockAlmacen: 0,
  stockMinimo: 0,
  stockObjetivo: 0,
  proveedorId: null,
  vendePorCaja: false,
  piezasPorCaja: 12,
  precioCaja: 0
})

const proveedores = ref([])
const cargando = ref(true), enviando = ref(false), error = ref('')
const exito = ref(false), exitoTit = ref(''), exitoDet = ref([])
const mostrarScan = ref(false)
const U = { Pieza: 0, Peso: 1, Caja: 2 }
const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const provSeleccionado = computed(() => {
  return proveedores.value.find(p => p.id === form.proveedorId)
})

const margenPza = computed(() => {
  const pv = Number(form.precioVenta) || 0
  const cp = Number(form.costoPromedio) || 0
  if (pv <= 0) return { pct: '0.0', ganancia: 0, clase: 'm-gray' }
  const ganancia = pv - cp
  const pctNum = ((ganancia / pv) * 100)
  const pct = pctNum.toFixed(1)
  let clase = 'm-green'
  if (pctNum < 0) clase = 'm-red'
  else if (pctNum < 20) clase = 'm-amber'
  return { pct, ganancia, clase }
})

const margenCaja = computed(() => {
  if (!form.vendePorCaja) return null
  const pc = Number(form.precioCaja) || 0
  const pzas = Number(form.piezasPorCaja) || 1
  const costoCaja = (Number(form.costoPromedio) || 0) * pzas
  if (pc <= 0) return { pct: '0.0', ganancia: 0, costoCaja }
  const ganancia = pc - costoCaja
  const pct = ((ganancia / pc) * 100).toFixed(1)
  return { pct, ganancia, costoCaja }
})

function onScan(code) { form.codigoBarras = String(code || '').trim() }
function salir() { router.replace('/panel/productos') }

function payload(activo) {
  const b = {
    nombre: form.nombre.trim(),
    categoria: form.categoria?.trim() || null,
    codigoBarras: form.codigoBarras?.trim() || null,
    unidad: form.unidad,
    precioVenta: form.precioVenta || 0,
    costoPromedio: form.costoPromedio || 0,
    stockAlmacen: form.stockAlmacen || 0,
    stockMinimo: form.stockMinimo || 0,
    stockObjetivo: form.stockObjetivo || 0,
    proveedorId: form.proveedorId || null,
    vendePorCaja: form.vendePorCaja,
    piezasPorCaja: form.vendePorCaja ? Number(form.piezasPorCaja) || 0 : 1,
    precioCaja: form.vendePorCaja ? Number(form.precioCaja) || 0 : 0
  }
  if (activo !== undefined) b.activo = activo
  return b
}

async function guardar() {
  if (!form.nombre.trim()) return
  enviando.value = true; error.value = ''
  try {
    if (esNuevo.value) await http.post('/productos', payload())
    else await http.put(`/productos/${route.params.id}`, payload(true))
    exitoTit.value = esNuevo.value ? 'Producto creado' : 'Producto actualizado'
    exitoDet.value = [
      { k: 'Precio de venta', v: money(form.precioVenta) },
      { k: 'Costo promedio', v: money(form.costoPromedio) },
      { k: 'Margen bruto', v: `${margenPza.value.pct}%` },
      { k: 'Stock inicial', v: Number(form.stockAlmacen).toLocaleString('es-MX') }
    ]
    exito.value = true
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudo guardar el producto.'
  } finally {
    enviando.value = false
  }
}

async function desactivar() {
  if (!confirm('¿Desactivar este producto? Ya no aparecerá en el catálogo de ventas ni pedidos.')) return
  try {
    await http.put(`/productos/${route.params.id}`, payload(false))
    salir()
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudo desactivar.'
  }
}

onMounted(async () => {
  emit('ctx', { titulo: esNuevo.value ? 'Nuevo producto' : 'Editar producto', sub: '', back: '/panel/productos' })
  try {
    const pv = await http.get('/proveedores', { params: { tamano: 150 } })
    proveedores.value = pv.data.items || []
  } catch { proveedores.value = [] }

  if (!esNuevo.value) {
    try {
      const { data } = await http.get(`/productos/${route.params.id}`)
      Object.assign(form, {
        nombre: data.nombre,
        categoria: data.categoria || '',
        codigoBarras: data.codigoBarras || '',
        unidad: U[data.unidad] ?? 0,
        precioVenta: data.precioVenta,
        costoPromedio: data.costoPromedio,
        stockAlmacen: data.stockAlmacen,
        stockMinimo: data.stockMinimo,
        stockObjetivo: data.stockObjetivo,
        proveedorId: data.proveedorId || null,
        vendePorCaja: !!data.vendePorCaja,
        piezasPorCaja: data.piezasPorCaja || 12,
        precioCaja: data.precioCaja || 0
      })
    } catch {
      error.value = 'No se pudo cargar el producto.'
    }
  }
  cargando.value = false
})
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; }
.err { color: var(--clay); font-size: 13px; font-weight: 600; margin: 12px 2px; }
.form { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
.col { display: flex; flex-direction: column; gap: 11px; }

.eyebrow { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 11.5px; letter-spacing: .13em; text-transform: uppercase; color: var(--muted); margin: 4px 2px; }
.field { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px; box-shadow: var(--shadow); flex: 1; }
.dosfields { display: flex; gap: 11px; }
.fl { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 9px; }
.inp { width: 100%; border: 1px solid var(--line); background: var(--paper); border-radius: 11px; padding: 12px 13px; font-family: "Hanken Grotesk"; font-size: 15px; font-weight: 600; color: var(--ink); }

.cod-row { display: flex; gap: 9px; }
.cod-row .inp { flex: 1; }
.scan-b { flex: 0 0 auto; width: 48px; border: 1px solid var(--line); background: var(--pine-tint); border-radius: 11px; display: grid; place-items: center; cursor: pointer; }
.scan-b svg { width: 21px; height: 21px; stroke: var(--pine); fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

.sel { appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%237C8A82' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; }
.prov-wa-hint { font-size: 11.5px; color: #1AA75A; margin-top: 7px; display: block; }
.prov-wa-hint b { color: var(--ink); }

/* Margen Card */
.margen-card { border-radius: 13px; padding: 11px 14px; display: flex; flex-direction: column; gap: 2px; }
.margen-main { display: flex; justify-content: space-between; align-items: baseline; font-weight: 800; font-family: "Bricolage Grotesque"; font-size: 15px; }
.m-sub { font-size: 11px; opacity: .85; }
.m-green { background: var(--pine-tint); color: var(--pine); }
.m-amber { background: var(--amber-soft); color: #B9781F; }
.m-red { background: var(--clay-soft); color: var(--clay); }
.m-gray { background: var(--paper-2); color: var(--muted); }

.hint { font-size: 12px; color: var(--muted); font-weight: 500; margin: 4px 2px 0; }

.guardar-bar { margin-top: 18px; max-width: 380px; display: flex; gap: 10px; }
.guardar-bar .cta { flex: 1; }
.cta { width: 100%; background: var(--pine); color: #fff; border: none; border-radius: 14px; padding: 15px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; cursor: pointer; box-shadow: 0 12px 22px -12px rgba(14,92,74,.8); }
.cta:disabled { opacity: .5; }
.trash { border: 1px solid var(--clay-soft); background: var(--clay-soft); color: var(--clay); border-radius: 14px; padding: 15px 18px; font-family: "Bricolage Grotesque"; font-weight: 700; cursor: pointer; }

@media (max-width: 860px) { .form { grid-template-columns: 1fr; } }

.caja { margin-top: 4px; }
.caja-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.caja-head .ct { font-weight: 700; font-size: 14px; }
.caja-head .cd { font-size: 12px; color: var(--muted); margin-top: 2px; }
.caja-body { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); display: flex; flex-direction: column; gap: 9px; }
.caja-body .dosfields > div { flex: 1; }

.margen-caja-card { background: var(--paper); border: 1px solid var(--line); border-radius: 10px; padding: 8px 11px; font-size: 12px; color: var(--muted); display: flex; justify-content: space-between; align-items: center; }
.margen-caja-card b { color: var(--ink); }
.mc-gan b { color: var(--pine); }

.sw { width: 50px; height: 30px; border-radius: 16px; border: none; background: var(--line); position: relative; cursor: pointer; flex: 0 0 auto; transition: background .15s; }
.sw span { position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%; background: #fff; transition: transform .15s; box-shadow: 0 2px 4px rgba(0,0,0,.2); }
.sw.on { background: var(--pine); } .sw.on span { transform: translateX(20px); }
</style>
