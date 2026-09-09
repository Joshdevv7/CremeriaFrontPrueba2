<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="entregas" href="/app/entregas">
          <ion-icon :icon="navigateOutline" />
          <ion-label>Entregas</ion-label>
          <ion-badge v-if="paradasPendientes > 0" class="badge-tab">{{ paradasPendientes }}</ion-badge>
        </ion-tab-button>
        <ion-tab-button tab="inventario" href="/app/inventario">
          <ion-icon :icon="fileTrayStackedOutline" />
          <ion-label>Inventario</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="corte" href="/app/corte" class="rel-btn">
          <ion-icon :icon="cashOutline" />
          <ion-label>Corte</ion-label>
          <span v-if="cortePendiente" class="dot-corte"></span>
        </ion-tab-button>
        <ion-tab-button tab="perfil" href="/app/perfil">
          <ion-icon :icon="personOutline" />
          <ion-label>Perfil</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { IonPage, IonTabs, IonRouterOutlet, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge } from '@ionic/vue'
import { navigateOutline, fileTrayStackedOutline, cashOutline, personOutline } from 'ionicons/icons'
import { useAuthStore } from '@/stores/auth'
import { iniciarRastreo, detenerRastreo } from '@/composables/useRastreo'
import http from '@/api/http'

const auth = useAuthStore()
const paradasPendientes = ref(0)
const cortePendiente = ref(false)
let timer = null

async function actualizarBadges() {
  if (!auth.esRepartidor) return
  try {
    const { data: pData } = await http.get('/pedidos', {
      params: { repartidorId: auth.usuarioId, estado: 'Abierto', tamano: 50 }
    })
    paradasPendientes.value = pData.total ?? pData.items?.length ?? 0
  } catch { /* noop */ }

  try {
    const { data: cData } = await http.get('/cortes/resumen', {
      params: { repartidorId: auth.usuarioId }
    })
    cortePendiente.value = !!cData.hayCargaPorCortar
  } catch { /* noop */ }
}

onMounted(() => {
  if (auth.esRepartidor) {
    iniciarRastreo(auth.usuarioId)
    actualizarBadges()
    timer = setInterval(actualizarBadges, 30000)
  }
})

onUnmounted(() => {
  detenerRastreo()
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.rel-btn { position: relative; }
.badge-tab {
  --background: var(--amber);
  --color: #fff;
  font-family: "Bricolage Grotesque";
  font-weight: 700;
  font-size: 11px;
}
.dot-corte {
  position: absolute;
  top: 7px;
  right: calc(50% - 15px);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--amber);
  box-shadow: 0 0 0 2px var(--surface);
}
</style>
