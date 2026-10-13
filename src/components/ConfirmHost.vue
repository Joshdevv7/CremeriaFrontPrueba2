<template><CrmDialog :open="state.visible" labelledby="confirm-title" :describedby="state.mensaje ? 'confirm-description' : undefined" @close="cancelar"><div class="confirm-content" :class="state.tipo"><div class="confirm-icon"><CrmIcon :name="state.tipo === 'eliminar' ? 'trash' : 'help'" /></div><h2 id="confirm-title">{{ state.titulo }}</h2><p v-if="state.mensaje" id="confirm-description">{{ state.mensaje }}</p><div class="crm-dialog-actions"><button class="crm-button" data-initial-focus @click="cancelar">{{ state.textoCancelar }}</button><button class="crm-button" :class="state.tipo === 'eliminar' ? 'delete-confirm' : 'primary'" @click="aceptar">{{ state.textoConfirmar }}</button></div></div></CrmDialog></template>
<script setup>
import { confirmState as state, _responder } from '@/composables/useConfirm'
import CrmDialog from '@/components/CrmDialog.vue'
import CrmIcon from '@/components/CrmIcon.vue'
function aceptar(){_responder(true)}
function cancelar(){_responder(false)}
</script>
<style scoped>.confirm-content{text-align:center}.confirm-icon{width:56px;height:56px;border-radius:16px;display:grid;place-items:center;margin:0 auto 18px;background:var(--pine-tint);color:var(--pine)}.confirm-icon :deep(svg){width:28px;height:28px}.eliminar .confirm-icon{color:var(--clay);background:var(--clay-soft)}h2{font-size:21px;margin:0;font-weight:700}p{font-size:14px;color:var(--ink-soft);line-height:1.65;margin:9px 0 0}.crm-dialog-actions{justify-content:stretch}.crm-dialog-actions button{flex:1}.delete-confirm{background:var(--clay);color:#fff;border-color:var(--clay)}</style>
