<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar><ion-title>Perfil</ion-title></ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="wrap">
        <div class="card">
          <div class="av">{{ iniciales }}</div>
          <div class="n">{{ auth.usuario?.nombre }}</div>
          <div class="r">{{ auth.usuario?.rol }}</div>
        </div>

        <!-- TEMPORAL: prueba de impresora (quitar cuando esté validada) -->
        <button class="btn-prueba" @click="$router.push('/app/prueba-impresora')">
          <svg viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5h20v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>
          Probar impresora
        </button>

        <button class="btn" @click="salir">Cerrar sesión</button>
      </div>
    </ion-content>
  </ion-page>
</template>
<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/vue'
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()
const router = useRouter()
const iniciales = computed(() => (auth.usuario?.nombre || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase())
function salir() { auth.logout(); router.replace('/login') }
</script>
<style scoped>
ion-toolbar { --background: var(--paper); }
ion-title { font-family: "Bricolage Grotesque"; font-weight: 700; }
.wrap { padding: 24px 18px; max-width: 460px; margin: 0 auto; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 20px; padding: 26px; text-align: center; box-shadow: var(--shadow); }
.av { width: 64px; height: 64px; border-radius: 18px; margin: 0 auto 14px; display: grid; place-items: center; background: var(--amber-soft); color: #B9781F; font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 24px; }
.n { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 19px; }
.r { color: var(--muted); font-weight: 600; margin-top: 3px; }
.btn-prueba { width: 100%; margin-top: 20px; border: 1.5px solid var(--pine); border-radius: 14px; padding: 14px; background: var(--surface); color: var(--pine); font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 9px; }
.btn-prueba svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.btn { width: 100%; margin-top: 12px; border: none; border-radius: 14px; padding: 15px; background: var(--clay); color: #fff; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; cursor: pointer; }
</style>
