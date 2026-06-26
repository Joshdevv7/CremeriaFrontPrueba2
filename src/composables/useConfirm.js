import { reactive } from 'vue'

// Estado compartido (una sola instancia para toda la app)
export const confirmState = reactive({
  visible: false,
  titulo: '',
  mensaje: '',
  tipo: 'normal',        // 'normal' (pine) | 'eliminar' (clay)
  textoConfirmar: 'Confirmar',
  textoCancelar: 'Cancelar',
  _resolve: null
})

/**
 * Muestra el diálogo y devuelve una promesa:
 *   const ok = await confirmar({ titulo, mensaje, tipo, textoConfirmar })
 *   if (!ok) return
 */
export function confirmar(opciones = {}) {
  confirmState.titulo = opciones.titulo || '¿Estás seguro?'
  confirmState.mensaje = opciones.mensaje || ''
  confirmState.tipo = opciones.tipo || 'normal'
  confirmState.textoConfirmar = opciones.textoConfirmar || (opciones.tipo === 'eliminar' ? 'Eliminar' : 'Confirmar')
  confirmState.textoCancelar = opciones.textoCancelar || 'Cancelar'
  confirmState.visible = true
  return new Promise((resolve) => { confirmState._resolve = resolve })
}

export function useConfirm() {
  return { confirmar }
}

// Usadas internamente por ConfirmHost
export function _responder(valor) {
  confirmState.visible = false
  const r = confirmState._resolve
  confirmState._resolve = null
  if (r) r(valor)
}
