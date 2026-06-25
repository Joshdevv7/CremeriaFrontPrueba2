<template>
  <div>
    <p v-if="cargando" class="muted">Cargando…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else-if="!items.length" class="muted">No hay proveedores. Crea uno con “Nuevo proveedor”.</p>
    <div class="grid">
      <div v-for="p in items" :key="p.id" class="card">
        <div class="chip"><ion-icon :icon="cubeOutline" /></div>
        <div class="info" @click="editar(p.id)">
          <div class="nombre">{{ p.nombre }}</div>
          <div class="sub">{{ p.telefono || 'Sin teléfono' }}</div>
        </div>
        <button v-if="p.whatsapp" class="wa" @click.stop="whatsapp(p)" title="WhatsApp"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.4A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.2 1.1-1.7 1.2-.5.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1-1.4-1-2.6 0-1.2.6-1.8.9-2 .2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2 0 .4-.1.5l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.2.1.4.1.5-.1l.7-.8c.2-.2.4-.2.6-.1l1.8.9c.2.1.4.2.4.3.1.1.1.5-.1 1Z"/></svg></button>
        <ion-icon :icon="chevronForward" class="arrow" @click="editar(p.id)" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { IonIcon } from '@ionic/vue'
import { cubeOutline, chevronForward } from 'ionicons/icons'
import http from '@/api/http'

const emit = defineEmits(['ctx'])
const router = useRouter()
const items = ref([])
const cargando = ref(true)
const error = ref('')
function editar(id) { router.push(`/panel/proveedor/${id}`) }
function whatsapp(p) {
  const num = (p.whatsapp || '').replace(/[^\d]/g, '')
  window.open(`https://wa.me/${num}`, '_blank')
}
async function cargar() {
  cargando.value = true; error.value = ''
  try { const { data } = await http.get('/proveedores', { params: { tamano: 100 } }); items.value = data.items }
  catch (e) { error.value = e.response?.data?.mensaje || 'No se pudieron cargar los proveedores.' }
  finally { cargando.value = false }
}
onMounted(() => { emit('ctx', { titulo: 'Proveedores', sub: '', back: null, acciones: { boton: { texto: 'Nuevo proveedor', to: '/panel/proveedor/nuevo' } } }); cargar() })
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; } .err { color: var(--clay); font-weight: 600; margin-top: 24px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
.card { display: flex; align-items: center; gap: 13px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px; box-shadow: var(--shadow); }
.chip { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; background: var(--sky-soft); flex: 0 0 auto; }
.chip ion-icon { font-size: 21px; color: var(--sky); }
.info { flex: 1; min-width: 0; cursor: pointer; }
.nombre { font-weight: 700; font-size: 15.5px; }
.sub { font-size: 12.5px; color: var(--muted); margin-top: 2px; }
.wa { width: 38px; height: 38px; border-radius: 10px; border: none; background: #1AA75A; display: grid; place-items: center; cursor: pointer; flex: 0 0 auto; }
.wa svg { width: 18px; height: 18px; fill: #fff; }
.arrow { color: var(--muted); font-size: 18px; flex: 0 0 auto; cursor: pointer; }
</style>
