import http from '@/api/http'

// Rastreo base (web): mientras el repartidor tenga una carga abierta (en ruta),
// envía su posición cada 30s. En el APK se reemplaza por geolocalización en
// segundo plano de Capacitor (mismo endpoint).
const INTERVALO_MS = 30000

let timer = null

async function tick(repartidorId) {
  if (!repartidorId || !navigator.geolocation) return
  // ¿está en ruta? (tiene carga abierta)
  try {
    await http.get(`/cargas/repartidor/${repartidorId}/abierta`)
  } catch {
    return // 404 = sin carga abierta -> no rastrear
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        await http.post('/recorridos/punto', {
          repartidorId,
          latitud: pos.coords.latitude,
          longitud: pos.coords.longitude
        })
      } catch { /* silencioso */ }
    },
    () => { /* sin permiso o sin señal: omitir */ },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
  )
}

export function iniciarRastreo(repartidorId) {
  detenerRastreo()
  if (!repartidorId) return
  tick(repartidorId)
  timer = setInterval(() => tick(repartidorId), INTERVALO_MS)
}

export function detenerRastreo() {
  if (timer) { clearInterval(timer); timer = null }
}
