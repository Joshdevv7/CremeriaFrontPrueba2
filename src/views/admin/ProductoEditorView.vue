<template>
  <div class="editor">
    <p v-if="cargando" class="muted">Cargando producto…</p>
    <p v-if="error" class="err">{{ error }}</p>
    <template v-if="!cargando && !cargaFallida">
      <div class="form" v-show="!exito">
        <!-- Columna Datos Generales -->
        <div class="col">
          <div class="eyebrow">Datos generales</div>
          <div class="field"><label class="fl" for="product-name">Nombre del producto *</label><input id="product-name" class="inp" v-model="form.nombre" placeholder="Ej. Queso barra 1kg"></div>
          <div class="field"><label class="fl" for="product-category">Categoría</label><input id="product-category" class="inp" v-model="form.categoria" placeholder="Ej. Lácteos, Abarrotes, Embutidos"></div>
          <div class="field"><label class="fl" for="product-barcode">Código de barras</label>
            <div class="cod-row">
              <input id="product-barcode" class="inp" v-model="form.codigoBarras" placeholder="Ej. 7501000000016" inputmode="numeric">
              <button class="scan-b" type="button" @click="mostrarScan = true" title="Escanear con cámara" aria-label="Escanear código de barras con cámara"><svg viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M3 12h18"/></svg></button>
            </div>
          </div>
          <div class="field"><label class="fl" for="product-unit">Unidad de medida</label>
            <select id="product-unit" class="inp sel" v-model.number="form.unidad"><option :value="0">Pieza</option><option :value="1">Kilogramo (kg)</option><option :value="2">Caja</option></select>
            <small class="field-help">Precios y existencias se capturan en {{ unidadPlural }}.</small>
          </div>
          <div class="field">
            <div id="product-supplier-label" class="fl">Proveedor habitual</div>
            <BuscadorSelect v-model="form.proveedorId" :opciones="opcionesProveedor" nombre="proveedor" placeholder="Sin proveedor asignado" :incluir-todos="false" aria-labelledby="product-supplier-label" />
            <small v-if="provSeleccionado?.whatsapp" class="prov-wa-hint">
              WhatsApp configurado: <b>{{ provSeleccionado.whatsapp }}</b> (para solicitar reabastecimiento)
            </small>
          </div>
          <label v-if="!esNuevo" class="estado"><input type="checkbox" v-model="form.activo"> Producto activo</label>
        </div>

        <!-- Columna Precios e Inventario -->
        <div class="col">
          <div class="eyebrow">Precios, utilidad e inventario</div>
          <div class="dosfields">
            <div class="field">
              <label class="fl" for="product-price">Precio de venta por {{ unidadSingular }} *</label>
              <input id="product-price" class="inp" v-model.number="form.precioVenta" type="number" step="any" placeholder="0.00">
            </div>
            <div class="field">
              <label class="fl" for="product-cost">Costo promedio por {{ unidadSingular }}</label>
              <input id="product-cost" class="inp" v-model.number="form.costoPromedio" aria-describedby="product-cost-help" type="number" step="any" placeholder="0.00">
              <small id="product-cost-help" class="field-help">Costo de compra promedio de una {{ unidadSingular }}. Se usa para calcular la ganancia.</small>
            </div>
          </div>

          <!-- Margen de Ganancia en Tiempo Real -->
          <div class="margen-card" :class="margenPza.clase">
            <div class="margen-main">
              <span class="m-pct">{{ margenPza.pct }}% margen bruto</span>
              <span class="m-utilidad">{{ money(margenPza.ganancia) }} ganancia por {{ unidadSingular }}</span>
            </div>
            <div class="m-sub">Basado en costo unitario de {{ money(form.costoPromedio) }}</div>
          </div>

          <div class="field">
            <label class="fl" for="product-stock">Existencias en almacén ({{ unidadPlural }})</label>
            <input id="product-stock" class="inp" v-model.number="form.stockAlmacen" type="number" step="any" placeholder="0">
          </div>

          <div class="dosfields">
            <div class="field">
              <label class="fl" for="product-minimum">Existencias mínimas ({{ unidadPlural }})</label>
              <input id="product-minimum" class="inp" aria-describedby="reorder-help" v-model.number="form.stockMinimo" type="number" step="any" placeholder="0">
            </div>
            <div class="field">
              <label class="fl" for="product-target">Existencias deseadas después de reabastecer ({{ unidadPlural }})</label>
              <input id="product-target" class="inp" aria-describedby="reorder-help reorder-example" v-model.number="form.stockObjetivo" type="number" step="any" placeholder="0">
            </div>
          </div>
          <div class="reorder-help">
            <p id="reorder-help">El mínimo activa la alerta cuando las existencias llegan a esa cantidad o bajan de ella. La cantidad deseada es lo que quieres tener en total después de comprar.</p>
            <p id="reorder-example"><strong>Con tus datos:</strong> tienes {{ cantidad(form.stockAlmacen) }} {{ unidadPlural }}, el mínimo es {{ cantidad(form.stockMinimo) }} y deseas tener {{ cantidad(form.stockObjetivo) }}. {{ Number(form.stockAlmacen) <= Number(form.stockMinimo) ? 'Hay alerta; se sugiere comprar' : 'Para llegar a esa cantidad faltan' }} <strong>{{ cantidad(sugerido) }} {{ unidadPlural }}</strong>.</p>
            <small>Ejemplo: mínimo 5, cantidad deseada 20 y existencias 4 → compra sugerida de 16.</small>
          </div>

          <!-- Venta por caja -->
          <div class="field caja">
            <div class="caja-head">
              <div>
                <div class="ct">Venta por caja</div>
                <div class="cd">Vender el producto por pieza y por caja cerrada</div>
              </div>
              <button type="button" class="sw" role="switch" aria-label="Habilitar venta por caja" :aria-checked="form.vendePorCaja" :class="{ on: form.vendePorCaja }" @click="form.vendePorCaja = !form.vendePorCaja"><span></span></button>
            </div>
            <div v-if="form.vendePorCaja" class="caja-body">
              <div class="dosfields">
                <div>
                  <label class="fl" for="product-box-units">Piezas por caja *</label>
                  <input id="product-box-units" class="inp" v-model.number="form.piezasPorCaja" type="number" min="2" step="1" placeholder="12">
                </div>
                <div>
                  <label class="fl" for="product-box-price">Precio de la caja *</label>
                  <input id="product-box-price" class="inp" v-model.number="form.precioCaja" type="number" step="any" placeholder="0.00">
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

      <div class="guardar-bar" v-show="!exito">
        <button class="cta" :disabled="enviando || !form.nombre.trim()" @click="guardar()">
          {{ enviando ? 'Guardando…' : (esNuevo ? 'Crear producto' : 'Guardar cambios') }}
        </button>
        <button v-if="!esNuevo && form.activo" class="trash" type="button" @click="desactivar()">Desactivar</button>
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
import { listarPaginas } from '@/api/listarPaginas'
import ExitoOverlay from '@/components/ExitoOverlay.vue'
import BarcodeScanner from '@/components/BarcodeScanner.vue'
import BuscadorSelect from '@/components/BuscadorSelect.vue'

const emit = defineEmits(['ctx'])
const route = useRoute()
const router = useRouter()
const esNuevo = computed(() => route.name === 'producto-nuevo')
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
  precioCaja: 0,
  activo: true
})

const proveedores = ref([])
const cargando = ref(true), enviando = ref(false), error = ref('')
const cargaFallida = ref(false)
const exito = ref(false), exitoTit = ref(''), exitoDet = ref([])
const mostrarScan = ref(false)
const U = { Pieza: 0, Peso: 1, Caja: 2 }
let stockAlmacenAnterior = 0
let costoPromedioAnterior = 0
const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const provSeleccionado = computed(() => {
  return proveedores.value.find(p => p.id === form.proveedorId)
})
const proveedoresDisponibles = computed(() => proveedores.value.filter(p => p.activo || p.id === form.proveedorId))

const opcionesProveedor = computed(() => proveedoresDisponibles.value.map(p => ({ ...p, nombre: p.nombre + (p.activo ? '' : ' (inactivo)') })))
const unidadSingular = computed(() => ['pieza', 'kilogramo', 'caja'][form.unidad] || 'pieza')
const unidadPlural = computed(() => ['piezas', 'kilogramos', 'cajas'][form.unidad] || 'piezas')
const sugerido = computed(() => Math.max(0, Number(form.stockObjetivo || 0) - Number(form.stockAlmacen || 0)))
const cantidad = n => Number(n || 0).toLocaleString('es-MX')

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
  if (activo !== undefined) {
    b.activo = activo
    b.stockAlmacenAnterior = stockAlmacenAnterior
    b.costoPromedioAnterior = costoPromedioAnterior
  }
  return b
}

async function guardar() {
  if (!form.nombre.trim()) return
  enviando.value = true; error.value = ''
  try {
    if (esNuevo.value) await http.post('/productos', payload())
    else await http.put(`/productos/${route.params.id}`, payload(form.activo))
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
    proveedores.value = await listarPaginas('/proveedores', { incluirInactivos: true })
    if (esNuevo.value && route.query.proveedorId) {
      const proveedorId = Number(route.query.proveedorId)
      if (proveedores.value.some(p => p.id === proveedorId && p.activo)) form.proveedorId = proveedorId
    }
  } catch {
    error.value = 'No se pudieron cargar los proveedores. Recarga la página antes de guardar.'
    cargaFallida.value = true
  }

  if (!esNuevo.value) {
    try {
      const { data } = await http.get(`/productos/${route.params.id}`)
      stockAlmacenAnterior = data.stockAlmacen
      costoPromedioAnterior = data.costoPromedio
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
        precioCaja: data.precioCaja || 0,
        activo: data.activo
      })
    } catch {
      cargaFallida.value = true
      error.value = 'No se pudo cargar el producto.'
    }
  }
  cargando.value = false
})
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; }
.estado { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.err { color: var(--clay); font-size: 13px; font-weight: 600; margin: 12px 2px; }
.editor, .col, .field { min-width: 0; }
.form { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
.col { display: flex; flex-direction: column; gap: 11px; }

.eyebrow { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 11.5px; letter-spacing: .13em; text-transform: uppercase; color: var(--muted); margin: 4px 2px; }
.field { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px; box-shadow: var(--shadow); flex: 1; }
.dosfields { display: flex; gap: 11px; }
.dosfields > * { min-width: 0; }
.fl { display: block; font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 9px; }
.inp { min-height: 44px; min-width: 0; box-sizing: border-box; width: 100%; border: 1px solid var(--line); background: var(--paper); border-radius: 11px; padding: 12px 13px; font-family: "Hanken Grotesk"; font-size: 15px; font-weight: 600; color: var(--ink); }

.cod-row { display: flex; gap: 9px; }
.cod-row .inp { flex: 1; }
.scan-b { flex: 0 0 auto; width: 48px; border: 1px solid var(--line); background: var(--pine-tint); border-radius: 11px; display: grid; place-items: center; cursor: pointer; }
.scan-b svg { width: 21px; height: 21px; stroke: var(--pine); fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

.sel { appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%237C8A82' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; }
.prov-wa-hint { font-size: 11.5px; color: #1AA75A; margin-top: 7px; display: block; }
.prov-wa-hint b { color: var(--ink); }

/* Margen Card */
.margen-card { border-radius: 13px; padding: 11px 14px; display: flex; flex-direction: column; gap: 2px; }
.margen-main { flex-wrap: wrap; gap: 4px 12px; display: flex; justify-content: space-between; align-items: baseline; font-weight: 800; font-family: "Bricolage Grotesque"; font-size: 15px; }
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

.sw { width: 56px; height: 44px; border-radius: 16px; border: none; background: var(--line); position: relative; cursor: pointer; flex: 0 0 auto; transition: background .15s; }
.sw span { position: absolute; top: 10px; left: 6px; width: 24px; height: 24px; border-radius: 50%; background: #fff; transition: transform .15s; box-shadow: 0 2px 4px rgba(0,0,0,.2); }
.sw.on { background: var(--pine); } .sw.on span { transform: translateX(20px); }
.field-help { display: block; margin-top: 8px; font-size: 12px; color: var(--ink-soft); }
.field :deep(.ss) { display: flex; width: 100%; }
.field :deep(.ss-btn) { flex: 1; width: 100%; min-width: 0; }
.reorder-help { background: var(--pine-tint); border-radius: 12px; padding: 12px 14px; font-size: 13px; line-height: 1.55; color: var(--ink-soft); }
.reorder-help p { margin: 0 0 8px; }
.reorder-help small { display: block; font-size: 12px; }
.reorder-help strong { color: var(--pine-deep); }
.estado { min-height: 44px; }
.estado input { width: 20px; height: 20px; }
button:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid var(--sky, #2E6F8E); outline-offset: 3px; }
@media (max-width: 480px) {
  .dosfields { flex-direction: column; }
  .guardar-bar { flex-wrap: wrap; max-width: none; }
  .guardar-bar .cta { flex-basis: 100%; }
  .margen-caja-card { align-items: flex-start; flex-direction: column; gap: 5px; }
}
</style>
