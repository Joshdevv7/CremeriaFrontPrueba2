const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const quantity = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 3 })
export const formatMxn = (value) => currency.format(Number(value || 0))
export const formatQuantity = (value) => quantity.format(Number(value || 0))
export const deliveryLabel = (value) => ({ Abierto: 'Abierto', EnRuta: 'En ruta', CerradoCompleto: 'Completa', CerradoParcial: 'Parcial', CerradoNoEntregado: 'No entregado', Cancelado: 'Cancelada' }[value] || value || 'Sin estado')
export const deliveryTone = (value) => ({ Abierto: 'neutral', EnRuta: 'sky', CerradoCompleto: 'pine', CerradoParcial: 'amber', CerradoNoEntregado: 'clay', Cancelado: 'clay' }[value] || 'neutral')
export function lineQuantity(line, product) {
  const unit = product?.unidad
  const suffix = ({ Pieza: 'pzas', Peso: 'kg', Caja: 'cajas', 0: 'pzas', 1: 'kg', 2: 'cajas' })[unit]
  const base = `${formatQuantity(line.cantidadPedida)} ${suffix || '· Unidad sin confirmar'}`
  const factor = Number(line.piezasPorCaja)
  if (line.esCaja && suffix === 'pzas' && factor > 0) {
    const boxes = Number(line.cantidadPedida) / factor
    return `${base} · ${formatQuantity(boxes)} ${boxes === 1 ? 'caja' : 'cajas'} de ${factor}`
  }
  return base
}
