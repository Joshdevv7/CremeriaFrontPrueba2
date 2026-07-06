<template>
  <div>
    <!-- Barra de filtros -->
    <div class="filtros">
      <div class="chips">
        <button v-for="e in estados" :key="e.v || 'todos'" class="chip" :class="{ on: estado === e.v }" @click="setEstado(e.v)">{{ e.t }}</button>
        <button class="chip vr" :class="{ on: soloVentaRuta }" @click="toggleVentaRuta()">Ventas en ruta</button>
      </div>
      <div class="selects">
        <BuscadorSelect v-model="clienteId" :opciones="clientes" nombre="cliente" placeholder="Cliente" />
        <BuscadorSelect v-model="repartidorId" :opciones="repartidores" nombre="repartidor" placeholder="Repartidor" />
      </div>
    </div>

    <p v-if="cargando" class="muted">Cargando…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else-if="!items.length" class="muted">No hay pedidos con estos filtros.</p>

    <div class="grid" v-if="!cargando && items.length">
      <div v-for="p in items" :key="p.id" class="card">
        <div class="info" :class="{ click: p.estado === 'Abierto' }" @click="p.estado === 'Abierto' && editar(p.id)">
          <div class="top">
            <span class="cli">{{ p.clienteNombreMostrar || p.clienteNombre }}</span>
            <span v-if="p.esVentaLibre" class="badge vr">Venta en ruta</span>
            <span class="badge" :class="badge(p.estado)">{{ estadoTxt(p.estado) }}</span>
          </div>
          <div class="sub">#{{ p.id }} · {{ p.repartidorNombre || 'Sin repartidor' }} · {{ fecha(p.fecha) }}</div>
        </div>
        <div class="right">
          <div class="total">{{ money(p.total) }}</div>
          <button v-if="p.estado === 'Abierto'" class="del" @click.stop="eliminar(p)" title="Eliminar"><ion-icon :icon="trashOutline" /></button>
        </div>
      </div>
    </div>

    <!-- Paginación -->
    <div class="pager" v-if="!cargando && totalPaginas > 1">
      <button class="pg" :disabled="pagina <= 1" @click="irPagina(pagina - 1)">
        <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <button v-for="n in paginasVisibles" :key="n" class="pg num" :class="{ on: n === pagina }" @click="irPagina(n)">{{ n }}</button>
      <button class="pg" :disabled="pagina >= totalPaginas" @click="irPagina(pagina + 1)">
        <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
    <p v-if="!cargando && total" class="cuenta">{{ total }} pedido(s) · página {{ pagina }} de {{ totalPaginas }}</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { IonIcon } from '@ionic/vue'
import { trashOutline } from 'ionicons/icons'
import http from '@/api/http'
import { confirmar } from '@/composables/useConfirm'
import BuscadorSelect from '@/components/BuscadorSelect.vue'

const emit = defineEmits(['ctx'])
const router = useRouter()
const items = ref([])
const cargando = ref(true)
const error = ref('')

// filtros
const estado = ref(null)
const clienteId = ref(null)
const repartidorId = ref(null)
const soloVentaRuta = ref(false)
const clientes = ref([])
const repartidores = ref([])
const estados = [
  { v: null, t: 'Todos' },
  { v: 'Abierto', t: 'Abiertos' },
  { v: 'EnRuta', t: 'En ruta' },
  { v: 'CerradoCompleto', t: 'Completos' },
  { v: 'CerradoParcial', t: 'Parciales' },
  { v: 'CerradoNoEntregado', t: 'No entregado' }
]

// paginación
const pagina = ref(1)
const tamano = ref(20)
const total = ref(0)
const totalPaginas = computed(() => Math.max(1, Math.ceil(total.value / tamano.value)))
const paginasVisibles = computed(() => {
  const tp = totalPaginas.value, actual = pagina.value
  const rango = []
  let ini = Math.max(1, actual - 2), fin = Math.min(tp, ini + 4)
  ini = Math.max(1, fin - 4)
  for (let i = ini; i <= fin; i++) rango.push(i)
  return rango
})

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const fecha = (f) => new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
const estadoTxt = (e) => ({ Abierto: 'Abierto', EnRuta: 'En ruta', CerradoCompleto: 'Completa', CerradoParcial: 'Parcial', CerradoNoEntregado: 'No entregado' }[e] || e)
const badge = (e) => ({ Abierto: 'amber', EnRuta: 'sky', CerradoCompleto: 'pine', CerradoParcial: 'amber', CerradoNoEntregado: 'clay' }[e] || 'muted')

function setEstado(v) { estado.value = v }
function toggleVentaRuta() { soloVentaRuta.value = !soloVentaRuta.value }
function irPagina(n) { if (n < 1 || n > totalPaginas.value) return; pagina.value = n }

function editar(id) { router.push(`/panel/pedido/${id}`) }
async function eliminar(p) {
  const ok = await confirmar({
    titulo: 'Eliminar pedido',
    mensaje: `Se eliminará el pedido de ${p.clienteNombreMostrar || p.clienteNombre}. Esta acción no se puede deshacer.`,
    tipo: 'eliminar'
  })
  if (!ok) return
  try { await http.delete(`/pedidos/${p.id}`); await cargar() }
  catch (e) { error.value = e.response?.data?.mensaje || 'No se pudo eliminar el pedido.' }
}

async function cargar() {
  cargando.value = true; error.value = ''
  try {
    const params = { pagina: pagina.value, tamano: tamano.value }
    if (estado.value) params.estado = estado.value
    if (clienteId.value) params.clienteId = clienteId.value
    if (repartidorId.value) params.repartidorId = repartidorId.value
    if (soloVentaRuta.value) params.esVentaLibre = true
    const { data } = await http.get('/pedidos', { params })
    items.value = data.items
    total.value = data.total ?? data.items.length
  } catch (e) { error.value = e.response?.data?.mensaje || 'No se pudieron cargar los pedidos.' }
  finally { cargando.value = false }
}

async function cargarCatalogos() {
  try {
    const [cl, rp] = await Promise.all([
      http.get('/clientes', { params: { tamano: 100 } }),
      http.get('/usuarios/repartidores')
    ])
    clientes.value = cl.data.items || cl.data
    repartidores.value = rp.data
  } catch { /* si falla, los selectores quedan vacíos pero la lista sigue */ }
}

// Al cambiar cualquier filtro: volver a página 1 y recargar
watch([estado, clienteId, repartidorId, soloVentaRuta], () => {
  if (pagina.value !== 1) pagina.value = 1
  else cargar()
})
// Al cambiar de página: recargar
watch(pagina, cargar)

onMounted(() => {
  emit('ctx', { titulo: 'Pedidos', sub: '', back: null, acciones: { boton: { texto: 'Nuevo pedido', to: '/panel/pedido/nuevo' } } })
  cargarCatalogos()
  cargar()
})
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; }
.err { color: var(--clay); font-weight: 600; margin-top: 24px; }

/* filtros */
.filtros { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.chips { display: flex; flex-wrap: wrap; gap: 7px; }
.chip { border: 1px solid var(--line); background: var(--surface); color: var(--ink-soft); border-radius: 999px; padding: 8px 14px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12.5px; cursor: pointer; transition: .15s; }
.chip.on { background: var(--pine); color: #fff; border-color: var(--pine); }
.chip.vr.on { background: var(--sky); border-color: var(--sky); }
.selects { display: flex; flex-wrap: wrap; gap: 8px; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
.card { display: flex; align-items: center; gap: 12px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px; box-shadow: var(--shadow); }
.info { flex: 1; min-width: 0; }
.info.click { cursor: pointer; }
.top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.cli { font-weight: 700; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sub { font-size: 12.5px; color: var(--muted); margin-top: 3px; }
.right { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
.total { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 16px; font-variant-numeric: tabular-nums; }
.badge { font-size: 10px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; padding: 3px 8px; border-radius: 7px; flex: 0 0 auto; }
.badge.amber { color: #B9781F; background: var(--amber-soft); } .badge.sky { color: var(--sky); background: var(--sky-soft); } .badge.pine { color: var(--pine); background: var(--pine-tint); } .badge.clay { color: var(--clay); background: var(--clay-soft); } .badge.muted { color: var(--muted); background: var(--paper-2); }
.badge.vr { color: var(--sky); background: var(--sky-soft); }
.del { width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--clay-soft); background: var(--clay-soft); display: grid; place-items: center; cursor: pointer; }
.del ion-icon { font-size: 17px; color: var(--clay); }

/* paginación */
.pager { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 22px; }
.pg { min-width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); display: grid; place-items: center; cursor: pointer; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; color: var(--ink-soft); padding: 0 6px; }
.pg svg { width: 17px; height: 17px; stroke: var(--ink-soft); fill: none; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.pg:disabled { opacity: .4; cursor: default; }
.pg.num.on { background: var(--pine); color: #fff; border-color: var(--pine); }
.cuenta { text-align: center; color: var(--muted); font-size: 12px; font-weight: 600; margin-top: 10px; }
</style>
