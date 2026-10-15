<template>
  <ion-page>
    <ion-content :scroll-y="true" class="login-bg">
      <div class="wrap">
        <div class="brand">
          <div class="mk">D</div>
          <h1>Distribuidor</h1>
          <p>Control de ruta e inventario</p>
        </div>

        <div class="card">
          <label class="fl">Correo</label>
          <input class="in" v-model="email" type="email" inputmode="email" autocomplete="username" :disabled="cargando" placeholder="admin@distribuidora.mx" />

          <label class="fl" for="login-password">Contraseña</label>
          <div class="password-field">
            <input id="login-password" class="in" v-model="password" :disabled="cargando" :type="mostrarPassword ? 'text' : 'password'" autocomplete="current-password" placeholder="••••••••" @keyup.enter="entrar" />
            <button
              class="password-toggle"
              type="button"
              :aria-label="mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              :title="mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              :aria-pressed="mostrarPassword"
              aria-controls="login-password"
              @mousedown.prevent
              @click="mostrarPassword = !mostrarPassword"
            >
              <ion-icon :icon="mostrarPassword ? eyeOffOutline : eyeOutline" aria-hidden="true" />
            </button>
          </div>

          <div v-if="esAndroidNativo && biometria.available" class="biometric-option">
            <label class="biometric-check">
              <input type="checkbox" v-model="activarAlEntrar" :disabled="cargando" />
              <span>{{ biometria.enrolled ? 'Actualizar cuenta para acceso biométrico' : 'Activar acceso con huella o rostro' }}</span>
            </label>
            <p>Actívalo solo en tu teléfono personal. Las huellas o rostros registrados en Android podrán entrar a esta cuenta.</p>
          </div>

          <p v-if="error" class="err" role="alert">{{ error }}</p>
          <p v-if="aviso" class="hint" role="status">{{ aviso }}</p>

          <button class="btn" :disabled="cargando" @click="entrar">
            {{ cargando ? 'Entrando…' : 'Entrar' }}
          </button>

          <div v-if="esAndroidNativo && biometria.enrolled" class="biometric-login">
            <p v-if="biometria.account" class="hint">Cuenta activada: <strong>{{ biometria.account }}</strong></p>
            <button class="btn biometric-btn" :disabled="cargando || !biometria.available" @click="entrarConBiometria">
              <ion-icon :icon="fingerPrintOutline" aria-hidden="true" /> Entrar con huella o rostro
            </button>
            <p class="hint">Usa la cuenta activada en este teléfono. Necesitas conexión a internet.</p>
            <button class="forget-btn" :disabled="cargando" @click="olvidarBiometria">Desactivar acceso biométrico</button>
          </div>
          <p v-if="esAndroidNativo && !biometria.available && biometria.reason" class="hint">{{ biometria.reason }}</p>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonPage, IonContent, IonIcon, onIonViewWillEnter, alertController } from '@ionic/vue'
import { eyeOutline, eyeOffOutline, fingerPrintOutline } from 'ionicons/icons'
import { useAuthStore } from '@/stores/auth'
import {
  esAndroidNativo, estadoBiometria, activarBiometria, accederConBiometria,
  desactivarBiometria, mensajeBiometria
} from '@/services/biometria'

const router = useRouter()
const auth = useAuthStore()
const email = ref('')
const password = ref('')
const mostrarPassword = ref(false)
const error = ref('')
const cargando = ref(false)
const aviso = ref('')
const activarAlEntrar = ref(false)
const biometria = ref({ available: false, enrolled: false })

async function actualizarBiometria() {
  try {
    biometria.value = await estadoBiometria()
    if (biometria.value.invalidated) aviso.value = mensajeBiometria({ code: 'INVALIDATED' })
  } catch {
    biometria.value = { available: false, enrolled: false, reason: 'Usa tu contraseña. El acceso biométrico requiere una versión actualizada de la app Android.' }
  }
}

onIonViewWillEnter(() => {
  password.value = ''
  mostrarPassword.value = false
  activarAlEntrar.value = false
  error.value = ''
  aviso.value = ''
  actualizarBiometria()
})

async function entrar() {
  if (cargando.value) return
  error.value = ''
  aviso.value = ''
  if (!email.value.trim() || !password.value) {
    error.value = 'Escribe tu correo y contraseña.'
    return
  }
  cargando.value = true
  try {
    await auth.login(email.value.trim(), password.value)
    if (esAndroidNativo && activarAlEntrar.value && biometria.value.available) {
      try {
        await activarBiometria(email.value.trim(), password.value)
      } catch (e) {
        if (e.code !== 'CANCELLED') {
          const alerta = await alertController.create({
            header: 'Acceso biométrico no activado',
            message: mensajeBiometria(e), buttons: ['Continuar']
          })
          await alerta.present()
          await alerta.onDidDismiss()
        }
      }
    }
    password.value = ''
    mostrarPassword.value = false
    await router.replace(auth.rutaInicial())
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudo iniciar sesión.'
  } finally {
    cargando.value = false
  }
}

async function entrarConBiometria() {
  if (cargando.value) return
  cargando.value = true
  error.value = ''
  aviso.value = ''
  let credentials
  try {
    credentials = await accederConBiometria()
    await auth.login(credentials.email, credentials.password)
    password.value = ''
    mostrarPassword.value = false
    await router.replace(auth.rutaInicial())
  } catch (e) {
    if (e.response?.status === 401) {
      await desactivarBiometria().catch(() => {})
      error.value = 'La cuenta o su contraseña cambió. Entra con tu contraseña y activa de nuevo el acceso biométrico.'
    } else if (e.code === 'SERVICE_CHANGED') {
      error.value = 'Entra con tu contraseña y activa la biometría para este servidor.'
    } else if (credentials) {
      error.value = 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'
    } else {
      error.value = mensajeBiometria(e)
    }
    await actualizarBiometria()
  } finally {
    if (credentials) credentials.password = ''
    cargando.value = false
  }
}

async function olvidarBiometria() {
  if (cargando.value) return
  const alerta = await alertController.create({
    header: 'Desactivar acceso biométrico',
    message: 'Se quitará de este teléfono. Podrás seguir entrando con correo y contraseña.',
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      { text: 'Desactivar', role: 'confirm' }
    ]
  })
  await alerta.present()
  const { role } = await alerta.onDidDismiss()
  if (role !== 'confirm') return
  cargando.value = true
  try {
    await desactivarBiometria()
    activarAlEntrar.value = false
    aviso.value = 'Acceso biométrico desactivado en este teléfono.'
    await actualizarBiometria()
  } catch { error.value = 'No se pudo desactivar. Inténtalo de nuevo.' }
  finally { cargando.value = false }
}
</script>

<style scoped>
.login-bg { --background: var(--paper); }
.wrap { min-height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 28px 22px; max-width: 460px; margin: 0 auto; }
.brand { text-align: center; margin-bottom: 26px; }
.brand .mk { width: 60px; height: 60px; border-radius: 17px; margin: 0 auto 14px; display: grid; place-items: center;
  background: linear-gradient(150deg, var(--pine), var(--pine-deep)); color: #fff; font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 30px;
  box-shadow: 0 12px 24px -10px rgba(14,92,74,.6); }
.brand h1 { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 26px; color: var(--ink); margin: 0; }
.brand p { color: var(--muted); font-size: 14px; margin-top: 4px; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 22px; padding: 22px; box-shadow: var(--shadow); }
.fl { display: block; font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--muted); margin: 12px 2px 7px; }
.in { width: 100%; border: 1.5px solid var(--line); border-radius: 13px; padding: 13px 14px; font-size: 15px; font-family: inherit; color: var(--ink); background: var(--paper); outline: none; }
.in:focus { border-color: var(--pine); }
.password-field { position: relative; }
.password-field .in { padding-right: 54px; }
.password-field .in::-ms-reveal { display: none; }
.password-toggle { position: absolute; top: 0; right: 4px; bottom: 0; width: 44px; display: grid; place-items: center; border: none; border-radius: 10px; background: transparent; color: var(--muted); cursor: pointer; }
.password-toggle:hover { color: var(--pine); }
.password-toggle:focus-visible { outline: 2px solid var(--pine); outline-offset: -4px; }
.password-toggle ion-icon { font-size: 22px; pointer-events: none; }
.btn { width: 100%; margin-top: 20px; border: none; border-radius: 14px; padding: 15px; background: var(--pine); color: #fff; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15.5px; cursor: pointer; }
.btn:disabled { opacity: .6; }
.err { color: var(--clay); font-size: 13.5px; font-weight: 600; margin-top: 12px; text-align: center; }
.biometric-option { margin-top: 18px; }
.biometric-check { display: flex; gap: 10px; align-items: center; color: var(--ink); font-size: 14px; font-weight: 600; }
.biometric-check input { width: 20px; height: 20px; flex-shrink: 0; accent-color: var(--pine); }
.biometric-option p, .hint { color: var(--muted); font-size: 12px; line-height: 1.5; }
.biometric-option p { margin: 8px 0 0; }
.hint { text-align: center; overflow-wrap: anywhere; }
.biometric-login { border-top: 1px solid var(--line); margin-top: 20px; padding-top: 2px; text-align: center; }
.biometric-btn { background: var(--paper); color: var(--pine); border: 1px solid var(--pine); display: flex; align-items: center; justify-content: center; gap: 8px; }
.biometric-btn ion-icon { font-size: 23px; flex-shrink: 0; }
.forget-btn { background: transparent; color: var(--muted); text-decoration: underline; font: inherit; font-size: 12px; padding: 10px; cursor: pointer; }
</style>
