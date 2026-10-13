import { formatMxn } from '../utils/crmPresentation.js'
export function useCurrency() {
  return { mxn: formatMxn }
}
