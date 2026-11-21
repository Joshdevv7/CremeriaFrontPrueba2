import test from 'node:test'
import assert from 'node:assert/strict'
import { effectScope } from 'vue'
import { useBusqueda, coincideBusqueda } from '../src/composables/useBusqueda.js'

const esperar = ms => new Promise(resolve => setTimeout(resolve, ms))

test('espera 300ms y exige tres caracteres sin consultas para uno o dos', async () => {
  const scope = effectScope()
  const busqueda = scope.run(() => useBusqueda())
  try {
    busqueda.buscar.value = 'p'
    await esperar(320)
    assert.equal(busqueda.termino.value, '')
    busqueda.buscar.value = 'pa'
    await esperar(320)
    assert.equal(busqueda.termino.value, '')
    busqueda.buscar.value = 'pan'
    await esperar(150)
    assert.equal(busqueda.termino.value, '')
    busqueda.buscar.value = 'panela'
    await esperar(170)
    assert.equal(busqueda.termino.value, '')
    await esperar(150)
    assert.equal(busqueda.termino.value, 'panela')
    busqueda.buscar.value = 'pa'
    await esperar(320)
    assert.equal(busqueda.termino.value, 'panela')
    assert.equal(busqueda.listo.value, false)
    busqueda.buscar.value = ''
    assert.equal(busqueda.termino.value, '')
  } finally { scope.stop() }
})

test('busca sin acentos en el mismo término entre campos y conserva enlaces de búsqueda', () => {
  const scope = effectScope()
  const busqueda = scope.run(() => useBusqueda('  LÁCTEOS '))
  assert.equal(busqueda.termino.value, 'lacteos')
  assert.equal(coincideBusqueda('lacteos', 'Producto', 'Lácteos', 'Proveedor'), true)
  assert.equal(coincideBusqueda('667123', 'Cliente', '6671234567'), true)
  assert.equal(coincideBusqueda('queso', 'Abarrotes', ['Queso panela']), true)
  assert.equal(coincideBusqueda('inexistente', null), false)
  scope.stop()
})

test('elimina el temporizador al salir de la vista', async () => {
  const scope = effectScope()
  const busqueda = scope.run(() => useBusqueda())
  busqueda.buscar.value = 'cliente'
  scope.stop()
  await esperar(320)
  assert.equal(busqueda.termino.value, '')
})
