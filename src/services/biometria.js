import { registerPlugin } from '@capacitor/core'
import { esAndroidNativo } from './session'

const BiometricLogin = registerPlugin('BiometricLogin')
const service = import.meta.env.VITE_API_URL || 'https://localhost:58226/api'

export { esAndroidNativo }
export const estadoBiometria = () => esAndroidNativo
  ? BiometricLogin.getStatus()
  : Promise.resolve({ available: false, enrolled: false })
export const activarBiometria = (email, password) => BiometricLogin.enroll({ email, password, service })
export const accederConBiometria = () => BiometricLogin.unlock({ service })
export const desactivarBiometria = () => BiometricLogin.clear()

export function mensajeBiometria(error) {
  if (error?.code === 'CANCELLED') return ''
  if (error?.code === 'INVALIDATED') return 'Cambió la seguridad del teléfono. Entra con tu contraseña y activa de nuevo el acceso biométrico.'
  if (error?.code === 'LOCKED_OUT') return 'El lector está bloqueado temporalmente. Usa tu contraseña o inténtalo más tarde.'
  if (error?.code === 'UNAVAILABLE') return 'No hay biometría compatible disponible. Configúrala en los ajustes de Android o usa tu contraseña.'
  return 'No se pudo usar el acceso biométrico. Puedes entrar con tu contraseña.'
}
