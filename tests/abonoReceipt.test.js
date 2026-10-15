import test from 'node:test'
import assert from 'node:assert/strict'
import { comprobanteAbonoHistorico, metodoPagoAbono } from '../src/utils/abonoReceipt.js'

test('reimprimir conserva el pago original sin inventar los saldos con la deuda de hoy', () => {
  const comprobante = comprobanteAbonoHistorico({
    id: 42, monto: 200, fecha: '2026-09-01T15:30:00Z', metodo: 'Transferencia',
    registradoPorNombre: 'Repartidor original', nota: 'SPEI-42'
  }, { clienteNombre: 'Cliente liquidado', telefono: '6671234567', saldo: 0 })

  assert.equal(comprobante.id, 42)
  assert.equal(comprobante.fecha, '2026-09-01T15:30:00Z')
  assert.equal(comprobante.registradoPorNombre, 'Repartidor original')
  assert.equal(comprobante.metodoPagoTexto, 'Transferencia')
  assert.equal(comprobante.monto, 200)
  assert.equal(comprobante.nota, 'SPEI-42')
  assert.equal(comprobante.reimpresion, true)
  assert.equal(Object.hasOwn(comprobante, 'saldoAnterior'), false)
  assert.equal(Object.hasOwn(comprobante, 'saldoRestante'), false)
})

test('recupera folios y métodos de las distintas respuestas sin atribuir un cobro desconocido', () => {
  const comprobante = comprobanteAbonoHistorico({
    abonoId: 7, metodoPago: 1, monto: 150, fecha: '2026-10-01T16:00:00Z'
  }, { clienteNombre: 'Cliente de prueba', clienteTelefono: '6671234567' })

  assert.equal(comprobante.id, 7)
  assert.equal(comprobante.metodoPagoTexto, 'Transferencia')
  assert.equal(comprobante.registradoPorNombre, 'No registrado')
  assert.equal(comprobante.clienteTelefono, '6671234567')
  assert.equal(metodoPagoAbono({ metodoPago: 0 }), 'Efectivo')
  assert.equal(metodoPagoAbono({ metodoPago: 'Transferencia' }), 'Transferencia')
  assert.equal(metodoPagoAbono({}), 'Sin especificar')
})
