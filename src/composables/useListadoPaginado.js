import { computed, onScopeDispose, ref, watch } from 'vue'

// Cada consulta conserva solamente una página. El resumen se obtiene por separado.
export function useListadoPaginado({ obtenerPagina, filtros = () => ({}), obtenerResumen, resumenSigueFiltros = false }) {
  const items = ref([]), total = ref(0), pagina = ref(1), cargando = ref(true), error = ref('')
  const resumen = ref(null), cargandoResumen = ref(false), errorResumen = ref('')
  const tamano = 20
  const totalPaginas = computed(() => Math.max(1, Math.ceil(total.value / tamano)))
  const paginasVisibles = computed(() => {
    const inicio = Math.max(1, Math.min(pagina.value - 2, totalPaginas.value - 4))
    return Array.from({ length: Math.min(5, totalPaginas.value) }, (_, i) => inicio + i)
  })
  let controller, resumenController, solicitud = 0, solicitudResumen = 0, disposed = false

  async function cargar() {
    const actual = ++solicitud, paginaSolicitada = pagina.value
    controller?.abort()
    controller = new AbortController()
    cargando.value = true
    error.value = ''
    try {
      const { data } = await obtenerPagina({ params: { ...filtros(), pagina: paginaSolicitada, tamano }, signal: controller.signal })
      if (disposed || actual !== solicitud) return
      if (!Array.isArray(data.items) || !Number.isInteger(data.total) || data.total < 0
        || data.pagina !== paginaSolicitada || data.tamanoPagina !== tamano || data.items.length > tamano) {
        throw new Error('Respuesta de listado inválida')
      }
      total.value = data.total
      if (pagina.value > totalPaginas.value) { pagina.value = totalPaginas.value; return }
      items.value = data.items
    } catch (e) {
      if (!disposed && actual === solicitud && e.code !== 'ERR_CANCELED' && e.name !== 'AbortError') {
        items.value = []
        error.value = e.response?.data?.mensaje || 'No se pudo cargar el listado. Revisa tu conexión y vuelve a intentar.'
      }
    } finally { if (!disposed && actual === solicitud) cargando.value = false }
  }

  async function cargarResumen() {
    if (!obtenerResumen) return
    const actual = ++solicitudResumen
    resumenController?.abort()
    resumenController = new AbortController()
    cargandoResumen.value = true
    errorResumen.value = ''
    try {
      const { data } = await obtenerResumen({ params: resumenSigueFiltros ? filtros() : undefined, signal: resumenController.signal })
      if (!disposed && actual === solicitudResumen) resumen.value = data
    } catch (e) {
      if (!disposed && actual === solicitudResumen && e.code !== 'ERR_CANCELED' && e.name !== 'AbortError') {
        resumen.value = null
        errorResumen.value = 'No se pudo cargar el resumen. Vuelve a intentar.'
      }
    } finally { if (!disposed && actual === solicitudResumen) cargandoResumen.value = false }
  }

  function irPagina(n) { if (!cargando.value && n >= 1 && n <= totalPaginas.value) pagina.value = n }
  function actualizar() { return Promise.all([cargar(), cargarResumen()]) }
  watch(pagina, cargar)
  watch(filtros, () => {
    if (pagina.value !== 1) pagina.value = 1
    else cargar()
    if (resumenSigueFiltros) cargarResumen()
  }, { deep: true })
  onScopeDispose(() => { disposed = true; controller?.abort(); resumenController?.abort() })
  return { items, total, pagina, tamano, totalPaginas, paginasVisibles, cargando, error, resumen,
    cargandoResumen, errorResumen, cargar, cargarResumen, actualizar, irPagina }
}
