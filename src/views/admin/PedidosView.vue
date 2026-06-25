<template>
  <div>

    <p v-if="cargando" class="muted">Cargando…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else-if="!items.length" class="muted">No hay pedidos. Crea uno con “Nuevo pedido”.</p>

    <div class="grid">
      <div v-for="p in items" :key="p.id" class="card">
        <div class="info" :class="{ click: p.estado === 'Abierto' }" @click="p.estado === 'Abierto' && editar(p.id)">
          <div class="top"><span class="cli">{{ p.clienteNombre }}</span><span class="badge" :class="badge(p.estado)">{{ estadoTxt(p.estado) }}</span></div>
          <div class="sub">#{{ p.id }} · {{ p.repartidorNombre || 'Sin repartidor' }} · {{ fecha(p.fecha) }}</div>
        </div>
        <div class="right">
          <div class="total">{{ money(p.total) }}</div>
          <button v-if="p.estado === 'Abierto'" class="del" @click.stop="eliminar(p)" title="Eliminar"><ion-icon :icon="trashOutline" /></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { IonIcon } from '@ionic/vue'
import { trashOutline } from 'ionicons/icons'
import http from '@/api/http'

const emit = defineEmits(['ctx'])
const router = useRouter()
const items = ref([])
const cargando = ref(true)
const error = ref('')

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const fecha = (f) => new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
const estadoTxt = (e) => ({ Abierto: 'Abierto', EnRuta: 'En ruta', CerradoCompleto: 'Completa', CerradoParcial: 'Parcial', CerradoNoEntregado: 'No entregado' }[e] || e)
const badge = (e) => ({ Abierto: 'amber', EnRuta: 'sky', CerradoCompleto: 'pine', CerradoParcial: 'amber', CerradoNoEntregado: 'clay' }[e] || 'muted')

function editar(id) { router.push(`/panel/pedido/${id}`) }
async function eliminar(p) {
  if (!confirm(`Eliminar el pedido de ${p.clienteNombre}?`)) return
  try { await http.delete(`/pedidos/${p.id}`); await cargar() }
  catch (e) { error.value = e.response?.data?.mensaje || 'No se pudo eliminar el pedido.' }
}
async function cargar() {
  cargando.value = true; error.value = ''
  try { const { data } = await http.get('/pedidos', { params: { tamano: 50 } }); items.value = data.items }
  catch (e) { error.value = e.response?.data?.mensaje || 'No se pudieron cargar los pedidos.' }
  finally { cargando.value = false }
}
onMounted(() => { emit('ctx', { titulo: 'Pedidos', sub: '', back: null, acciones: { boton: { texto: 'Nuevo pedido', to: '/panel/pedido/nuevo' } } }); cargar() })
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; }
.err { color: var(--clay); font-weight: 600; margin-top: 24px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
.card { display: flex; align-items: center; gap: 12px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px; box-shadow: var(--shadow); }
.info { flex: 1; min-width: 0; }
.info.click { cursor: pointer; }
.top { display: flex; align-items: center; gap: 8px; }
.cli { font-weight: 700; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sub { font-size: 12.5px; color: var(--muted); margin-top: 3px; }
.right { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
.total { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 16px; font-variant-numeric: tabular-nums; }
.badge { font-size: 10px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; padding: 3px 8px; border-radius: 7px; flex: 0 0 auto; }
.badge.amber { color: #B9781F; background: var(--amber-soft); } .badge.sky { color: var(--sky); background: var(--sky-soft); } .badge.pine { color: var(--pine); background: var(--pine-tint); } .badge.clay { color: var(--clay); background: var(--clay-soft); } .badge.muted { color: var(--muted); background: var(--paper-2); }
.del { width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--clay-soft); background: var(--clay-soft); display: grid; place-items: center; cursor: pointer; }
.del ion-icon { font-size: 17px; color: var(--clay); }
.btn-primary { display: flex; align-items: center; gap: 8px; background: var(--ink); color: #fff; border: none; border-radius: 12px; padding: 11px 16px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; cursor: pointer; box-shadow: 0 10px 20px -12px rgba(21,42,36,.7); }
.btn-primary svg { width: 17px; height: 17px; stroke: #fff; fill: none; stroke-width: 2.4; stroke-linecap: round; }
.ghost-btn { width: 42px; height: 42px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); display: grid; place-items: center; cursor: pointer; }
.ghost-btn svg { width: 20px; height: 20px; stroke: var(--ink-soft); fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
</style>
