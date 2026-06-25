const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 })
export function useCurrency() {
  return { mxn: (n) => fmt.format(Number(n || 0)) }
}
