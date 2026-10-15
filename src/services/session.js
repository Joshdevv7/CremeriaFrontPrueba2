import { Capacitor } from '@capacitor/core'
import { createSessionStorage } from '../utils/sessionStorage'

export const esAndroidNativo = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
export const session = createSessionStorage(localStorage, esAndroidNativo)
