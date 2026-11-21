import test from 'node:test'
import assert from 'node:assert/strict'
import { cantidadCompra, limitesFechaCompra } from '../src/utils/compra.js'

test('cantidades por peso conservan decimales y no invierten negativos', () => {
  assert.equal(cantidadCompra('1.125'), 1.125)
  assert.equal(cantidadCompra('-2'), 0)
  assert.equal(cantidadCompra(''), 0)
  assert.equal(cantidadCompra('abc'), 0)
})

test('filtro hasta incluye el día local completo', () => {
  const { desde, hasta } = limitesFechaCompra('2026-11-20', '2026-11-20')
  assert.equal(new Date(desde).getHours(), 0)
  assert.equal(new Date(hasta).getHours(), 23)
  assert.equal(new Date(hasta).getMinutes(), 59)
  assert.equal(new Date(hasta).getSeconds(), 59)
  assert.equal(new Date(hasta).getMilliseconds(), 999)
  assert.equal(new Date(hasta).getDate(), 20)
})
