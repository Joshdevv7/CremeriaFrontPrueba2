<template>
  <div>
    <p v-if="cargando" class="muted">Cargando…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else-if="!items.length" class="muted">Aún no hay compras registradas. Registra una con “Nueva compra”.</p>

    <div class="grid">
      <div v-for="c in items" :key="c.id" class="card">
        <div class="chip"><ion-icon :icon="cubeOutline" /></div>
        <div class="info">
          <div class="prov">{{ c.proveedorNombre }}</div>
          <div class="sub">{{ fecha(c.fecha) }} · {{ c.lineas.length }} producto(s)<span v-if="c.referencia"> · {{ c.referencia }}</span></div>
        </div>
        <div class="total">{{ money(c.total) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { IonIcon } from '@ionic/vue'
import { cubeOutline } from 'ionicons/icons'
import http from '@/api/http'

const emit = defineEmits(['ctx'])
const items = ref([])
const cargando = ref(true)
const error = ref('')
const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const fecha = (f) => new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })

async function cargar() {
  cargando.value = true; error.value = ''
  try { const { data } = await http.get('/compras', { params: { tamano: 100 } }); items.value = data.items }
  catch (e) { error.value = e.response?.data?.mensaje || 'No se pudieron cargar las compras.' }
  finally { cargando.value = false }
}
onMounted(() => { emit('ctx', { titulo: 'Compras', sub: 'Entradas de mercancía de proveedores', back: null, acciones: { boton: { texto: 'Nueva compra', to: '/panel/compra/nuevo' } } }); cargar() })
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; } .err { color: var(--clay); font-weight: 600; margin-top: 16px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
.card { display: flex; align-items: center; gap: 13px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px; box-shadow: var(--shadow); }
.chip { width: 42px; height: 42px; border-radius: 11px; background: var(--sky-soft); display: grid; place-items: center; flex: 0 0 auto; }
.chip ion-icon { font-size: 21px; color: var(--sky); }
.info { flex: 1; min-width: 0; }
.prov { font-weight: 700; font-size: 15px; }
.sub { font-size: 12px; color: var(--muted); margin-top: 3px; }
.total { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; font-variant-numeric: tabular-nums; flex: 0 0 auto; }
</style>
