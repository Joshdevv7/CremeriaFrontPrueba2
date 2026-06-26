<template>
  <ion-app>
    <ion-router-outlet />
    <transition name="toast">
      <div v-if="notif.toast" class="toast" @click="notif.toast = null">
        <div class="ic" v-html="iconoToast(notif.toast.tipo)"></div>
        <div class="tx"><div class="t">{{ notif.toast.titulo }}</div><div class="m">{{ notif.toast.mensaje }}</div></div>
      </div>
    </transition>

    <!-- Diálogo de confirmación reutilizable (una sola instancia para toda la app) -->
    <ConfirmHost />
  </ion-app>
</template>

<script setup>
import { watch } from 'vue'
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import { useAuthStore } from '@/stores/auth'
import { useNotifStore } from '@/stores/notificaciones'
import ConfirmHost from '@/components/ConfirmHost.vue'

const auth = useAuthStore()
const notif = useNotifStore()

// Íconos SVG line-art por tipo de notificación (sin emojis)
const ICONOS = {
  StockBajo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5v-9z"/><path d="M3 7.5l9 4.5 9-4.5"/><path d="M12 12v9"/></svg>',
  EntregaTerminada: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>',
  MermaReportada: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>',
  PedidoCreado: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 17h4"/></svg>',
  CorteCerrado: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>',
  CargaAbierta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M1 6h13v9H1zM14 9h4l3 3v3h-7z"/><circle cx="5.5" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/></svg>'
}
const ICONO_DEFAULT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9z"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>'
function iconoToast(t) { return ICONOS[t] || ICONO_DEFAULT }

watch(() => auth.autenticado, (ok) => {
  if (ok) notif.conectar(auth.token)
  else notif.desconectar()
}, { immediate: true })
</script>

<style>
.toast { position: fixed; left: 50%; transform: translateX(-50%); bottom: 24px; z-index: 4000; display: flex; align-items: center; gap: 12px; background: var(--ink, #152A24); color: #fff; border-radius: 14px; padding: 13px 16px; box-shadow: 0 18px 40px -14px rgba(0,0,0,.5); max-width: 90vw; cursor: pointer; }
.toast .ic { flex: 0 0 auto; display: grid; place-items: center; }
.toast .ic svg { width: 22px; height: 22px; }
.toast .tx .t { font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 14px; }
.toast .tx .m { font-size: 12.5px; opacity: .85; margin-top: 1px; }
.toast-enter-active, .toast-leave-active { transition: opacity .25s, transform .25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(16px); }
</style>
