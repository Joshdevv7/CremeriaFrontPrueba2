export function metodoPagoAbono(abono) {
  return abono.metodoPagoTexto || abono.metodo || ({
    0: 'Efectivo', 1: 'Transferencia', 2: 'Tarjeta', 3: 'Crédito'
  }[abono.metodoPago] ?? abono.metodoPago ?? 'Sin especificar')
}

export function comprobanteAbonoHistorico(abono, cliente) {
  return {
    id: abono.id ?? abono.abonoId,
    fecha: abono.fecha,
    monto: abono.monto,
    metodoPagoTexto: metodoPagoAbono(abono),
    nota: abono.nota,
    registradoPorNombre: abono.registradoPorNombre || 'No registrado',
    clienteNombre: cliente.clienteNombre,
    clienteTelefono: cliente.telefono || cliente.clienteTelefono,
    // El historial no guarda los saldos al momento del abono. No usar el saldo
    // de hoy como si fuera el que tenía el cliente cuando se recibió el pago.
    reimpresion: true
  }
}
