<template>
  <Teleport to="body">
    <dialog ref="dialog" class="crm-dialog" :aria-labelledby="labelledby" :aria-describedby="describedby || undefined" @cancel.prevent="requestClose" @click="backdrop" @keydown.tab="keepFocus">
      <slot />
    </dialog>
  </Teleport>
</template>
<script setup>
import { nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'
const props = defineProps({ open: Boolean, labelledby: { type: String, required: true }, describedby: String, dismissible: { type: Boolean, default: true } })
const emit = defineEmits(['close'])
const dialog = ref(null)
let previousFocus = null
function requestClose() { if (props.dismissible) emit('close') }
function keepFocus(event) {
  const controls = [...dialog.value.querySelectorAll('button,input,select,textarea,a[href],[tabindex]')]
    .filter(element => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length)
  if (!controls.length) { event.preventDefault(); dialog.value.focus(); return }
  const first = controls[0], last = controls.at(-1)
  if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) {
    event.preventDefault(); last.focus()
  } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.value)) {
    event.preventDefault(); first.focus()
  }
}
function backdrop(event) {
  if (event.target !== dialog.value) return
  const rect = dialog.value.getBoundingClientRect()
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) requestClose()
}
function synchronize() {
  const element = dialog.value
  if (!element) return
  if (props.open && !element.open) {
    previousFocus = document.activeElement
    element.showModal()
    element.querySelector('[data-initial-focus]')?.focus()
  } else if (!props.open && element.open) {
    element.close()
    if (previousFocus?.isConnected) previousFocus.focus()
  }
}
watch(() => props.open, async () => { await nextTick(); synchronize() }, { flush: 'post' })
onMounted(synchronize)
onBeforeUnmount(() => { dialog.value?.close(); if (previousFocus?.isConnected) previousFocus.focus() })
</script>
<style scoped>
.crm-dialog{width:min(520px,calc(100vw - 32px));max-height:calc(100dvh - 40px);overflow:auto;border:1px solid var(--line);border-radius:18px;background:var(--surface);color:var(--ink);padding:24px;box-shadow:0 30px 80px #0a3f3340;margin:auto}
.crm-dialog::backdrop{background:rgba(21,42,36,.55);backdrop-filter:blur(3px)}
.crm-dialog :deep(:focus-visible){outline:3px solid var(--sky);outline-offset:3px}
@media(max-width:480px){.crm-dialog{padding:20px}}
</style>
