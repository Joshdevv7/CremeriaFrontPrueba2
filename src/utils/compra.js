export function cantidadCompra(valor) {
  const cantidad = Number(valor)
  return Number.isFinite(cantidad) ? Math.max(0, cantidad) : 0
}

export function limitesFechaCompra(desde, hasta) {
  return {
    desde: desde ? new Date(`${desde}T00:00:00.000`).toISOString() : undefined,
    hasta: hasta ? new Date(`${hasta}T23:59:59.999`).toISOString() : undefined
  }
}
