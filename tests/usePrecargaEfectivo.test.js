import test from 'node:test'
import assert from 'node:assert/strict'
import { computed, effectScope, nextTick, ref } from 'vue'
import { usePrecargaEfectivo } from '../src/composables/usePrecargaEfectivo.js'

function cobro(t, { importe = 260, metodo = 'efectivo' } = {}) {
  const total = ref(importe)
  const pago = ref(metodo)
  const pendiente = ref(false)
  const scope = effectScope()
  t.after(() => scope.stop())
  const state = scope.run(() => usePrecargaEfectivo(
    total, computed(() => pago.value === 'efectivo' && !pendiente.value)
  ))
  return { ...state, total, pago, pendiente }
}

test('precarga el total y lo actualiza al ajustar mercancía', async (t) => {
  const c = cobro(t)
  assert.equal(c.efectivoRecibido.value, 260)
  c.total.value = 180
  await nextTick()
  assert.equal(c.efectivoRecibido.value, 180)
})

test('carga efectivo cuando primero se seleccionaron productos o crédito', async (t) => {
  const c = cobro(t, { importe: 0, metodo: 'credito' })
  c.total.value = 260
  await nextTick()
  assert.equal(c.efectivoRecibido.value, '')
  c.pago.value = 'efectivo'
  await nextTick()
  assert.equal(c.efectivoRecibido.value, 260)
})

test('conserva el billete escrito al cambiar la cantidad entregada', async (t) => {
  const c = cobro(t)
  c.efectivoRecibido.value = 500
  c.marcarEfectivoEditado()
  c.total.value = 340
  await nextTick()
  assert.equal(c.efectivoRecibido.value, 500)
  assert.equal(c.efectivoRecibido.value - c.total.value, 160)
})

test('respeta un importe editado incluso si coincidía con el total previo', async (t) => {
  const c = cobro(t)
  c.marcarEfectivoEditado()
  c.total.value = 300
  await nextTick()
  assert.equal(c.efectivoRecibido.value, 260)
})

test('al volver de transferencia, precarga el nuevo total en lugar del billete anterior', async (t) => {
  const c = cobro(t)
  c.efectivoRecibido.value = 500
  c.marcarEfectivoEditado()
  c.pago.value = 'transferencia'
  await nextTick()
  assert.equal(c.efectivoRecibido.value, '')
  c.total.value = 180
  c.pago.value = 'efectivo'
  await nextTick()
  assert.equal(c.efectivoRecibido.value, 180)
})

test('un pago pendiente no conserva efectivo como si se hubiera recibido', async (t) => {
  const c = cobro(t)
  c.pendiente.value = true
  await nextTick()
  assert.equal(c.efectivoRecibido.value, '')
  c.pendiente.value = false
  await nextTick()
  assert.equal(c.efectivoRecibido.value, 260)
})

test('no inventa efectivo sin productos y redondea la precarga a centavos', async (t) => {
  const c = cobro(t, { importe: 0 })
  assert.equal(c.efectivoRecibido.value, '')
  c.total.value = 0.1 + 0.2
  await nextTick()
  assert.equal(c.efectivoRecibido.value, 0.3)
})
