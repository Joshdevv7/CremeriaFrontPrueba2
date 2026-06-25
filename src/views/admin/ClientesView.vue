<template>
  <div>

    <div class="search">
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
      <input v-model="buscar" placeholder="Buscar cliente…" @input="debounced">
    </div>

    <p v-if="cargando" class="muted">Cargando…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else-if="!items.length" class="muted">No hay clientes. Crea uno con “Nuevo cliente”.</p>

    <div class="grid">
      <div v-for="c in items" :key="c.id" class="card" @click="editar(c.id)">
        <div class="chip"><ion-icon :icon="storefrontOutline" /></div>
        <div class="info">
          <div class="nombre">{{ c.nombre }}</div>
          <div class="sub">{{ c.direccion || 'Sin dirección' }}</div>
          <div class="tags">
            <span class="tag" :class="c.latitud != null ? 'geo' : 'nogeo'"><ion-icon :icon="locationOutline" /> {{ c.latitud != null ? 'Ubicado' : 'Sin ubicación' }}</span>
            <span v-if="c.repartidorNombre" class="tag rep"><ion-icon :icon="personOutline" /> {{ c.repartidorNombre }}</span>
          </div>
        </div>
        <ion-icon :icon="chevronForward" class="arrow" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { IonIcon } from '@ionic/vue'
import { storefrontOutline, locationOutline, personOutline, chevronForward } from 'ionicons/icons'
import http from '@/api/http'

const emit = defineEmits(['ctx'])
const router = useRouter()
const items = ref([])
const cargando = ref(true)
const error = ref('')
const buscar = ref('')
let t = null

function editar(id) { router.push(`/panel/cliente/${id}`) }
function debounced() { clearTimeout(t); t = setTimeout(cargar, 350) }
async function cargar() {
  cargando.value = true; error.value = ''
  try { const { data } = await http.get('/clientes', { params: { buscar: buscar.value || undefined, tamano: 100 } }); items.value = data.items }
  catch (e) { error.value = e.response?.data?.mensaje || 'No se pudieron cargar los clientes.' }
  finally { cargando.value = false }
}
onMounted(() => { emit('ctx', { titulo: 'Clientes', sub: '', back: null, acciones: { boton: { texto: 'Nuevo cliente', to: '/panel/cliente/nuevo' } } }); cargar() })
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; }
.err { color: var(--clay); font-weight: 600; margin-top: 24px; }
.search { display: flex; align-items: center; gap: 10px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; margin-bottom: 14px; box-shadow: var(--shadow); max-width: 420px; }
.search svg { width: 18px; height: 18px; stroke: var(--muted); fill: none; stroke-width: 2; flex: 0 0 auto; }
.search input { border: none; background: transparent; outline: none; font-family: "Hanken Grotesk"; font-size: 14.5px; font-weight: 500; color: var(--ink); width: 100%; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
.card { display: flex; align-items: center; gap: 13px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px; box-shadow: var(--shadow); cursor: pointer; }
.chip { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; background: var(--pine-tint); flex: 0 0 auto; }
.chip ion-icon { font-size: 21px; color: var(--pine); }
.info { flex: 1; min-width: 0; }
.nombre { font-weight: 700; font-size: 15.5px; }
.sub { font-size: 12.5px; color: var(--muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tags { display: flex; gap: 6px; margin-top: 7px; flex-wrap: wrap; }
.tag { font-size: 10.5px; font-weight: 700; padding: 3px 8px; border-radius: 7px; display: inline-flex; align-items: center; gap: 4px; }
.tag ion-icon { font-size: 12px; }
.tag.geo { color: var(--pine); background: var(--pine-tint); } .tag.nogeo { color: var(--muted); background: var(--paper-2); } .tag.rep { color: var(--sky); background: var(--sky-soft); }
.arrow { color: var(--muted); font-size: 18px; flex: 0 0 auto; }
.btn-primary { display: flex; align-items: center; gap: 8px; background: var(--ink); color: #fff; border: none; border-radius: 12px; padding: 11px 16px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; cursor: pointer; box-shadow: 0 10px 20px -12px rgba(21,42,36,.7); }
.btn-primary svg { width: 17px; height: 17px; stroke: #fff; fill: none; stroke-width: 2.4; stroke-linecap: round; }
</style>
