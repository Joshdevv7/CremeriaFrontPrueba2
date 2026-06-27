import { Capacitor } from '@capacitor/core'

const esNativo = () => Capacitor.isNativePlatform()

/**
 * Toma una foto. En APK usa la cámara nativa de Capacitor (foto al momento).
 * En web devuelve null (la vista usa el <input type=file> como antes).
 * Devuelve un File listo para subir con FormData, o null.
 */
export async function tomarFotoNativa() {
  if (!esNativo()) return null
  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
  const foto = await Camera.getPhoto({
    quality: 70,
    allowEditing: false,
    resultType: CameraResultType.DataUrl, // data:image/jpeg;base64,...
    source: CameraSource.Camera,          // SOLO cámara, sin galería (evidencia real)
    saveToGallery: false,
    promptLabelHeader: 'Foto de entrega',
    promptLabelCancel: 'Cancelar',
    promptLabelPhoto: 'Tomar foto'
  })
  // Convertir dataUrl -> Blob -> File para reusar la misma subida que la web
  const resp = await fetch(foto.dataUrl)
  const blob = await resp.blob()
  const ext = (foto.format || 'jpeg').replace('jpg', 'jpeg')
  return new File([blob], `entrega.${ext === 'jpeg' ? 'jpg' : ext}`, { type: blob.type || 'image/jpeg' })
}

/**
 * Obtiene la ubicación. En APK usa el GPS nativo (más preciso y pide permiso).
 * En web usa navigator.geolocation. Devuelve { lat, lng } o lanza error.
 */
export async function obtenerUbicacion() {
  if (esNativo()) {
    const { Geolocation } = await import('@capacitor/geolocation')
    // Pide permiso explícitamente (Android lo exige)
    try {
      const perm = await Geolocation.checkPermissions()
      if (perm.location !== 'granted') {
        const pedido = await Geolocation.requestPermissions()
        if (pedido.location !== 'granted') throw new Error('Permiso de ubicación denegado')
      }
    } catch { /* algunos dispositivos no soportan checkPermissions; intentamos directo */ }

    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 })
    return { lat: pos.coords.latitude, lng: pos.coords.longitude }
  }

  // Web: navigator.geolocation con promesa
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Geolocalización no disponible')); return }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    )
  })
}

export { esNativo }
