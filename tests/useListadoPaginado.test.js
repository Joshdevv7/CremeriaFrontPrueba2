import test from 'node:test'
import assert from 'node:assert/strict'
import { effectScope, nextTick, ref } from 'vue'
import { useListadoPaginado } from '../src/composables/useListadoPaginado.js'

function pendiente() { let resolve, reject; const promise = new Promise((ok, fail) => { resolve = ok; reject = fail }); return { promise, resolve, reject } }
const respuesta = (pagina, total = 63, nombre = 'Registro') => ({ data: { items: [{ id: pagina, nombre }], total, pagina, tamanoPagina: 20 } })

test('pide una página de 20 y lleva búsqueda y filtros al servidor; cambiar filtro reinicia página', async () => {
  const scope = effectScope(), filtro = ref('todos'), termino = ref(''), solicitudes = []
  const listado = scope.run(() => useListadoPaginado({ filtros: () => ({ filtro: filtro.value, buscar: termino.value || undefined }), obtenerPagina: async config => { solicitudes.push(config); return respuesta(config.params.pagina) } }))
  try {
    await listado.cargar()
    assert.equal(solicitudes.length, 1)
    assert.deepEqual(solicitudes[0].params, { filtro: 'todos', buscar: undefined, pagina: 1, tamano: 20 })
    listado.irPagina(3); await nextTick(); await nextTick()
    assert.equal(listado.pagina.value, 3)
    termino.value = 'queso'; filtro.value = 'gps'; await nextTick(); await nextTick(); await nextTick()
    assert.equal(listado.pagina.value, 1)
    assert.equal(solicitudes.at(-1).params.buscar, 'queso')
    assert.equal(solicitudes.at(-1).params.filtro, 'gps')
    assert.equal(listado.total.value, 63)
  } finally { scope.stop() }
})

test('cancela solicitudes anteriores e ignora resultados y errores fuera de orden', async () => {
  const scope = effectScope(), solicitudes = []
  const listado = scope.run(() => useListadoPaginado({ obtenerPagina: config => { const p = pendiente(); solicitudes.push({ ...p, config }); return p.promise } }))
  const old = listado.cargar(), recent = listado.cargar()
  assert.equal(solicitudes[0].config.signal.aborted, true)
  solicitudes[1].resolve(respuesta(1, 1, 'Nuevo')); await recent
  solicitudes[0].resolve(respuesta(1, 63, 'Antiguo')); await old
  assert.equal(listado.items.value[0].nombre, 'Nuevo')
  assert.equal(listado.total.value, 1)
  const failure = listado.cargar(), success = listado.cargar()
  solicitudes[3].resolve(respuesta(1, 2, 'Vigente')); await success
  solicitudes[2].reject(new Error('Respuesta antigua')); await failure
  assert.equal(listado.error.value, '')
  scope.stop()
  assert.equal(solicitudes[3].config.signal.aborted, true)
})

test('valida metadatos, permite reintentar y no publica resultados después de salir', async () => {
  const scope = effectScope(), next = pendiente(); let fail = true
  const listado = scope.run(() => useListadoPaginado({ obtenerPagina: () => fail ? Promise.resolve({ data: { items: [], total: 63, pagina: 1, tamanoPagina: 100 } }) : next.promise }))
  await listado.cargar(); assert.match(listado.error.value, /No se pudo cargar/)
  fail = false; const retry = listado.cargar(); scope.stop(); next.resolve(respuesta(1)); await retry
  assert.deepEqual(listado.items.value, [])
})

test('resumen filtrado permanece independiente de la página y descarta resúmenes antiguos', async () => {
  const scope = effectScope(), filtro = ref('todos'), summaries = []
  const listado = scope.run(() => useListadoPaginado({ filtros: () => ({ filtro: filtro.value }), resumenSigueFiltros: true,
    obtenerPagina: async c => respuesta(c.params.pagina), obtenerResumen: config => { const p = pendiente(); summaries.push({ ...p, config }); return p.promise } }))
  try {
    const first = listado.actualizar(); filtro.value = 'gps'; await nextTick()
    assert.equal(summaries[0].config.signal.aborted, true)
    summaries[1].resolve({ data: { cantidad: 10 } }); await nextTick(); await nextTick()
    summaries[0].resolve({ data: { cantidad: 63 } }); await first
    assert.equal(listado.resumen.value.cantidad, 10)
    listado.irPagina(2); await nextTick(); await nextTick()
    assert.equal(summaries.length, 2)
    assert.equal(summaries[1].config.params.filtro, 'gps')
  } finally { scope.stop() }
})
