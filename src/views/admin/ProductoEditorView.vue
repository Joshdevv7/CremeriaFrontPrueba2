<template>
  <div class="editor">
    <p v-if="cargando" class="muted">Cargando…</p>
    <template v-else>
      <div class="form" v-show="!exito">
        <div class="col">
          <div class="eyebrow">Datos generales</div>
          <div class="field"><div class="fl">Nombre *</div><input class="inp" v-model="form.nombre" placeholder="Ej. Queso barra"></div>
          <div class="field"><div class="fl">Categoría</div><input class="inp" v-model="form.categoria" placeholder="Ej. Lácteos"></div>
          <div class="field"><div class="fl">Código de barras</div>
            <div class="cod-row">
              <input class="inp" v-model="form.codigoBarras" placeholder="Ej. 7501000000016" inputmode="numeric">
              <button class="scan-b" type="button" @click="mostrarScan = true" title="Escanear"><svg viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M3 12h18"/></svg></button>
            </div>
          </div>
          <div class="field"><div class="fl">Unidad de medida</div>
            <select class="inp sel" v-model.number="form.unidad"><option :value="0">Pieza</option><option :value="1">Peso (kg)</option><option :value="2">Caja</option></select>
          </div>
          <div class="field"><div class="fl">Proveedor</div>
            <select class="inp sel" v-model="form.proveedorId"><option :value="null">Sin proveedor</option><option v-for="pv in proveedores" :key="pv.id" :value="pv.id">{{ pv.nombre }}</option></select>
          </div>
        </div>
        <div class="col">
          <div class="eyebrow">Precios e inventario</div>
          <div class="dosfields">
            <div class="field"><div class="fl">Precio de venta *</div><input class="inp" v-model.number="form.precioVenta" type="number" step="any" placeholder="0.00"></div>
            <div class="field"><div class="fl">Costo promedio</div><input class="inp" v-model.number="form.costoPromedio" type="number" step="any" placeholder="0.00"></div>
          </div>
          <div class="field"><div class="fl">Stock en almacén</div><input class="inp" v-model.number="form.stockAlmacen" type="number" step="any" placeholder="0"></div>
          <div class="dosfields">
            <div class="field"><div class="fl">Stock mínimo</div><input class="inp" v-model.number="form.stockMinimo" type="number" step="any" placeholder="0"></div>
            <div class="field"><div class="fl">Stock objetivo</div><input class="inp" v-model.number="form.stockObjetivo" type="number" step="any" placeholder="0"></div>
          </div>
          <p class="hint">Al caer al mínimo, el sistema sugiere surtir hasta el objetivo.</p>

          <div class="field caja">
            <div class="caja-head">
              <div><div class="ct">Venta por caja</div><div class="cd">Vender el mismo producto suelto y por caja</div></div>
              <button type="button" class="sw" :class="{ on: form.vendePorCaja }" @click="form.vendePorCaja = !form.vendePorCaja"><span></span></button>
            </div>
            <div v-if="form.vendePorCaja" class="caja-body">
              <div class="dosfields">
                <div><div class="fl">Piezas por caja *</div><input class="inp" v-model.number="form.piezasPorCaja" type="number" min="2" step="1" placeholder="12"></div>
                <div><div class="fl">Precio de la caja *</div><input class="inp" v-model.number="form.precioCaja" type="number" step="any" placeholder="0.00"></div>
              </div>
              <p class="hint">El inventario se lleva en piezas. Al vender 1 caja se descuentan {{ form.piezasPorCaja || 0 }} piezas. El precio de la caja lo defines tú (no es automático).</p>
            </div>
          </div>
        </div>
      </div>
      <p v-if="error" class="err">{{ error }}</p>
      <div class="guardar-bar" v-show="!exito">
        <button class="cta" :disabled="enviando || !form.nombre.trim()" @click="guardar()">{{ enviando ? 'Guardando…' : (esNuevo ? 'Crear producto' : 'Guardar cambios') }}</button>
        <button v-if="!esNuevo" class="trash" @click="desactivar()">Desactivar</button>
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
const form = reactive({ nombre: '', categoria: '', codigoBarras: '', unidad: 0, precioVenta: 0, costoPromedio: 0, stockAlmacen: 0, stockMinimo: 0, stockObjetivo: 0, proveedorId: null, vendePorCaja: false, piezasPorCaja: 12, precioCaja: 0 })
const proveedores = ref([])
const cargando = ref(true), enviando = ref(false), error = ref('')
const exito = ref(false), exitoTit = ref(''), exitoDet = ref([])
const mostrarScan = ref(false)
const U = { Pieza: 0, Peso: 1, Caja: 2 }
const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function onScan(code) { form.codigoBarras = String(code || '').trim() }
function salir() { router.replace('/panel/productos') }
function payload(activo) {
  const b = { nombre: form.nombre.trim(), categoria: form.categoria?.trim() || null, codigoBarras: form.codigoBarras?.trim() || null, unidad: form.unidad, precioVenta: form.precioVenta || 0, costoPromedio: form.costoPromedio || 0, stockAlmacen: form.stockAlmacen || 0, stockMinimo: form.stockMinimo || 0, stockObjetivo: form.stockObjetivo || 0, proveedorId: form.proveedorId || null, vendePorCaja: form.vendePorCaja, piezasPorCaja: form.vendePorCaja ? Number(form.piezasPorCaja) || 0 : 1, precioCaja: form.vendePorCaja ? Number(form.precioCaja) || 0 : 0 }
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
    exitoDet.value = [{ k: 'Precio', v: money(form.precioVenta) }, { k: 'Stock', v: Number(form.stockAlmacen).toLocaleString('es-MX') }]
    exito.value = true
  } catch (e) { error.value = e.response?.data?.mensaje || 'No se pudo guardar el producto.' }
  finally { enviando.value = false }
}
async function desactivar() {
  if (!confirm('¿Desactivar este producto?')) return
  try { await http.put(`/productos/${route.params.id}`, payload(false)); salir() }
  catch (e) { error.value = e.response?.data?.mensaje || 'No se pudo desactivar.' }
}
onMounted(async () => {
  emit('ctx', { titulo: esNuevo.value ? 'Nuevo producto' : 'Editar producto', sub: '', back: '/panel/productos' })
  try { const pv = await http.get('/proveedores', { params: { tamano: 100 } }); proveedores.value = pv.data.items } catch { proveedores.value = [] }
  if (!esNuevo.value) {
    try { const { data } = await http.get(`/productos/${route.params.id}`); Object.assign(form, { nombre: data.nombre, categoria: data.categoria || '', codigoBarras: data.codigoBarras || '', unidad: U[data.unidad] ?? 0, precioVenta: data.precioVenta, costoPromedio: data.costoPromedio, stockAlmacen: data.stockAlmacen, stockMinimo: data.stockMinimo, stockObjetivo: data.stockObjetivo, proveedorId: data.proveedorId || null, vendePorCaja: !!data.vendePorCaja, piezasPorCaja: data.piezasPorCaja || 12, precioCaja: data.precioCaja || 0 }) }
    catch { error.value = 'No se pudo cargar el producto.' }
  }
  cargando.value = false
})
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; }
.err { color: var(--clay); font-size: 13px; font-weight: 600; margin: 12px 2px; }
.form { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
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
.hint { font-size: 12px; color: var(--muted); font-weight: 500; margin: 4px 2px 0; }
.guardar-bar { margin-top: 18px; max-width: 360px; display: flex; gap: 10px; }
.guardar-bar .cta { flex: 1; }
.cta { width: 100%; background: var(--pine); color: #fff; border: none; border-radius: 14px; padding: 15px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; cursor: pointer; box-shadow: 0 12px 22px -12px rgba(14,92,74,.8); }
.cta:disabled { opacity: .5; }
.trash { border: 1px solid var(--clay-soft); background: var(--clay-soft); color: var(--clay); border-radius: 14px; padding: 15px 18px; font-family: "Bricolage Grotesque"; font-weight: 700; cursor: pointer; }
@media (max-width: 860px) { .form { grid-template-columns: 1fr; } }
.caja { margin-top: 4px; }
.caja-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.caja-head .ct { font-weight: 700; font-size: 14px; }
.caja-head .cd { font-size: 12px; color: var(--muted); margin-top: 2px; }
.caja-body { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); }
.caja-body .dosfields > div { flex: 1; }
.sw { width: 50px; height: 30px; border-radius: 16px; border: none; background: var(--line); position: relative; cursor: pointer; flex: 0 0 auto; transition: background .15s; }
.sw span { position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%; background: #fff; transition: transform .15s; box-shadow: 0 2px 4px rgba(0,0,0,.2); }
.sw.on { background: var(--pine); } .sw.on span { transform: translateX(20px); }
</style>
