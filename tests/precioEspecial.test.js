import test from 'node:test'
import assert from 'node:assert/strict'
import { precioEspecialValido, precioAplicado, datosPrecioEspecial, cargarPrecioEspecial } from '../src/utils/precioEspecial.js'

test('precio normal conserva el catálogo y omite overrides en clientes anteriores', () => {
  assert.equal(precioAplicado(17.5, null), 17.5)
  assert.deepEqual(datosPrecioEspecial(null), {})
  assert.equal(cargarPrecioEspecial({ precioUnitario: 17.5 }), null)
})

test('precio especial exige importe válido por la unidad capturada y preserva centavos', () => {
  for (const precio of ['', 0, -1, 'NaN', 'Infinity', 1.234, 10000000000000000]) {
    assert.equal(precioEspecialValido({ precioUnitarioEspecial: precio }), false)
  }
  const especial = { precioUnitarioEspecial: '110.50', motivoPrecioEspecial: ' Acuerdo cliente ' }
  assert.equal(precioEspecialValido(especial), true)
  assert.equal(precioAplicado(160, especial), 110.5)
  assert.deepEqual(datosPrecioEspecial(especial), { precioEspecial: true, precioUnitarioEspecial: 110.5, motivoPrecioEspecial: 'Acuerdo cliente' })
})

test('recupera el precio especial por caja guardado sin recalcularlo desde el catálogo', () => {
  assert.deepEqual(cargarPrecioEspecial({ precioEspecial: true, precioUnitarioEspecial: 100, precioUnitario: 4.166666666667, motivoPrecioEspecial: null }),
    { precioUnitarioEspecial: 100, motivoPrecioEspecial: '' })
  assert.equal(precioEspecialValido({ precioUnitarioEspecial: 100, motivoPrecioEspecial: 'x'.repeat(501) }), false)
})
