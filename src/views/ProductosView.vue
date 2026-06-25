<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Productos</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="recargar($event)">
        <ion-refresher-content />
      </ion-refresher>

      <div class="list">
        <p v-if="cargando" class="muted">Cargando…</p>
        <p v-else-if="error" class="err">{{ error }}</p>
        <p v-else-if="!items.length" class="muted">Sin productos.</p>

        <div v-for="p in items" :key="p.id" class="card">
          <div class="chip" :class="{ alert: p.requiereReorden }">
            <ion-icon :icon="p.requiereReorden ? alertCircle : cubeOutline" />
          </div>
          <div class="info">
            <div class="nombre">{{ p.nombre }}</div>
            <div class="sub">
              Stock: <b>{{ p.stockAlmacen }}</b>
              <span v-if="p.requiereReorden" class="badge">Pedir {{ p.cantidadSugeridaReorden }}</span>
            </div>
          </div>
          <div class="precio">{{ mxn(p.precioVenta) }}<small>MXN</small></div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonRefresher, IonRefresherContent } from '@ionic/vue'
import { cubeOutline, alertCircle } from 'ionicons/icons'
import http from '@/api/http'
import { useCurrency } from '@/composables/useCurrency'

const { mxn } = useCurrency()
const items = ref([])
const cargando = ref(true)
const error = ref('')

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await http.get('/productos', { params: { tamano: 50 } })
    items.value = data.items
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudieron cargar los productos.'
  } finally {
    cargando.value = false
  }
}
async function recargar(ev) { await cargar(); ev.target.complete() }
onMounted(cargar)
</script>

<style scoped>
ion-toolbar { --background: var(--paper); }
ion-title { font-family: "Bricolage Grotesque"; font-weight: 700; }
.list { padding: 8px 16px 20px; }
.muted { color: var(--muted); text-align: center; margin-top: 30px; }
.err { color: var(--clay); text-align: center; margin-top: 30px; font-weight: 600; }
.card { display: flex; align-items: center; gap: 13px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 13px 14px; margin-bottom: 10px; box-shadow: var(--shadow); }
.chip { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; background: var(--pine-tint); flex: 0 0 auto; }
.chip ion-icon { font-size: 20px; color: var(--pine); }
.chip.alert { background: var(--clay-soft); }
.chip.alert ion-icon { color: var(--clay); }
.info { flex: 1; min-width: 0; }
.nombre { font-weight: 700; font-size: 15px; color: var(--ink); }
.sub { font-size: 13px; color: var(--muted); margin-top: 2px; }
.badge { display: inline-block; margin-left: 8px; background: var(--amber-soft); color: #B9781F; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 7px; }
.precio { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 17px; color: var(--ink); text-align: right; }
.precio small { display: block; font-size: 10px; color: var(--muted); }
</style>
