import { ref, watch } from 'vue'

// El total se precarga mientras el usuario no haya indicado cuánto recibió.
// Al cambiar de método o marcar pago pendiente, se descarta el importe anterior.
export function usePrecargaEfectivo(total, esEfectivo) {
  const efectivoRecibido = ref('')
  const editado = ref(false)

  watch([total, esEfectivo], ([importe, efectivo]) => {
    if (!efectivo) {
      efectivoRecibido.value = ''
      editado.value = false
      return
    }
    if (!editado.value) {
      efectivoRecibido.value = importe > 0 ? Math.round(importe * 100) / 100 : ''
    }
  }, { immediate: true })

  function marcarEfectivoEditado() {
    editado.value = true
  }

  return { efectivoRecibido, marcarEfectivoEditado }
}
