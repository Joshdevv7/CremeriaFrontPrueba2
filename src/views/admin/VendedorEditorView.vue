<template>
  <div class="editor">
    <p v-if="cargando" class="muted">Cargando vendedor…</p>
    <template v-else>
      <div class="form" v-show="!exito">
        <div class="field">
          <div class="fl">Nombre completo *</div>
          <input class="inp" v-model="form.nombre" placeholder="Ej. Sofía Torres" autocomplete="name">
        </div>

        <div class="field">
          <div class="fl">Correo electrónico (para iniciar sesión) *</div>
          <input class="inp" v-model="form.email" type="email" placeholder="ej. sofia@distribuidora.mx" autocapitalize="off" autocomplete="username">
          <div class="field-hint">Con este correo iniciará sesión en la aplicación web o móvil.</div>
        </div>

        <div class="field">
          <div class="fl">
            Contraseña {{ esNuevo ? '*' : '' }}
            <span v-if="!esNuevo" class="op">(dejar vacío para no cambiar)</span>
          </div>
          <input class="inp" v-model="form.password" type="password" :placeholder="esNuevo ? 'Mínimo 6 caracteres' : '••••••••'" autocomplete="new-password">
        </div>

        <div class="field" v-if="esNuevo && form.password.length > 0">
          <div class="fl">Confirmar contraseña *</div>
          <input class="inp" v-model="form.passwordConfirm" type="password" placeholder="Repite la contraseña" autocomplete="new-password">
          <div v-if="form.passwordConfirm && form.password !== form.passwordConfirm" class="field-warn">Las contraseñas no coinciden.</div>
        </div>

        <div class="field toggle" v-if="!esNuevo">
          <div>
            <div class="tl">Cuenta activa</div>
            <div class="td">Si desactivas esta cuenta, el vendedor no podrá iniciar sesión en ningún dispositivo.</div>
          </div>
          <button type="button" class="sw" :class="{ on: form.activo }" @click="form.activo = !form.activo">
            <span></span>
          </button>
        </div>
      </div>

      <p v-if="error" class="err">{{ error }}</p>

      <div class="guardar-bar" v-show="!exito">
        <button class="cta" :disabled="enviando || !valido" @click="guardar()">
          {{ enviando ? 'Guardando…' : (esNuevo ? 'Crear vendedor' : 'Guardar cambios') }}
        </button>
      </div>
    </template>

    <ExitoOverlay
      :show="exito"
      :titulo="exitoTit"
      :subtitulo="form.nombre"
      :detalle="exitoDet"
      cta-texto="Volver a vendedores"
      @done="salir"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import http from '@/api/http'
import ExitoOverlay from '@/components/ExitoOverlay.vue'

const emit = defineEmits(['ctx'])
const route = useRoute()
const router = useRouter()
const esNuevo = computed(() => route.params.id === 'nuevo')

const form = reactive({
  nombre: '',
  email: '',
  password: '',
  passwordConfirm: '',
  activo: true
})

const cargando = ref(true)
const enviando = ref(false)
const error = ref('')
const exito = ref(false)
const exitoTit = ref('')
const exitoDet = ref([])

const valido = computed(() => {
  if (!form.nombre.trim() || !form.email.trim()) return false
  if (esNuevo.value) {
    if (form.password.length < 6) return false
    if (form.passwordConfirm && form.password !== form.passwordConfirm) return false
  }
  return true
})

function salir() {
  router.replace('/panel/vendedores')
}

async function guardar() {
  if (!valido.value) return
  if (esNuevo.value && form.password !== form.passwordConfirm) {
    error.value = 'Las contraseñas no coinciden.'
    return
  }

  enviando.value = true
  error.value = ''

  try {
    if (esNuevo.value) {
      await http.post(
        '/usuarios',
        { nombre: form.nombre.trim(), email: form.email.trim(), password: form.password },
        { params: { rol: 'Vendedor' } }
      )
    } else {
      const body = {
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        activo: form.activo
      }
      if (form.password) body.password = form.password
      await http.put(`/usuarios/${route.params.id}`, body)
    }

    exitoTit.value = esNuevo.value ? 'Vendedor creado' : 'Vendedor actualizado'
    exitoDet.value = [
      { k: 'Correo', v: form.email.trim() },
      { k: 'Estado', v: form.activo ? 'Activo' : 'Inactivo' }
    ]
    exito.value = true
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudo guardar el vendedor.'
  } finally {
    enviando.value = false
  }
}

onMounted(async () => {
  emit('ctx', {
    titulo: esNuevo.value ? 'Nuevo vendedor' : 'Editar vendedor',
    sub: esNuevo.value ? 'Registra una nueva cuenta para mostrador' : 'Modifica datos de acceso o estatus',
    back: '/panel/vendedores'
  })

  if (!esNuevo.value) {
    try {
      const { data } = await http.get(`/usuarios/${route.params.id}`)
      Object.assign(form, {
        nombre: data.nombre,
        email: data.email,
        password: '',
        passwordConfirm: '',
        activo: data.activo
      })
    } catch {
      error.value = 'No se pudo cargar la información del vendedor.'
    }
  }
  cargando.value = false
})
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; }
.err { color: var(--clay); font-size: 13.5px; font-weight: 600; margin: 12px 2px; }
.form { display: flex; flex-direction: column; gap: 12px; max-width: 480px; }
.field { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px 16px; box-shadow: var(--shadow); }
.fl { font-size: 11.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
.fl .op { color: #AAB3AC; font-weight: 600; text-transform: none; letter-spacing: 0; margin-left: 6px; }
.inp { width: 100%; border: 1px solid var(--line); background: var(--paper); border-radius: 11px; padding: 11px 13px; font-family: "Hanken Grotesk"; font-size: 15px; font-weight: 600; color: var(--ink); }
.inp:focus { outline: none; border-color: var(--pine); }
.field-hint { font-size: 11.5px; color: var(--muted); margin-top: 6px; }
.field-warn { font-size: 11.5px; color: var(--clay); font-weight: 600; margin-top: 6px; }

.toggle { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.tl { font-weight: 700; font-size: 14.5px; color: var(--ink); }
.td { font-size: 12px; color: var(--muted); margin-top: 2px; line-height: 1.35; }
.sw { width: 50px; height: 30px; border-radius: 16px; border: none; background: var(--line); position: relative; cursor: pointer; flex: 0 0 auto; transition: background .15s; }
.sw span { position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%; background: #fff; transition: transform .15s; box-shadow: 0 2px 4px rgba(0,0,0,.2); }
.sw.on { background: var(--pine); }
.sw.on span { transform: translateX(20px); }

.guardar-bar { margin-top: 18px; max-width: 480px; }
.cta { width: 100%; background: var(--pine); color: #fff; border: none; border-radius: 14px; padding: 14px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; cursor: pointer; box-shadow: 0 12px 22px -12px rgba(14,92,74,.8); transition: opacity .15s; }
.cta:disabled { opacity: .5; cursor: not-allowed; }
</style>
