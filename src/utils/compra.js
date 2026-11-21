export function cantidadCompra(valor) {
  const cantidad = Number(valor)
  return Number.isFinite(cantidad) ? Math.max(0, cantidad) : 0
}

export function factorCompra(producto, unidad) {
  const factor = Number(producto?.piezasPorCaja)
  return unidad === 'caja' && producto?.vendePorCaja && Number.isInteger(factor) && factor >= 2 ? factor : 1
}

export function unidadBaseCompra(producto) {
  if (producto?.unidad === 'Peso' || producto?.unidad === 1) return { singular: 'kg', plural: 'kg' }
  if (producto?.unidad === 'Caja' || producto?.unidad === 2) return { singular: 'caja', plural: 'cajas' }
  return { singular: 'pieza', plural: 'piezas' }
}

export function costoCompraValido(valor) {
  const costo = Number(valor)
  return Number.isFinite(costo) && costo > 0 && Number(costo.toFixed(8)) === costo
}

export function convertirCostoCompra(valor, factorOrigen, factorDestino) {
  if (valor === '' || valor == null || !Number.isFinite(Number(valor))) return valor ?? ''
  // The API accepts eight decimal places. Keep the original captured cost in
  // the editor so repeated presentation changes never accumulate rounding.
  return Number((Number(valor) * factorDestino / factorOrigen).toFixed(8))
}

function fraccionDecimal(valor) {
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return [0n, 1n]
  const [coeficiente, exponente = '0'] = String(numero).split('e')
  const [entero, decimales = ''] = coeficiente.split('.')
  const numerador = BigInt(entero + decimales)
  const escala = decimales.length - Number(exponente)
  return escala < 0
    ? [numerador * 10n ** BigInt(-escala), 1n]
    : [numerador, 10n ** BigInt(escala)]
}

function redondearAlPar(numerador, denominador) {
  const signo = numerador < 0n ? -1n : 1n
  const absoluto = numerador * signo
  const entero = absoluto / denominador
  const dobleResto = (absoluto % denominador) * 2n
  const subir = dobleResto > denominador || (dobleResto === denominador && entero % 2n !== 0n)
  return signo * (entero + (subir ? 1n : 0n))
}

export function subtotalCompraCentavos(cantidad, costo) {
  if (!(Number(cantidad) > 0) || !(Number(costo) > 0)) return 0n
  const [cantidadN, cantidadD] = fraccionDecimal(cantidad)
  const [costoN, costoD] = fraccionDecimal(costo)
  // CompraManager rounds each line to cents with decimal MidpointToEven.
  // Decimal fractions avoid binary rounding before that contractual step.
  return redondearAlPar(cantidadN * costoN * 100n, cantidadD * costoD)
}

export function costoPromedioCompra(stockActual, costoActual, cantidad, costo, factor = 1) {
  const [cantidadN, cantidadD] = fraccionDecimal(cantidad)
  const cantidadBaseN = cantidadN * BigInt(factor)
  if (cantidadBaseN <= 0n) return Number(costoActual) || 0
  const centavos = subtotalCompraCentavos(cantidad, costo)
  const [stockN, stockD] = fraccionDecimal(stockActual)
  let importeN = centavos
  let importeD = 100n
  let stockNuevoN = cantidadBaseN
  let stockNuevoD = cantidadD
  if (stockN > 0n) {
    const [costoN, costoD] = fraccionDecimal(costoActual)
    importeN = stockN * costoN * 100n + centavos * stockD * costoD
    importeD = stockD * costoD * 100n
    stockNuevoN = stockN * cantidadD + cantidadBaseN * stockD
    stockNuevoD = stockD * cantidadD
  }
  // CompraDao uses the rounded invoice line amount, then rounds CPP to four
  // decimals, including when there was no previous stock.
  return Number(redondearAlPar(importeN * stockNuevoD * 10000n, importeD * stockNuevoN)) / 10000
}

export function limitesFechaCompra(desde, hasta) {
  return {
    desde: desde ? new Date(`${desde}T00:00:00.000`).toISOString() : undefined,
    hasta: hasta ? new Date(`${hasta}T23:59:59.999`).toISOString() : undefined
  }
}
