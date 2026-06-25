<template>
  <div>
    <div class="search">
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
      <input v-model="buscar" placeholder="Buscar producto…">
    </div>
    <p v-if="cargando" class="muted">Cargando…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else-if="!filtrados.length" class="muted">No hay productos. Crea uno con “Nuevo producto”.</p>
    <div class="grid">
      <div v-for="p in filtrados" :key="p.id" class="card" @click="editar(p.id)">
        <div class="emoji">📦</div>
        <div class="info">
          <div class="nombre">{{ p.nombre }}</div>
          <div class="sub">{{ p.proveedorNombre || p.categoria || '—' }} · {{ p.unidad }} · almacén <b>{{ fmt(p.stockAlmacen) }}</b></div>
        </div>
        <div class="right">
          <div class="precio">{{ money(p.precioVenta) }}</div>
          <span v-if="p.requiereReorden" class="badge">Reordenar</span>
        </div>
        <ion-icon :icon="chevronForward" class="arrow" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { IonIcon } from '@ionic/vue'
import { chevronForward } from 'ionicons/icons'
import http from '@/api/http'

const emit = defineEmits(['ctx'])
const router = useRouter()
const items = ref([])
const cargando = ref(true)
const error = ref('')
const buscar = ref('')
const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const fmt = (n) => Number(n || 0).toLocaleString('es-MX')
const filtrados = computed(() => { const t = buscar.value.trim().toLowerCase(); return t ? items.value.filter((p) => p.nombre.toLowerCase().includes(t)) : items.value })
function editar(id) { router.push(`/panel/producto/${id}`) }
async function cargar() {
  cargando.value = true; error.value = ''
  try { const { data } = await http.get('/productos', { params: { tamano: 100 } }); items.value = data.items }
  catch (e) { error.value = e.response?.data?.mensaje || 'No se pudieron cargar los productos.' }
  finally { cargando.value = false }
}
onMounted(() => { emit('ctx', { titulo: 'Inventario', sub: 'Catálogo de productos', back: null, acciones: { boton: { texto: 'Nuevo producto', to: '/panel/producto/nuevo' } } }); cargar() })
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; } .err { color: var(--clay); font-weight: 600; margin-top: 24px; }
.search { display: flex; align-items: center; gap: 10px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; margin-bottom: 14px; box-shadow: var(--shadow); max-width: 420px; }
.search svg { width: 18px; height: 18px; stroke: var(--muted); fill: none; stroke-width: 2; flex: 0 0 auto; }
.search input { border: none; background: transparent; outline: none; font-family: "Hanken Grotesk"; font-size: 14.5px; font-weight: 500; color: var(--ink); width: 100%; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; }
.card { display: flex; align-items: center; gap: 13px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 13px 14px; box-shadow: var(--shadow); cursor: pointer; }
.emoji { width: 44px; height: 44px; border-radius: 12px; background: var(--paper-2); display: grid; place-items: center; font-size: 22px; flex: 0 0 auto; }
.info { flex: 1; min-width: 0; }
.nombre { font-weight: 700; font-size: 14.5px; }
.sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
.sub b { color: var(--ink-soft); font-variant-numeric: tabular-nums; }
.right { text-align: right; flex: 0 0 auto; }
.precio { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 16px; font-variant-numeric: tabular-nums; }
.badge { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; color: var(--amber); background: var(--amber-soft); padding: 3px 8px; border-radius: 7px; display: inline-block; margin-top: 4px; }
.arrow { color: var(--muted); font-size: 18px; flex: 0 0 auto; }
</style>
