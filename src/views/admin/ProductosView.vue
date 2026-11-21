<template>
  <div class="inventario-page crm-page">
    <button class="crm-button summary-toggle" :aria-expanded="resumenAbierto" aria-controls="inventory-summary" @click="resumenAbierto = !resumenAbierto"><CrmIcon :name="resumenAbierto ? 'chevron-up' : 'chevron-down'" />{{ resumenAbierto ? 'Ocultar' : 'Ver' }} resumen del inventario</button>
    <section id="inventory-summary" class="inventory-summary" :class="{ 'mobile-open': resumenAbierto }" aria-label="Resumen global del inventario" :aria-busy="cargandoResumen">
      <div class="summary-card"><span>Valor del inventario</span><strong>{{ resumen ? money(resumen.valorInventario) : '—' }}</strong><small>Existencias a costo promedio</small></div>
      <div class="summary-card"><span>Productos en catálogo</span><strong>{{ resumen?.totalProductos ?? '—' }}</strong><small>{{ cantidadesGlobales || 'Existencias separadas por unidad' }}</small></div>
      <div class="summary-card"><span>Requieren reorden</span><strong>{{ resumen?.requierenReorden ?? '—' }}</strong><small>Existencias iguales o inferiores al mínimo</small></div>
      <div class="summary-card"><span>Agotados</span><strong>{{ resumen?.agotados ?? '—' }}</strong><small>Productos sin existencias en almacén</small></div>
    </section>
    <p v-if="errorResumen" class="summary-error" role="alert">{{ errorResumen }} <button class="crm-button" @click="cargarResumen">Reintentar resumen</button></p>
    <p class="summary-scope">Indicadores de todo el inventario activo. La búsqueda y los filtros se aplican al listado.</p>
    <p v-if="aviso" class="saved-note" role="status"><CrmIcon name="check" />{{ aviso }}</p>
    <section class="inventory-panel" aria-labelledby="inventory-heading" :aria-busy="cargando">
      <div class="inventory-toolbar">
        <div class="crm-field"><label for="inventory-search">Buscar producto</label><div class="search-box"><CrmIcon name="search" /><input id="inventory-search" v-model="buscar" type="search" maxlength="120" placeholder="Nombre, categoría, código o proveedor" aria-describedby="inventory-search-help"><button v-if="buscar" class="clear-search" aria-label="Limpiar búsqueda" @click="buscar = ''"><CrmIcon name="close" /></button></div><small id="inventory-search-help">Busca en todo el catálogo desde 3 caracteres.<span v-if="buscar.trim() && !listo"> Escribe al menos 3 caracteres para cambiar la búsqueda.</span></small></div>
        <button class="crm-button refresh" :disabled="cargando || cargandoResumen" aria-label="Actualizar inventario" @click="actualizar"><CrmIcon name="refresh" />Actualizar</button>
        <div class="inventory-filters" aria-label="Filtrar inventario"><button v-for="tab in tabs" :key="tab.k" :aria-pressed="tabActiva === tab.k" :class="{ active: tabActiva === tab.k }" @click="tabActiva = tab.k"><CrmIcon v-if="tab.icono" :name="tab.icono" />{{ tab.label }}<span v-if="resumen && tab.conteo">{{ resumen[tab.conteo] }}</span></button></div>
      </div>
      <div class="inventory-heading"><h2 id="inventory-heading">Productos</h2><small>Toca un producto para ver sus detalles</small></div>
      <div v-if="cargando" class="crm-state" role="status">Cargando página del inventario…</div>
      <div v-else-if="error" class="crm-state error" role="alert"><h3>No se pudo cargar el inventario</h3><p>{{ error }}</p><button class="crm-button" @click="cargarPagina">Reintentar</button></div>
      <div v-else-if="!items.length" class="crm-state"><h3>No hay productos con estos filtros</h3><p>Prueba otro nombre, código o proveedor.</p><button class="crm-button" @click="limpiarFiltros">Limpiar filtros</button></div>
      <div v-else class="inventory-table-wrap">
        <table class="inventory-table"><thead><tr><th>Producto / proveedor</th><th>En almacén</th><th>Precio de venta</th><th>Estado</th><th><span class="crm-sr-only">Acciones</span></th></tr></thead>
          <tbody v-for="p in items" :key="p.id" class="inventory-group" :class="{ expanded: abierto === p.id }">
            <tr class="inventory-row" @click="alternar(p.id)">
              <td class="product-cell"><button class="product-toggle" :aria-label="`${abierto === p.id ? 'Ocultar' : 'Ver'} detalles de ${p.nombre}`" :aria-expanded="abierto === p.id" :aria-controls="`inventory-detail-${p.id}`" @click.stop="alternar(p.id)"><CrmIcon name="box" /><span><strong>{{ p.nombre }}</strong><small>{{ p.proveedorNombre || 'Sin proveedor asignado' }}</small></span><CrmIcon :name="abierto === p.id ? 'chevron-up' : 'chevron-down'" /></button></td>
              <td data-label="En almacén"><strong :class="{ shortage: p.requiereReorden }">{{ fmt(p.stockAlmacen) }} {{ unidad(p) }}</strong></td>
              <td data-label="Precio de venta"><strong>{{ money(p.precioVenta) }}</strong><small>por {{ unidadSingular(p) }}</small></td>
              <td data-label="Estado"><span class="crm-badge" :class="p.stockAlmacen <= 0 ? 'clay' : p.requiereReorden ? 'amber' : 'pine'">{{ p.stockAlmacen <= 0 ? 'Agotado' : p.requiereReorden ? 'Reabastecer' : 'Disponible' }}</span></td>
              <td class="row-action"><button v-if="auth.esAdmin" class="crm-button" :aria-label="`Editar ${p.nombre}`" @click.stop="editar(p.id)"><CrmIcon name="bag" />Editar</button><span v-else class="readonly-label">Consulta</span></td>
            </tr>
            <tr v-if="abierto === p.id" class="inventory-detail"><td colspan="5"><section :id="`inventory-detail-${p.id}`" role="region" :aria-label="`Detalles de ${p.nombre}`" class="detail-content">
              <dl class="detail-grid"><div><dt>Código de barras</dt><dd>{{ p.codigoBarras || 'Sin código registrado' }}</dd></div><div><dt>Categoría</dt><dd>{{ p.categoria || 'Sin categoría' }}</dd></div><div><dt>Costo promedio por {{ unidadSingular(p) }}</dt><dd>{{ money(p.costoPromedio) }}</dd></div><div><dt>Margen bruto</dt><dd>{{ margen(p) }}%</dd></div><div><dt>Existencias mínimas</dt><dd>{{ fmt(p.stockMinimo) }} {{ unidad(p) }}</dd></div><div><dt>Existencias deseadas después de reabastecer</dt><dd>{{ fmt(p.stockObjetivo) }} {{ unidad(p) }}</dd></div></dl>
              <p v-if="p.vendePorCaja" class="box-detail"><CrmIcon name="box" />Venta por caja de {{ fmt(p.piezasPorCaja) }} unidades: <strong>{{ money(p.precioCaja) }}</strong></p>
              <p v-if="p.requiereReorden" class="reorder-detail">Compra sugerida: <strong>{{ fmt(Math.max(0, p.cantidadSugeridaReorden || 0)) }} {{ unidad(p) }}</strong>. Es la cantidad para alcanzar las existencias deseadas.</p>
              <div class="detail-actions"><a v-if="p.requiereReorden && p.proveedorWhatsapp" :href="whatsappUrl(p)" target="_blank" rel="noopener noreferrer" class="crm-button"><CrmIcon name="message" />Solicitar reorden por WhatsApp</a><button v-else-if="p.requiereReorden && p.proveedorId" class="crm-button" @click="irAProveedor(p)">Configurar WhatsApp del proveedor</button><button v-if="auth.esAdmin" class="crm-button primary" @click="editar(p.id)">Editar producto</button></div>
            </section></td></tr>
          </tbody>
        </table>
      </div>
      <div v-if="!error" class="inventory-footer"><span aria-live="polite">{{ total ? (pagina - 1) * tamano + 1 : 0 }}–{{ Math.min(pagina * tamano, total) }} de {{ total }} productos</span><nav class="pager" aria-label="Páginas de inventario"><button :disabled="cargando || pagina <= 1" aria-label="Página anterior" @click="pagina--"><CrmIcon name="back" /></button><button v-for="n in paginasVisibles" :key="n" :disabled="cargando" :aria-label="`Página ${n}`" :aria-current="pagina === n ? 'page' : undefined" @click="pagina = n">{{ n }}</button><button :disabled="cargando || pagina >= totalPaginas" aria-label="Página siguiente" @click="pagina++"><CrmIcon name="arrow" /></button></nav></div>
    </section>
    <details class="inventory-guide"><summary><CrmIcon name="help" />Cómo leer el inventario y el reorden</summary><p>Las existencias corresponden al almacén. Los productos autorizados para una carga se descuentan de aquí y lo devuelto al cerrar la carga regresa al almacén.</p><p>El mínimo activa una alerta cuando las existencias llegan a esa cantidad o bajan de ella. Las existencias deseadas indican lo que quieres tener después de comprar. Si tienes 4 y deseas 20, la compra sugerida es 16.</p><p>Las cajas de venta contienen el número de unidades indicado en cada producto. Las piezas y los kilogramos se cuentan por separado.</p><router-link to="/panel/alertas-stock">Ver todas las alertas de stock</router-link></details>
    <CrmDialog :open="edicion !== null" :dismissible="false" wide labelledby="inventory-edit-title"><template v-if="edicion !== null"><div class="crm-dialog-head"><h2 id="inventory-edit-title">Editar producto</h2><button class="crm-button" :disabled="editorOcupado" aria-label="Cerrar edición" @click="cerrarEditor"><CrmIcon name="close" /></button></div><ProductoEditorView :key="edicion" :producto-id="edicion" en-modal @guardado="productoGuardado" @ocupado="editorOcupado = $event" /><div class="crm-dialog-actions"><button class="crm-button" :disabled="editorOcupado" @click="cerrarEditor">Cancelar</button></div></template></CrmDialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import http from '@/api/http'
import CrmIcon from '@/components/CrmIcon.vue'
import CrmDialog from '@/components/CrmDialog.vue'
import { useBusqueda } from '@/composables/useBusqueda'
import { useAuthStore } from '@/stores/auth'
const ProductoEditorView = defineAsyncComponent(() => import('@/views/admin/ProductoEditorView.vue'))
const emit = defineEmits(['ctx'])
const auth = useAuthStore(), route = useRoute(), router = useRouter()
const items = ref([]), total = ref(0), pagina = ref(1), cargando = ref(true), error = ref('')
const resumen = ref(null), cargandoResumen = ref(true), errorResumen = ref(''), abierto = ref(null)
const edicion = ref(null), editorOcupado = ref(false), aviso = ref(''), tabActiva = ref('todos')
const resumenAbierto = ref(false)
const { buscar, termino, listo } = useBusqueda(String(route.query.buscar || ''))
const tamano = 20
let controller, resumenController, solicitud = 0, resumenSolicitud = 0, disposed = false
const tabs = [{ k: 'todos', label: 'Todos' }, { k: 'reorden', label: 'Requieren reorden', icono: 'alert', conteo: 'requierenReorden' }, { k: 'agotados', label: 'Agotados', icono: 'close', conteo: 'agotados' }, { k: 'caja', label: 'Por caja', icono: 'box', conteo: 'porCaja' }]
const totalPaginas = computed(() => Math.max(1, Math.ceil(total.value / tamano)))
const paginasVisibles = computed(() => { const inicio = Math.max(1, Math.min(pagina.value - 2, totalPaginas.value - 4)); return Array.from({ length: Math.min(5, totalPaginas.value) }, (_, i) => inicio + i) })
const money = n => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt = n => Number(n || 0).toLocaleString('es-MX')
const unidad = p => ({ Pieza: 'piezas', Peso: 'kg', Caja: 'cajas' }[p.unidad] || 'unidades')
const unidadSingular = p => ({ Pieza: 'pieza', Peso: 'kg', Caja: 'caja' }[p.unidad] || 'unidad')
const margen = p => Number(p.precioVenta) > 0 ? ((Number(p.precioVenta) - Number(p.costoPromedio)) / Number(p.precioVenta) * 100).toFixed(1) : '0.0'
const cantidadesGlobales = computed(() => !resumen.value ? '' : [[resumen.value.piezas, 'piezas'], [resumen.value.kilogramos, 'kg'], [resumen.value.cajas, 'cajas']].filter(([n]) => n > 0).map(([n, u]) => `${fmt(n)} ${u}`).join(' · ') || 'Sin existencias en almacén')
function alternar(id) { abierto.value = abierto.value === id ? null : id }
function editar(id) { if (auth.esAdmin) { edicion.value = id; editorOcupado.value = false } }
function cerrarEditor() { if (!editorOcupado.value) edicion.value = null }
function irAProveedor(p) { router.push(`/panel/proveedor/${p.proveedorId}`) }
function whatsappUrl(p) { const texto = `Hola, solicito reorden de ${fmt(Math.max(0, p.cantidadSugeridaReorden || 0))} ${unidad(p)} de ${p.nombre}.`; return `https://wa.me/${String(p.proveedorWhatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(texto)}` }
function limpiarFiltros() { buscar.value = ''; tabActiva.value = 'todos' }
async function cargarPagina() {
  const current = ++solicitud
  controller?.abort(); controller = new AbortController(); cargando.value = true; error.value = ''
  try {
    const { data } = await http.get('/productos', { params: { pagina: pagina.value, tamano, buscar: termino.value || undefined, filtro: tabActiva.value }, signal: controller.signal })
    if (disposed || current !== solicitud) return
    if (!Array.isArray(data.items) || !Number.isInteger(data.total) || data.pagina !== pagina.value || data.tamanoPagina !== tamano) throw new Error('Respuesta de inventario inválida')
    total.value = data.total
    if (pagina.value > totalPaginas.value) { pagina.value = totalPaginas.value; return }
    items.value = data.items; abierto.value = null
  } catch (e) { if (!disposed && current === solicitud && e.code !== 'ERR_CANCELED') { items.value = []; error.value = e.response?.data?.mensaje || 'Revisa tu conexión y vuelve a intentar.' } }
  finally { if (!disposed && current === solicitud) cargando.value = false }
}
async function cargarResumen() {
  const current = ++resumenSolicitud
  resumenController?.abort(); resumenController = new AbortController(); cargandoResumen.value = true; errorResumen.value = ''
  try {
    const { data } = await http.get('/productos/resumen', { signal: resumenController.signal })
    if (disposed || current !== resumenSolicitud) return
    if (!Number.isInteger(data.totalProductos)) throw new Error('Respuesta de resumen inválida')
    resumen.value = data
  } catch (e) { if (!disposed && current === resumenSolicitud && e.code !== 'ERR_CANCELED') errorResumen.value = 'No se pudo actualizar el resumen global.' }
  finally { if (!disposed && current === resumenSolicitud) cargandoResumen.value = false }
}
function actualizar() { return Promise.all([cargarPagina(), cargarResumen()]) }
async function productoGuardado() { edicion.value = null; editorOcupado.value = false; aviso.value = 'Producto actualizado. Se conservaron tu búsqueda y página.'; await actualizar() }
watch(pagina, cargarPagina)
watch([termino, tabActiva], () => { if (pagina.value !== 1) pagina.value = 1; else cargarPagina() })
watch(() => route.query.buscar, value => { buscar.value = String(value || '') })
onMounted(() => { emit('ctx', { titulo: 'Inventario', sub: 'Consulta por páginas y despliega cada producto para ver sus detalles.', back: null, acciones: { boton: { texto: 'Nuevo producto', to: '/panel/producto/nuevo' } } }); actualizar() })
onBeforeUnmount(() => { disposed = true; controller?.abort(); resumenController?.abort() })
</script>

<style scoped>
.inventario-page{display:flex;flex-direction:column;gap:14px;min-width:0}.inventory-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.summary-card{padding:18px;background:var(--surface);border:1px solid var(--line);border-radius:14px;display:grid;gap:8px;min-width:0}.summary-card>span{font-size:12px;font-weight:700;color:var(--ink-soft)}.summary-card strong{font-size:26px;font-family:"Bricolage Grotesque";overflow-wrap:anywhere}.summary-card small,.summary-scope{color:var(--ink-soft);font-size:12px;line-height:1.5}.summary-scope{margin:0}.summary-error{margin:0;color:var(--clay);display:flex;gap:10px;align-items:center;flex-wrap:wrap}.saved-note{padding:12px;border-radius:10px;background:var(--pine-tint);color:var(--pine);display:flex;align-items:center;gap:8px;margin:0}
.inventory-panel{border:1px solid var(--line);border-radius:16px;background:var(--surface);overflow:hidden;min-width:0}.inventory-toolbar{padding:20px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:start}.crm-field{min-width:0}.crm-field>small{font-size:12px;line-height:1.5;color:var(--ink-soft)}.search-box{display:flex;align-items:center;gap:9px;border:1px solid var(--line);border-radius:10px;padding:0 12px;min-height:46px;margin:8px 0}.search-box input{border:0;outline:none;background:transparent;min-width:0;width:100%;min-height:44px;font:inherit;font-size:16px;color:var(--ink)}.clear-search{display:grid;place-items:center;border:0;background:transparent;color:var(--ink-soft);width:44px;height:44px;flex:none;cursor:pointer}.refresh{align-self:start;margin-top:26px}.inventory-filters{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:8px}.inventory-filters button{display:flex;align-items:center;gap:7px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink-soft);font:inherit;font-size:13px;font-weight:700;padding:9px 12px;min-height:44px;cursor:pointer}.inventory-filters button.active{background:var(--pine-tint);color:var(--pine);border-color:var(--pine)}.inventory-filters button span{font-size:11px;background:var(--paper-2);padding:2px 6px;border-radius:6px}.inventory-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;border-block:1px solid var(--line)}.inventory-heading h2{font-size:17px;margin:0}.inventory-heading small{font-size:12px;color:var(--ink-soft)}
.inventory-table{width:100%;border-collapse:collapse;text-align:left;font-size:13px}.inventory-table th{background:var(--paper);font-size:11px;color:var(--ink-soft);padding:12px 16px;font-weight:700}.inventory-row{cursor:pointer}.inventory-row:hover{background:var(--pine-tint)}.inventory-table td{padding:16px;border-bottom:1px solid var(--line);vertical-align:middle}.inventory-table td small{display:block;margin-top:5px;font-size:11px;color:var(--ink-soft)}.product-cell{width:40%;max-width:380px}.product-toggle{display:flex;align-items:center;gap:10px;width:100%;border:0;background:transparent;font:inherit;color:var(--ink);text-align:left;padding:0;min-height:44px;cursor:pointer}.product-toggle>span{flex:1;min-width:0}.product-toggle strong{overflow-wrap:anywhere;font-size:14px}.product-toggle>svg:first-child{color:var(--pine)}.shortage{color:var(--clay)}.row-action{text-align:right}.readonly-label{font-size:12px;color:var(--ink-soft)}.inventory-detail>td{padding:0;background:var(--paper)}.detail-content{padding:20px}.detail-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin:0}.detail-grid div{min-width:0}.detail-grid dt{font-size:12px;color:var(--ink-soft);margin-bottom:6px;line-height:1.5}.detail-grid dd{font-size:14px;font-weight:700;margin:0;overflow-wrap:anywhere}.box-detail,.reorder-detail{margin:16px 0 0;font-size:13px;line-height:1.6}.box-detail{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.detail-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.inventory-footer{padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:14px;font-size:12px;color:var(--ink-soft)}.pager{display:flex;gap:6px}.pager button{display:grid;place-items:center;min-width:40px;min-height:44px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--pine);font:inherit;cursor:pointer}.pager button[aria-current=page]{background:var(--pine);color:white}.pager button:disabled{opacity:.45;cursor:default}.inventory-guide{border:1px solid var(--line);border-radius:14px;background:var(--surface);padding:16px;font-size:13px;line-height:1.7}.inventory-guide summary{font-weight:700;cursor:pointer}.inventory-guide summary svg{margin-right:6px}.inventory-guide p{margin:12px 0}.inventory-guide a{color:var(--pine);text-decoration:underline}.inventory-panel :focus-visible,.inventory-guide :focus-visible{outline:3px solid var(--sky);outline-offset:3px}
.summary-toggle{display:none}
@media(max-width:1100px){.inventory-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.inventory-table th,.inventory-table td{padding-inline:12px}}
@media(max-width:1024px){.summary-toggle{display:flex;justify-content:space-between}.inventory-summary{display:none}.inventory-summary.mobile-open{display:grid}}
@media(max-width:1024px){.inventory-table,.inventory-table-wrap{display:block;width:100%;min-width:0}.inventory-table thead{display:none}.inventory-table{padding:14px}.inventory-group{display:block;border:1px solid var(--line);border-radius:14px;overflow:hidden;margin-bottom:16px;box-shadow:var(--shadow)}.inventory-group:last-child{margin-bottom:0}.inventory-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;padding:16px}.inventory-table td{border:0;padding:0;min-width:0}.product-cell{grid-column:1/-1;width:auto;max-width:none;padding-bottom:14px!important;border-bottom:1px solid var(--line)!important}.inventory-row td[data-label]::before{content:attr(data-label);display:block;font-size:11px;color:var(--ink-soft);margin-bottom:7px}.row-action{text-align:right;align-self:end}.inventory-detail{display:block}.inventory-detail>td{display:block;padding:0;border-top:1px solid var(--line)}.detail-content{padding:16px}.detail-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.inventory-heading{align-items:start;flex-direction:column;gap:6px}.inventory-footer{flex-direction:column;align-items:stretch}.pager{justify-content:center;flex-wrap:wrap}}
@media(max-width:480px){.inventory-toolbar{padding:16px;grid-template-columns:minmax(0,1fr)}.refresh{margin:0;justify-self:start}.summary-card{padding:14px}.summary-card strong{font-size:23px}.inventory-filters button{padding-inline:9px;font-size:12px}.detail-grid{grid-template-columns:1fr}.detail-actions .crm-button{width:100%;justify-content:center}.inventory-footer{padding:14px}.pager{gap:4px}.pager button{min-width:34px}.inventory-table{padding:10px}.inventory-row{padding:14px;gap:12px}}
@media(max-width:360px){.inventory-summary{grid-template-columns:1fr}.pager button{min-width:30px}}
</style>
