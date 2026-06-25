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
          <input class="in" v-model="email" type="email" inputmode="email" placeholder="admin@distribuidora.mx" />

          <label class="fl">Contraseña</label>
          <input class="in" v-model="password" type="password" placeholder="••••••••" @keyup.enter="entrar" />

          <p v-if="error" class="err">{{ error }}</p>

          <button class="btn" :disabled="cargando" @click="entrar">
            {{ cargando ? 'Entrando…' : 'Entrar' }}
          </button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonPage, IonContent } from '@ionic/vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const email = ref('')
const password = ref('')
const error = ref('')
const cargando = ref(false)

async function entrar() {
  error.value = ''
  cargando.value = true
  try {
    await auth.login(email.value.trim(), password.value)
    router.replace(auth.rutaInicial())
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudo iniciar sesión.'
  } finally {
    cargando.value = false
  }
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
.btn { width: 100%; margin-top: 20px; border: none; border-radius: 14px; padding: 15px; background: var(--pine); color: #fff; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15.5px; cursor: pointer; }
.btn:disabled { opacity: .6; }
.err { color: var(--clay); font-size: 13.5px; font-weight: 600; margin-top: 12px; text-align: center; }
</style>
