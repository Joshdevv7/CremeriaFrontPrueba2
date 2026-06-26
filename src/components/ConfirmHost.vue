<template>
  <transition name="conf-fade">
    <div v-if="state.visible" class="conf-ov" @click.self="cancelar">
      <div class="conf-card" :class="state.tipo">
        <div class="conf-ic">
          <!-- eliminar: bote de basura -->
          <svg v-if="state.tipo === 'eliminar'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          <!-- normal: signo de interrogación / ayuda -->
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.2 9a2.8 2.8 0 0 1 5.4 1c0 1.8-2.6 2.4-2.6 2.4"/><path d="M12 17h.01"/></svg>
        </div>

        <h3>{{ state.titulo }}</h3>
        <p v-if="state.mensaje">{{ state.mensaje }}</p>

        <div class="conf-acts">
          <button class="ghost" @click="cancelar">{{ state.textoCancelar }}</button>
          <button class="solid" @click="aceptar">{{ state.textoConfirmar }}</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { confirmState, _responder } from '@/composables/useConfirm'
const state = confirmState
function aceptar() { _responder(true) }
function cancelar() { _responder(false) }
</script>

<style scoped>
.conf-ov { position: fixed; inset: 0; z-index: 5000; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(10,40,33,.55); backdrop-filter: blur(5px); }
.conf-card { width: 100%; max-width: 380px; background: var(--surface, #FFFDF8); border: 1px solid var(--line, #E2DBCD); border-radius: 22px; padding: 26px 24px 20px; box-shadow: 0 40px 80px -30px rgba(0,0,0,.55); text-align: center; }

.conf-ic { width: 56px; height: 56px; border-radius: 16px; display: grid; place-items: center; margin: 0 auto 16px; }
.conf-ic svg { width: 28px; height: 28px; }
.conf-card.normal .conf-ic { background: var(--pine-tint, #E7F0EC); color: var(--pine, #0E5C4A); }
.conf-card.eliminar .conf-ic { background: var(--clay-soft, #F6E0D7); color: var(--clay, #C0573B); }

h3 { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 19px; letter-spacing: -.01em; color: var(--ink, #152A24); }
p { color: var(--ink-soft, #3C5048); font-size: 13.5px; font-weight: 500; line-height: 1.5; margin-top: 7px; }

.conf-acts { display: flex; gap: 10px; margin-top: 24px; }
.conf-acts button { flex: 1; border-radius: 13px; padding: 13px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14.5px; cursor: pointer; }
.conf-acts .ghost { border: 1px solid var(--line, #E2DBCD); background: var(--surface, #fff); color: var(--ink-soft, #3C5048); }
.conf-acts .solid { border: none; color: #fff; }
.conf-card.normal .solid { background: var(--pine, #0E5C4A); box-shadow: 0 12px 22px -12px rgba(14,92,74,.8); }
.conf-card.eliminar .solid { background: var(--clay, #C0573B); box-shadow: 0 12px 22px -12px rgba(192,87,59,.8); }

.conf-fade-enter-active, .conf-fade-leave-active { transition: opacity .22s ease; }
.conf-fade-enter-active .conf-card { transition: transform .22s ease; }
.conf-fade-enter-from, .conf-fade-leave-to { opacity: 0; }
.conf-fade-enter-from .conf-card { transform: scale(.94); }
</style>
