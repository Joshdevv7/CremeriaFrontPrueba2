<template>
  <ion-app>
    <ion-router-outlet />
    <transition name="toast">
      <div v-if="notif.toast" class="toast" @click="notif.toast = null">
        <div class="ic">{{ emoji(notif.toast.tipo) }}</div>
        <div class="tx"><div class="t">{{ notif.toast.titulo }}</div><div class="m">{{ notif.toast.mensaje }}</div></div>
      </div>
    </transition>
  </ion-app>
</template>

<script setup>
import { watch } from 'vue'
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import { useAuthStore } from '@/stores/auth'
import { useNotifStore } from '@/stores/notificaciones'

const auth = useAuthStore()
const notif = useNotifStore()

const EMOJIS = { StockBajo: '📦', EntregaTerminada: '✅', MermaReportada: '⚠️', PedidoCreado: '🧾', CorteCerrado: '💵', CargaAbierta: '🚚' }
function emoji(t) { return EMOJIS[t] || '🔔' }

watch(() => auth.autenticado, (ok) => {
  if (ok) notif.conectar(auth.token)
  else notif.desconectar()
}, { immediate: true })
</script>

<style>
.toast { position: fixed; left: 50%; transform: translateX(-50%); bottom: 24px; z-index: 4000; display: flex; align-items: center; gap: 12px; background: var(--ink, #152A24); color: #fff; border-radius: 14px; padding: 13px 16px; box-shadow: 0 18px 40px -14px rgba(0,0,0,.5); max-width: 90vw; cursor: pointer; }
.toast .ic { font-size: 22px; }
.toast .tx .t { font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 14px; }
.toast .tx .m { font-size: 12.5px; opacity: .85; margin-top: 1px; }
.toast-enter-active, .toast-leave-active { transition: opacity .25s, transform .25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(16px); }
</style>
