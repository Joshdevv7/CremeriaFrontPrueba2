export function precioEspecialValido(especial) {
  if (!especial) return true
  const importe = Number(especial.precioUnitarioEspecial)
  return Number.isFinite(importe) && importe > 0 && importe < 10000000000000000 &&
    Math.abs(importe * 100 - Math.round(importe * 100)) < 0.000001 &&
    (especial.motivoPrecioEspecial || '').length <= 500
}

export function precioAplicado(original, especial) {
  return especial ? Number(especial.precioUnitarioEspecial) || 0 : Number(original) || 0
}

export function datosPrecioEspecial(especial) {
  return especial ? {
    precioEspecial: true,
    precioUnitarioEspecial: Number(especial.precioUnitarioEspecial),
    motivoPrecioEspecial: especial.motivoPrecioEspecial?.trim() || null
  } : {}
}

export function cargarPrecioEspecial(linea) {
  if (!linea.precioEspecial) return null
  return {
    precioUnitarioEspecial: linea.precioUnitarioEspecial ?? linea.precioCapturado,
    motivoPrecioEspecial: linea.motivoPrecioEspecial || ''
  }
}
