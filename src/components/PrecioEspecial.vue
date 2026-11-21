<template>
  <fieldset class="precio-especial" :disabled="disabled">
    <legend class="crm-sr-only">Precio de {{ producto }}</legend>
    <label class="activar-precio">
      <input type="checkbox" :checked="!!modelValue" @change="activar($event.target.checked)">
      Precio especial
    </label>
    <div v-if="modelValue" class="captura-precio">
      <p>Precio original {{ money(original) }} / {{ unidad }}</p>
      <label>
        Precio especial por {{ unidad }}
        <input type="number" inputmode="decimal" min="0.01" step="0.01"
          :value="modelValue.precioUnitarioEspecial" :aria-invalid="!valido"
          @input="actualizar('precioUnitarioEspecial', $event.target.value)">
      </label>
      <p v-if="!valido" class="error-precio" role="status">Ingresa un precio mayor a cero con máximo dos decimales.</p>
      <label>
        Motivo (opcional)
        <input type="text" maxlength="500" :value="modelValue.motivoPrecioEspecial"
          @input="actualizar('motivoPrecioEspecial', $event.target.value)">
      </label>
      <p>Se registrarán el precio original, el aplicado y quién hizo el cambio.</p>
    </div>
  </fieldset>
</template>

<script setup>
import { computed } from 'vue'
import { precioEspecialValido } from '@/utils/precioEspecial'

const props = defineProps({
  modelValue: { type: Object, default: null },
  original: { type: Number, required: true },
  producto: { type: String, required: true },
  unidad: { type: String, default: 'pieza' },
  disabled: Boolean
})
const emit = defineEmits(['update:modelValue'])
const valido = computed(() => precioEspecialValido(props.modelValue))
const money = importe => Number(importe || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
function activar(activo) {
  emit('update:modelValue', activo ? { precioUnitarioEspecial: props.original, motivoPrecioEspecial: '' } : null)
}
function actualizar(campo, valor) {
  emit('update:modelValue', { ...props.modelValue, [campo]: valor })
}
</script>

<style scoped>
.precio-especial { min-width: 0; margin: 12px 0 0; padding: 0; border: 0; }
.activar-precio { display: flex; align-items: center; gap: 9px; min-height: 44px; font-size: 14px; font-weight: 700; cursor: pointer; }
.activar-precio input { width: 21px; height: 21px; flex-shrink: 0; accent-color: var(--pine); }
.captura-precio { padding: 12px; background: var(--paper); border: 1px solid var(--line); border-radius: 12px; }
.captura-precio label { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; font-size: 13px; font-weight: 600; }
.captura-precio input { min-width: 0; width: 100%; min-height: 44px; padding: 10px; border: 1px solid var(--line); border-radius: 9px; color: var(--ink); background: var(--surface); font: inherit; font-size: 16px; }
.captura-precio p { margin: 6px 0 0; font-size: 12px; color: var(--ink-soft); line-height: 1.5; overflow-wrap: anywhere; }
.captura-precio .error-precio { color: var(--clay); }
</style>
