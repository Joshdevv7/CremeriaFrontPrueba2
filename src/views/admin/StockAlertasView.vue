<template>
  <div class="stock-page crm-page">
    <section class="stock-panel" aria-labelledby="stock-heading">
      <div class="stock-intro">
        <div><h2 id="stock-heading"><CrmIcon name="alert" /> Alertas de stock</h2><p>Productos en el mínimo o por debajo. Revisa la cantidad sugerida antes de comprar.</p></div>
        <button class="crm-button" type="button" :disabled="cargando" @click="cargar"><CrmIcon name="box" />Actualizar</button>
      </div>
      <div class="stock-search">
        <label for="stock-search">Buscar producto, código o proveedor</label>
        <div class="search-field"><CrmIcon name="search" /><input id="stock-search" v-model="buscar" type="search" placeholder="Escribe al menos 3 caracteres" aria-describedby="stock-search-help" /></div>
        <p id="stock-search-help">La búsqueda incluye todas las alertas cargadas.<span v-if="buscar.trim() && !listo"> Escribe al menos 3 caracteres para filtrar.</span></p>
      </div>
      <div v-if="cargando" class="crm-state" role="status">Cargando alertas de stock…</div>
      <div v-else-if="error" class="crm-state" role="alert"><h3>No se pudieron cargar las alertas</h3><p>{{ error }}</p><button class="crm-button" @click="cargar">Reintentar</button></div>
      <div v-else-if="!filtradas.length" class="crm-state"><h3>{{ termino ? 'No hay coincidencias' : 'Sin alertas de stock' }}</h3><p>{{ termino ? 'Prueba otro producto, código o proveedor.' : 'Las existencias están por encima del mínimo configurado.' }}</p><button v-if="buscar" class="crm-button" @click="buscar = ''">Limpiar búsqueda</button></div>
      <div v-else class="table-wrap">
        <table><caption class="crm-sr-only">Productos que necesitan reabastecimiento</caption><thead><tr><th>Producto</th><th>Disponibles</th><th>Mínimo</th><th>Cantidad deseada</th><th>Compra sugerida</th><th>Proveedor</th><th><span class="crm-sr-only">Contacto</span></th></tr></thead><tbody>
          <tr v-for="p in visibles" :key="p.id">
            <td data-label="Producto"><strong>{{ p.nombre }}</strong><small>{{ p.codigoBarras || 'Sin código' }} · {{ unidad(p) }}</small></td>
            <td data-label="Disponibles"><span class="crm-badge amber">{{ fmt(p.stockAlmacen) }} {{ unidad(p) }}</span></td>
            <td data-label="Mínimo">{{ fmt(p.stockMinimo) }} {{ unidad(p) }}</td>
            <td data-label="Cantidad deseada">{{ fmt(p.stockObjetivo) }} {{ unidad(p) }}</td>
            <td data-label="Compra sugerida"><strong>{{ fmt(p.cantidadSugeridaReorden) }} {{ unidad(p) }}</strong></td>
            <td data-label="Proveedor">{{ p.proveedorNombre || 'Sin proveedor asignado' }}</td>
            <td class="row-actions"><a v-if="p.proveedorWhatsapp" class="crm-button contact" :href="whatsappUrl(p)" target="_blank" rel="noopener noreferrer" :aria-label="`Contactar por WhatsApp al proveedor de ${p.nombre}`"><CrmIcon name="message" />WhatsApp</a><span v-else class="no-contact">{{ p.proveedorNombre ? 'Sin WhatsApp' : 'Sin contacto' }}</span></td>
          </tr>
        </tbody></table>
      </div>
      <div v-if="!cargando && !error" class="table-footer">
        <span aria-live="polite">{{ filtradas.length ? (pagina - 1) * tamano + 1 : 0 }}–{{ Math.min(pagina * tamano, filtradas.length) }} de {{ filtradas.length }} alertas<span v-if="termino"> · {{ productos.length }} en total</span></span>
        <nav class="pager" aria-label="Páginas de alertas de stock">
          <button :disabled="pagina <= 1" aria-label="Página anterior" @click="pagina--"><CrmIcon name="back" /></button>
          <span>Página {{ pagina }} de {{ totalPaginas }}</span>
          <button :disabled="pagina >= totalPaginas" aria-label="Página siguiente" @click="pagina++"><CrmIcon name="arrow" /></button>
        </nav>
      </div>
    </section>
    <p class="stock-note"><CrmIcon name="help" />La compra sugerida es la cantidad deseada menos las existencias actuales, con mínimo de cero. Contactar al proveedor abre WhatsApp; revisa y envía el mensaje allí.</p>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import CrmIcon from '@/components/CrmIcon.vue'
import { listarPaginas } from '@/api/listarPaginas'
import { coincideBusqueda, useBusqueda } from '@/composables/useBusqueda'

const emit = defineEmits(['ctx'])
const productos = ref([]), cargando = ref(true), error = ref(''), pagina = ref(1)
const { buscar, termino, listo } = useBusqueda()
const tamano = 10
const filtradas = computed(() => productos.value.filter(p => coincideBusqueda(termino.value, p.nombre, p.codigoBarras, p.proveedorNombre)))
const totalPaginas = computed(() => Math.max(1, Math.ceil(filtradas.value.length / tamano)))
const visibles = computed(() => filtradas.value.slice((pagina.value - 1) * tamano, pagina.value * tamano))
const fmt = value => Number(value || 0).toLocaleString('es-MX')
const unidad = p => ({ Pieza: 'piezas', Peso: 'kg', Caja: 'cajas' }[p.unidad] || 'unidades')
function whatsappUrl(p) {
  const texto = `Hola, necesito surtir ${fmt(p.cantidadSugeridaReorden)} ${unidad(p)} de ${p.nombre}.`
  return `https://wa.me/${String(p.proveedorWhatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`
}
async function cargar() {
  cargando.value = true; error.value = ''
  try { productos.value = await listarPaginas('/productos', { soloReorden: true }); pagina.value = 1 }
  catch (e) { error.value = e.response?.data?.mensaje || 'Revisa tu conexión y vuelve a intentar.' }
  finally { cargando.value = false }
}
watch(termino, () => { pagina.value = 1 })
onMounted(() => {
  emit('ctx', { titulo: 'Alertas de stock', sub: 'Busca y revisa los productos por reabastecer.', back: '/panel/productos' })
  cargar()
})
</script>

<style scoped>
.stock-page { min-width: 0; }
.stock-panel { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; box-shadow: var(--shadow); }
.stock-intro { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 20px; }
h2 { display: flex; align-items: center; gap: 9px; font-size: 18px; margin: 0; }
.stock-intro p { margin: 8px 0 0; font-size: 13px; line-height: 1.5; color: var(--ink-soft); }
.stock-search { padding: 0 20px 18px; }
.stock-search label { display: block; font-size: 13px; font-weight: 700; margin-bottom: 8px; }
.search-field { display: flex; align-items: center; gap: 10px; max-width: 540px; background: var(--paper); border: 1px solid var(--line); border-radius: 11px; padding: 0 12px; }
.search-field input { width: 100%; min-width: 0; min-height: 44px; color: var(--ink); font: inherit; font-size: 14px; border: none; background: transparent; }
.stock-search p { font-size: 12px; color: var(--ink-soft); margin: 8px 0 0; line-height: 1.5; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
th { font-size: 11px; font-weight: 700; color: var(--ink-soft); background: var(--paper); }
th, td { padding: 15px 14px; border-bottom: 1px solid var(--line); }
td { overflow-wrap: anywhere; }
td:first-child { max-width: 250px; }
td small { display: block; margin-top: 5px; font-size: 11px; color: var(--ink-soft); }
.crm-badge { white-space: nowrap; }
.contact { text-decoration: none; white-space: nowrap; font-size: 12px; }
.no-contact { color: var(--ink-soft); font-size: 12px; }
.table-footer { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 14px; font-size: 12px; color: var(--ink-soft); }
.pager { display: flex; align-items: center; gap: 12px; }
.pager button { display: grid; place-items: center; width: 44px; min-height: 44px; border: 1px solid var(--line); background: var(--surface); color: var(--pine); border-radius: 10px; cursor: pointer; }
.pager button:disabled { opacity: .4; cursor: default; }
.stock-note { display: flex; align-items: flex-start; gap: 10px; margin-top: 16px; color: var(--ink-soft); font-size: 12px; line-height: 1.6; }
button:focus-visible, a:focus-visible, input:focus-visible { outline: 3px solid var(--sky, #2E6F8E); outline-offset: 2px; }
@media (max-width: 760px) {
  .stock-intro { flex-wrap: wrap; padding: 16px; }
  .stock-search { padding: 0 16px 16px; }
  .table-wrap { overflow: visible; }
  table, tbody { display: block; }
  thead { display: none; }
  tr { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; margin: 0 12px 12px; padding: 14px; border: 1px solid var(--line); border-radius: 12px; }
  td { display: block; border: none; padding: 0; min-width: 0; }
  td:first-child { max-width: none; grid-column: 1 / -1; font-size: 15px; }
  td::before { content: attr(data-label); display: block; font-size: 11px; margin-bottom: 6px; font-weight: 600; color: var(--ink-soft); }
  td:first-child::before, .row-actions::before { display: none; }
  td:nth-child(6), .row-actions { grid-column: 1 / -1; }
  .row-actions .contact { width: 100%; box-sizing: border-box; justify-content: center; }
  .table-footer { padding: 16px; flex-direction: column; align-items: flex-start; }
  .pager { width: 100%; justify-content: space-between; }
  .crm-badge { white-space: normal; }
}
</style>
