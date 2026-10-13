<template>
  <div class="orders crm-page">
    <div class="quick-action"><button class="crm-button" @click="pago = 'Pendiente'"><CrmIcon name="cash" />Ver pagos pendientes</button></div>
    <section class="stats" aria-label="Resumen de los pedidos visibles" :aria-busy="cargando">
      <div class="stat"><div class="stat-label">Pedidos visibles<CrmIcon name="bag" /></div><strong>{{ cargando ? '—' : itemsFiltrados.length }}</strong><small>Registros visibles en esta página</small></div>
      <div class="stat"><div class="stat-label">Por entregar<CrmIcon name="truck" /></div><strong>{{ cargando ? '—' : porEntregar.length }}</strong><small>Abiertos y en ruta en esta página</small></div>
      <div class="stat attention"><div class="stat-label">Pagos pendientes<CrmIcon name="clock" /></div><strong>{{ cargando ? '—' : pendientesPago.length }}</strong><small>Importe: {{ money(montoPendiente) }} MXN</small></div>
      <div class="stat"><div class="stat-label">Importe visible<CrmIcon name="cash" /></div><strong class="stat-money">{{ cargando ? '—' : money(montoVisible) }}</strong><small>MXN · Sin pedidos cancelados</small></div>
    </section>
    <section class="orders-panel" aria-labelledby="orders-heading">
      <div class="filters"><div class="filter-title"><h2><CrmIcon name="filter" />Filtros de pedidos</h2><button class="clear-filters" @click="limpiarFiltros">Limpiar filtros</button></div><div class="filter-grid">
        <div class="crm-field"><label for="order-search">Cliente o folio</label><div class="search-field"><CrmIcon name="search" /><input id="order-search" v-model="buscarTexto" type="search" placeholder="Buscar en esta página" /></div></div>
        <div class="crm-field"><label for="order-delivery">Entrega</label><select id="order-delivery" v-model="estado"><option :value="null">Todas</option><option v-for="e in estados" :key="e.v" :value="e.v">{{ e.t }}</option></select></div>
        <div class="crm-field"><label for="order-payment">Pago del pedido</label><select id="order-payment" v-model="pago"><option :value="null">Todos</option><option value="Pendiente">Pendiente</option><option value="Pagado">Pagado / a crédito</option></select></div>
        <div class="crm-field"><label for="order-origin">Origen</label><select id="order-origin" v-model="origen"><option :value="null">Todos</option><option :value="false">Preventa</option><option :value="true">Venta libre</option></select></div>
        <div class="crm-field"><label for="order-driver">Repartidor</label><select id="order-driver" v-model="repartidorId"><option :value="null">Todos</option><option v-for="r in repartidores" :key="r.id" :value="r.id">{{ r.nombre }}</option></select></div>
        <div class="crm-field"><label for="order-customer">Cliente</label><select id="order-customer" v-model="clienteId"><option :value="null">Todos</option><option v-for="c in clientes" :key="c.id" :value="c.id">{{ c.nombre }}</option></select></div>
      </div><p v-if="catalogoError" class="catalog-error" role="status">{{ catalogoError }} <button @click="cargarCatalogos">Reintentar catálogos</button></p></div>
      <div class="table-heading"><h2 id="orders-heading">Lista de pedidos <span>{{ itemsFiltrados.length }}</span></h2><small>Importes en MXN · Alcance de esta página</small></div>
      <div v-if="cargando" class="crm-state" role="status">Cargando pedidos…</div>
      <div v-else-if="error" class="crm-state error" role="alert"><h2>No se pudieron cargar los pedidos</h2><p>{{ error }}</p><button class="crm-button" @click="cargar">Reintentar</button></div>
      <div v-else-if="!itemsFiltrados.length" class="crm-state"><h2>{{ buscarTexto ? 'Sin coincidencias en esta página' : 'No hay pedidos con estos filtros' }}</h2><p>{{ buscarTexto ? 'Prueba otro cliente o folio. La búsqueda no incluye otras páginas.' : 'Cambia los filtros o vuelve a consultar.' }}</p><button class="crm-button" @click="limpiarFiltros">Limpiar filtros</button></div>
      <div v-else class="table-wrap"><table><thead><tr><th>Pedido / cliente</th><th>Entrega</th><th>Pago del pedido</th><th>Origen</th><th>Repartidor</th><th class="money-col">Total</th><th><span class="crm-sr-only">Acciones</span></th></tr></thead><tbody><tr v-for="p in itemsFiltrados" :key="p.id" :class="{ canceled: p.estado === 'Cancelado' }">
        <td data-label="Pedido / cliente"><div class="customer"><span class="folio">#{{ p.id }}</span> {{ p.clienteNombreMostrar || p.clienteNombre }}</div><small>{{ fecha(p.fecha) }}</small><p v-if="p.estado === 'Cancelado'" class="cancel-reason">{{ p.canceladoPorNombre ? `Cancelada por ${p.canceladoPorNombre}. ` : '' }}{{ p.motivoCancelacion || 'Sin motivo registrado' }}</p></td>
        <td data-label="Entrega"><span class="crm-badge" :class="deliveryTone(p.estado)">{{ deliveryLabel(p.estado) }}</span></td>
        <td data-label="Pago del pedido"><span v-if="sinCobro(p)" class="not-confirmed">{{ p.estado === 'Cancelado' || p.estado === 'CerradoNoEntregado' ? 'No aplica' : 'Por definir al entregar' }}</span><template v-else><span class="crm-badge" :class="p.estadoPago === 'Pendiente' ? 'amber' : 'pine'">{{ textoPago(p) }}</span><small v-if="p.metodoPago === 'Credito'" class="credit-note">Consultar saldo del cliente</small></template></td>
        <td data-label="Origen">{{ p.esVentaLibre ? 'Venta libre' : 'Preventa' }}<small>{{ p.esVentaLibre ? 'Mostrador / ruta' : 'Pedido previo' }}</small></td>
        <td data-label="Repartidor"><span :class="{ unassigned: !p.repartidorNombre }">{{ p.repartidorNombre || 'Sin asignar' }}</span></td>
        <td data-label="Total" class="money-col"><strong>{{ money(p.total) }}</strong></td>
        <td class="row-actions"><button class="detail-button" :aria-label="`Ver detalle del pedido ${p.id}`" @click="detallePedido = p">Ver detalle</button><button v-if="p.estado === 'Abierto'" class="icon-action" :aria-label="`Editar pedido ${p.id}`" @click="editar(p.id)"><CrmIcon name="bag" /></button><button v-if="puedeCobrar(p)" class="icon-action" :aria-label="`Registrar pago del pedido ${p.id}`" @click="abrirPago(p)"><CrmIcon name="cash" /></button><button v-if="p.estado === 'Abierto'" class="icon-action danger" :aria-label="`Eliminar pedido ${p.id}`" @click="eliminar(p)"><CrmIcon name="trash" /></button></td>
      </tr></tbody></table></div>
      <div class="table-footer"><span aria-live="polite">{{ itemsFiltrados.length }} visibles · {{ total }} en la consulta · Página {{ pagina }} de {{ totalPaginas }}</span><nav aria-label="Páginas de pedidos" class="pager"><button :disabled="cargando || pagina <= 1" aria-label="Página anterior" @click="irPagina(pagina - 1)"><CrmIcon name="back" /></button><button v-for="n in paginasVisibles" :key="n" :class="{ current: pagina === n }" :aria-current="pagina === n ? 'page' : undefined" :disabled="cargando" :aria-label="`Página ${n}`" @click="irPagina(n)">{{ n }}</button><button :disabled="cargando || pagina >= totalPaginas" aria-label="Página siguiente" @click="irPagina(pagina + 1)"><CrmIcon name="arrow" /></button></nav></div>
    </section>
    <p class="scope-note">Indicadores de la página visible. En pedidos abiertos, el total es lo solicitado; en cerrados, lo entregado. El pago del pedido no indica el saldo de crédito del cliente.</p>
    <details class="order-guide"><summary><CrmIcon name="help" />Entender estados de entrega y pago</summary><p>Entrega y pago son independientes. Los pedidos abiertos se pueden editar o eliminar. Venta libre incluye mostrador y ruta. Una venta a crédito puede conservar saldo por cobrar: revísalo en Clientes. Registrar pago conserva el método que ya tiene el pedido.</p></details>
    <CrmDialog :open="!!detallePedido" labelledby="order-detail-title" @close="detallePedido = null"><template v-if="detallePedido"><div class="crm-dialog-head"><div><h2 id="order-detail-title">Pedido #{{ detallePedido.id }}</h2><p>{{ detallePedido.clienteNombreMostrar || detallePedido.clienteNombre }}</p></div><button class="crm-button crm-close" aria-label="Cerrar detalle" data-initial-focus @click="detallePedido = null"><CrmIcon name="close" /></button></div><dl class="order-details"><div><dt>Entrega</dt><dd>{{ deliveryLabel(detallePedido.estado) }}</dd></div><div><dt>Pago del pedido</dt><dd>{{ sinCobro(detallePedido) ? 'Sin cobro confirmado' : textoPago(detallePedido) }}</dd></div><div><dt>Método registrado</dt><dd>{{ metodoTexto(detallePedido.metodoPago) }}</dd></div><div><dt>Origen</dt><dd>{{ detallePedido.esVentaLibre ? 'Venta libre · mostrador / ruta' : 'Preventa' }}</dd></div><div><dt>Repartidor</dt><dd>{{ detallePedido.repartidorNombre || 'Sin asignar' }}</dd></div><div><dt>Total {{ detallePedido.estado === 'Abierto' ? 'solicitado' : 'del pedido' }}</dt><dd>{{ money(detallePedido.total) }} MXN</dd></div></dl><p v-if="detallePedido.metodoPago === 'Credito'" class="credit-explanation">Saldo de crédito no disponible en esta consulta. Revisa la cuenta del cliente.</p><div class="crm-dialog-actions"><button class="crm-button" @click="detallePedido = null">Volver</button></div></template></CrmDialog>
    <CrmDialog :open="!!pagoModal" :dismissible="!pagoGuardando" labelledby="payment-title" describedby="payment-description" @close="cerrarPago"><template v-if="pagoModal"><div class="crm-dialog-head"><div><h2 id="payment-title">Registrar pago de pedido</h2><p id="payment-description">{{ pagoModal.clienteNombreMostrar || pagoModal.clienteNombre }} · {{ money(pagoModal.total) }} MXN</p></div><button class="crm-button crm-close" :disabled="pagoGuardando" aria-label="Cerrar registro de pago" @click="cerrarPago"><CrmIcon name="close" /></button></div><form @submit.prevent="guardarPago"><p class="payment-method">Método registrado: <strong>{{ metodoTexto(pagoModal.metodoPago) }}</strong><small>El registro de pago conserva este método.</small></p><div class="crm-field"><label for="payment-reference">Folio o referencia (opcional)</label><input id="payment-reference" v-model="pagoFolio" data-initial-focus maxlength="60" :disabled="pagoGuardando" placeholder="Folio del comprobante" /></div><p v-if="pagoError" class="payment-error" role="alert">{{ pagoError }}</p><div class="crm-dialog-actions"><button class="crm-button" type="button" :disabled="pagoGuardando" @click="cerrarPago">Cancelar</button><button class="crm-button primary" type="submit" :disabled="pagoGuardando">{{ pagoGuardando ? 'Guardando…' : 'Registrar pago' }}</button></div></form></template></CrmDialog>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import http from '@/api/http'
import { confirmar } from '@/composables/useConfirm'
import CrmIcon from '@/components/CrmIcon.vue'
import CrmDialog from '@/components/CrmDialog.vue'
import { formatMxn as money, deliveryLabel, deliveryTone } from '@/utils/crmPresentation'
const emit = defineEmits(['ctx'])
const router = useRouter()
const items = ref([]), cargando = ref(true), error = ref(''), catalogoError = ref('')
const estado = ref(null), pago = ref(null), origen = ref(null), clienteId = ref(null), repartidorId = ref(null), buscarTexto = ref('')
const clientes = ref([]), repartidores = ref([]), pagina = ref(1), total = ref(0)
const tamano = 20
const pagoModal = ref(null), pagoFolio = ref(''), pagoGuardando = ref(false), pagoError = ref(''), detallePedido = ref(null)
let solicitud = 0, controller, catalogController, disposed = false
const estados = [{ v:'Abierto',t:'Abierto' },{ v:'EnRuta',t:'En ruta' },{ v:'CerradoCompleto',t:'Completa' },{ v:'CerradoParcial',t:'Parcial' },{ v:'CerradoNoEntregado',t:'No entregado' },{ v:'Cancelado',t:'Cancelada' }]
const totalPaginas = computed(() => Math.max(1, Math.ceil(total.value / tamano)))
const paginasVisibles = computed(() => { const start = Math.max(1, Math.min(pagina.value - 2, totalPaginas.value - 4)); return Array.from({ length:Math.min(5,totalPaginas.value) },(_,i)=>start+i) })
const itemsFiltrados = computed(() => { const q=buscarTexto.value.trim().toLocaleLowerCase('es-MX'); return items.value.filter(p => !q || `${p.id} ${p.clienteNombreMostrar || p.clienteNombre || ''}`.toLocaleLowerCase('es-MX').includes(q)) })
const porEntregar = computed(() => itemsFiltrados.value.filter(p => ['Abierto','EnRuta'].includes(p.estado)))
const sinCobro = p => ['Abierto','EnRuta','Cancelado','CerradoNoEntregado'].includes(p.estado)
const puedeCobrar = p => !sinCobro(p) && p.estadoPago === 'Pendiente'
const pendientesPago = computed(() => itemsFiltrados.value.filter(puedeCobrar))
const montoVisible = computed(() => itemsFiltrados.value.filter(p=>p.estado!=='Cancelado').reduce((sum,p)=>sum+Number(p.total||0),0))
const montoPendiente = computed(() => pendientesPago.value.reduce((sum,p)=>sum+Number(p.total||0),0))
const fecha = value => value ? new Date(value).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'}) : 'Sin fecha'
const textoPago = p => p.estadoPago === 'Pendiente' ? 'Pendiente' : p.metodoPago === 'Credito' ? 'A crédito' : 'Pagado'
const metodoTexto = value => value === 'Credito' ? 'Crédito' : value || 'Sin método registrado'
function limpiarFiltros() { estado.value=null;pago.value=null;origen.value=null;clienteId.value=null;repartidorId.value=null;buscarTexto.value='' }
function irPagina(n) { if(n>=1 && n<=totalPaginas.value) pagina.value=n }
function editar(id) { router.push(`/panel/pedido/${id}`) }
function abrirPago(p) { if(!puedeCobrar(p))return;pagoModal.value=p;pagoFolio.value='';pagoError.value='' }
function cerrarPago() { if(!pagoGuardando.value)pagoModal.value=null }
async function guardarPago() {
  if(pagoGuardando.value || !pagoModal.value)return
  pagoGuardando.value=true;pagoError.value=''
  try { await http.put(`/pedidos/${pagoModal.value.id}/registrar-pago`,{referenciaPago:pagoFolio.value.trim()||null});if(!disposed){pagoModal.value=null;await cargar()} }
  catch(e){if(!disposed)pagoError.value=e.response?.data?.mensaje||'No se pudo registrar el pago.'}
  finally{pagoGuardando.value=false}
}
async function eliminar(p) {
  if(p.estado!=='Abierto')return
  const ok=await confirmar({titulo:'Eliminar pedido',mensaje:`Se eliminará el pedido #${p.id} de ${p.clienteNombreMostrar||p.clienteNombre}. Esta acción no se puede deshacer.`,tipo:'eliminar'})
  if(!ok || disposed)return
  try{await http.delete(`/pedidos/${p.id}`);if(!disposed)await cargar()}
  catch(e){if(!disposed)error.value=e.response?.data?.mensaje||'No se pudo eliminar el pedido.'}
}
async function cargar() {
  const current=++solicitud;controller?.abort();controller=new AbortController();cargando.value=true;error.value=''
  const params={pagina:pagina.value,tamano}
  if(estado.value)params.estado=estado.value
  if(pago.value)params.estadoPago=pago.value
  if(origen.value!==null)params.esVentaLibre=origen.value
  if(clienteId.value)params.clienteId=clienteId.value
  if(repartidorId.value)params.repartidorId=repartidorId.value
  try{const {data}=await http.get('/pedidos',{params,signal:controller.signal});if(current!==solicitud||disposed)return;items.value=data.items||[];total.value=data.total??items.value.length;if(pagina.value>totalPaginas.value)pagina.value=totalPaginas.value}
  catch(e){if(current===solicitud&&!disposed&&e.code!=='ERR_CANCELED'){items.value=[];total.value=0;error.value=e.response?.data?.mensaje||'No se pudieron cargar los pedidos.'}}
  finally{if(current===solicitud&&!disposed)cargando.value=false}
}
async function cargarCatalogos() {
  catalogController?.abort();catalogController=new AbortController();const signal=catalogController.signal;catalogoError.value=''
  try{const [cl,rp]=await Promise.all([http.get('/clientes',{params:{tamano:100},signal}),http.get('/usuarios/repartidores',{signal})]);if(disposed||signal.aborted)return;clientes.value=cl.data.items||cl.data;repartidores.value=rp.data}
  catch(e){if(!disposed&&!signal.aborted)catalogoError.value='No se pudieron cargar las opciones de cliente o repartidor.'}
}
watch([estado,pago,origen,clienteId,repartidorId],()=>{if(pagina.value!==1)pagina.value=1;else cargar()})
watch(pagina,cargar)
onMounted(()=>{emit('ctx',{titulo:'Pedidos',sub:'Entrega, pago y origen: cada dato en su lugar.',back:null,acciones:{boton:{texto:'Nuevo pedido',to:'/panel/pedido/nuevo'}}});cargarCatalogos();cargar()})
onBeforeUnmount(()=>{disposed=true;++solicitud;controller?.abort();catalogController?.abort()})
</script>
<style scoped>
.quick-action{display:flex;justify-content:flex-end;margin-top:-12px;margin-bottom:18px}.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:22px}.stat{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:17px;box-shadow:var(--shadow)}.stat-label{display:flex;justify-content:space-between;gap:8px;font-size:12px;font-weight:600;color:var(--ink-soft)}.stat-label :deep(svg){width:18px;height:18px}.stat strong{display:block;font-size:30px;line-height:1.25;margin:11px 0 5px;letter-spacing:-.7px;font-variant-numeric:tabular-nums}.stat strong.stat-money{font-size:25px}.stat small{font-size:11px;color:var(--ink-soft)}.stat.attention{background:#FCF5E7;border-color:#D7BA82}.stat.attention strong{color:#795316}
.orders-panel{border:1px solid var(--line);background:var(--surface);border-radius:15px;overflow:hidden;box-shadow:var(--shadow)}.filters{padding:20px 22px 18px;border-bottom:1px solid var(--line)}.filter-title{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:15px}.filter-title h2{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700;margin:0}.clear-filters{border:0;background:none;color:var(--pine);font:inherit;font-size:12px;font-weight:700;min-height:36px;cursor:pointer}.filter-grid{display:grid;grid-template-columns:1.35fr repeat(3,1fr) 1.2fr 1.2fr;gap:12px}.search-field{position:relative}.search-field :deep(svg){position:absolute;left:11px;top:13px;width:17px;height:17px;color:var(--ink-soft)}.search-field input{padding-left:35px}.catalog-error{color:var(--clay);font-size:12px;margin:12px 0 0}.catalog-error button{background:none;border:0;font:inherit;color:var(--pine);text-decoration:underline;cursor:pointer}
.table-heading{display:flex;justify-content:space-between;gap:15px;align-items:center;padding:20px 22px 16px}.table-heading h2{display:flex;gap:9px;align-items:center;margin:0;font-size:16px;font-weight:700}.table-heading h2 span{font-size:11px;background:var(--pine-tint);color:var(--pine);padding:3px 8px;border-radius:6px}.table-heading>small{font-size:11px;color:var(--ink-soft)}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:12px;text-align:left}th{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.55px;color:var(--ink-soft);background:#F7F5EE;padding:11px 13px;border-block:1px solid var(--line)}td{padding:12px 13px;border-bottom:1px solid #EEE9DE;vertical-align:middle}th:first-child,td:first-child{padding-left:22px}th:last-child,td:last-child{padding-right:22px}tr:last-child td{border-bottom:0}.customer{font-weight:700;min-width:155px}.folio{color:var(--pine);margin-right:5px}td small{display:block;font-size:10px;color:var(--ink-soft);margin-top:4px}.money-col{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}.row-actions{white-space:nowrap;text-align:right}.detail-button{border:0;background:transparent;color:var(--pine);font:inherit;font-size:11px;font-weight:700;min-height:40px;padding:6px;cursor:pointer}.icon-action{border:1px solid var(--line);background:var(--surface);border-radius:8px;display:inline-flex;align-items:center;justify-content:center;width:34px;height:36px;color:var(--pine);margin-left:4px;cursor:pointer}.icon-action :deep(svg){width:16px;height:16px}.icon-action.danger{color:var(--clay)}.unassigned{color:#875519}.not-confirmed{font-size:11px;color:var(--ink-soft)}.canceled .customer,.canceled .money-col strong{text-decoration:line-through}.cancel-reason{font-size:10px;max-width:260px;color:var(--clay);margin:5px 0 0}.table-footer{display:flex;justify-content:space-between;gap:15px;align-items:center;padding:14px 22px;border-top:1px solid var(--line);font-size:11px;color:var(--ink-soft)}.pager{display:flex;gap:5px}.pager button{width:34px;height:34px;display:grid;place-items:center;border:1px solid var(--line);background:var(--surface);border-radius:7px;cursor:pointer;color:var(--ink-soft)}.pager button:disabled{opacity:.45;cursor:default}.pager button.current{background:var(--pine);color:#fff;border-color:var(--pine)}.pager :deep(svg){width:16px;height:16px}.scope-note{font-size:11px;color:var(--ink-soft);line-height:1.7;margin:16px 2px}.order-guide{font-size:12px;color:var(--ink-soft)}.order-guide summary{display:flex;align-items:center;gap:7px;cursor:pointer;color:var(--pine);min-height:44px;font-weight:700}.order-guide p{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:15px;line-height:1.7}
.payment-method{font-size:13px;margin:0 0 20px}.payment-method small{display:block;font-size:12px;margin-top:5px;color:var(--ink-soft)}.payment-error{color:var(--clay);font-size:13px;margin-top:12px}.order-details{margin:0}.order-details>div{display:flex;justify-content:space-between;gap:20px;padding:11px 0;border-bottom:1px solid var(--line);font-size:13px}.order-details dt{color:var(--ink-soft)}.order-details dd{text-align:right;margin:0;font-weight:700}.credit-explanation{font-size:12px;background:var(--sky-soft);color:#215671;padding:12px;border-radius:9px}
@media(max-width:1200px){.filter-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.stat strong.stat-money{font-size:22px}}@media(max-width:850px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.table-heading>small{display:none}}@media(max-width:720px){.quick-action{margin-top:0;justify-content:stretch}.quick-action .crm-button{width:100%}.filter-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.filters{padding:16px}.table-heading{padding:16px}table,tbody,tr,td{display:block}thead{display:none}tr{padding:16px;border-bottom:1px solid var(--line)}td,td:first-child,td:last-child{padding:7px 0;border:0;display:flex;justify-content:space-between;align-items:center;gap:12px;text-align:right}td::before{content:attr(data-label);font-size:11px;color:var(--ink-soft);text-align:left;flex-shrink:0}.customer{min-width:0;text-align:left;overflow-wrap:anywhere}td:first-child{display:block;text-align:left;padding-bottom:10px}td:first-child::before{display:none}td small{font-size:11px}td:first-child small{text-align:left}.row-actions{justify-content:flex-end;flex-wrap:wrap;margin-top:10px}.row-actions::before{display:none}.detail-button,.icon-action{min-height:44px}.icon-action{width:44px}.table-footer{padding:14px 16px;flex-direction:column;align-items:stretch}.pager{justify-content:center}.pager button{width:40px;height:44px}.stat{padding:13px}.stat strong{font-size:27px}.stat strong.stat-money{font-size:22px}.stat-label{font-size:11px}.stat small{font-size:10px}}
.clear-filters,.catalog-error button{min-height:44px}
</style>
