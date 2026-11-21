import http from '@/api/http'

export async function listarPaginas(ruta, filtros = {}, opciones = {}) {
  const registros = []
  for (let pagina = 1; ; pagina++) {
    const { data } = await http.get(ruta, { ...opciones, params: { ...filtros, pagina, tamano: 100 } })
    const { items, total, tamanoPagina } = data
    if (!Array.isArray(items) || !Number.isInteger(total) || !Number.isInteger(tamanoPagina)
      || tamanoPagina < 1 || data.pagina !== pagina) {
      throw new Error('Respuesta de catálogo inválida')
    }
    registros.push(...items)
    if (pagina * tamanoPagina >= total) return registros
    if (items.length === 0) throw new Error('Página de catálogo incompleta')
  }
}
