import { computed, onScopeDispose, ref, watch } from 'vue'

export function normalizarBusqueda(valor) {
  return String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLocaleLowerCase('es-MX')
}

export function coincideBusqueda(termino, ...campos) {
  if (!termino) return true
  return normalizarBusqueda(campos.flat().filter(valor => valor != null).join(' ')).includes(termino)
}

export function useBusqueda(inicial = '') {
  const buscar = ref(String(inicial ?? ''))
  const normalizado = computed(() => normalizarBusqueda(buscar.value))
  const aplicado = ref(normalizado.value.length >= 3 ? normalizado.value : '')
  const listo = computed(() => !normalizado.value || normalizado.value.length >= 3)
  let temporizador

  watch(buscar, () => {
    clearTimeout(temporizador)
    if (!normalizado.value) {
      aplicado.value = ''
      return
    }
    // Un texto de uno o dos caracteres conserva la consulta aplicada sin pedir otra.
    if (!listo.value) return
    temporizador = setTimeout(() => { aplicado.value = normalizado.value }, 300)
  }, { flush: 'sync' })

  onScopeDispose(() => clearTimeout(temporizador))
  return { buscar, termino: computed(() => aplicado.value), listo }
}
