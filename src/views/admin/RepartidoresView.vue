<template>
  <div>
    <p v-if="cargando" class="muted">Cargando…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else-if="!items.length" class="muted">No hay repartidores. Crea uno con “Nuevo repartidor”.</p>
    <div class="grid">
      <div v-for="u in items" :key="u.id" class="card" @click="editar(u.id)">
        <div class="av">{{ ini(u.nombre) }}</div>
        <div class="info">
          <div class="nombre">{{ u.nombre }}</div>
          <div class="sub">{{ u.email }}</div>
        </div>
        <span class="badge" :class="u.activo ? 'on' : 'off'">{{ u.activo ? 'Activo' : 'Inactivo' }}</span>
        <ion-icon :icon="chevronForward" class="arrow" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { IonIcon } from '@ionic/vue'
import { chevronForward } from 'ionicons/icons'
import http from '@/api/http'

const emit = defineEmits(['ctx'])
const router = useRouter()
const items = ref([])
const cargando = ref(true)
const error = ref('')
const ini = (n) => (n || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
function editar(id) { router.push(`/panel/repartidor/${id}`) }
async function cargar() {
  cargando.value = true; error.value = ''
  try { const { data } = await http.get('/usuarios'); items.value = data }
  catch (e) { error.value = e.response?.data?.mensaje || 'No se pudieron cargar los repartidores.' }
  finally { cargando.value = false }
}
onMounted(() => { emit('ctx', { titulo: 'Repartidores', sub: 'Perfiles del equipo de reparto', back: null, acciones: { boton: { texto: 'Nuevo repartidor', to: '/panel/repartidor/nuevo' } } }); cargar() })
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; } .err { color: var(--clay); font-weight: 600; margin-top: 24px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
.card { display: flex; align-items: center; gap: 13px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px; box-shadow: var(--shadow); cursor: pointer; }
.av { width: 44px; height: 44px; border-radius: 12px; background: var(--amber-soft); display: grid; place-items: center; color: #B9781F; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 16px; flex: 0 0 auto; }
.info { flex: 1; min-width: 0; }
.nombre { font-weight: 700; font-size: 15.5px; }
.sub { font-size: 12.5px; color: var(--muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.badge { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; padding: 3px 9px; border-radius: 7px; flex: 0 0 auto; }
.badge.on { color: var(--pine); background: var(--pine-tint); } .badge.off { color: var(--muted); background: var(--paper-2); }
.arrow { color: var(--muted); font-size: 18px; flex: 0 0 auto; }
</style>
