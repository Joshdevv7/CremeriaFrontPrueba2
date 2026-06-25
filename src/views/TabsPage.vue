<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="entregas" href="/app/entregas">
          <ion-icon :icon="navigateOutline" /><ion-label>Entregas</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="inventario" href="/app/inventario">
          <ion-icon :icon="fileTrayStackedOutline" /><ion-label>Inventario</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="corte" href="/app/corte">
          <ion-icon :icon="cashOutline" /><ion-label>Corte</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="perfil" href="/app/perfil">
          <ion-icon :icon="personOutline" /><ion-label>Perfil</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { IonPage, IonTabs, IonRouterOutlet, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/vue'
import { navigateOutline, fileTrayStackedOutline, cashOutline, personOutline } from 'ionicons/icons'
import { useAuthStore } from '@/stores/auth'
import { iniciarRastreo, detenerRastreo } from '@/composables/useRastreo'

const auth = useAuthStore()
onMounted(() => { if (auth.esRepartidor) iniciarRastreo(auth.usuarioId) })
onUnmounted(() => detenerRastreo())
</script>
