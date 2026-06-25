<template>
  <div class="editor">
    <p v-if="cargando" class="muted">Cargando…</p>
    <template v-else>
      <div class="form" v-show="!exito">
        <div class="field"><div class="fl">Nombre completo *</div><input class="inp" v-model="form.nombre" placeholder="Ej. Luis Salazar"></div>
        <div class="field"><div class="fl">Correo (para iniciar sesión) *</div><input class="inp" v-model="form.email" type="email" placeholder="ej. luis@distribuidora.mx" autocapitalize="off"></div>
        <div class="field">
          <div class="fl">Contraseña {{ esNuevo ? '*' : '' }}<span v-if="!esNuevo" class="op">(dejar vacío para no cambiar)</span></div>
          <input class="inp" v-model="form.password" type="password" :placeholder="esNuevo ? 'Mínimo 6 caracteres' : '••••••'">
        </div>
        <div class="field toggle" v-if="!esNuevo">
          <div><div class="tl">Cuenta activa</div><div class="td">Si la desactivas, no podrá iniciar sesión.</div></div>
          <button class="sw" :class="{ on: form.activo }" @click="form.activo = !form.activo"><span></span></button>
        </div>
      </div>
      <p v-if="error" class="err">{{ error }}</p>
      <div class="guardar-bar" v-show="!exito">
        <button class="cta" :disabled="enviando || !valido" @click="guardar()">{{ enviando ? 'Guardando…' : (esNuevo ? 'Crear repartidor' : 'Guardar cambios') }}</button>
      </div>
    </template>
    <ExitoOverlay :show="exito" :titulo="exitoTit" :subtitulo="form.nombre" :detalle="exitoDet" cta-texto="Ver repartidores" @done="salir" />
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
const form = reactive({ nombre: '', email: '', password: '', activo: true })
const cargando = ref(true), enviando = ref(false), error = ref('')
const exito = ref(false), exitoTit = ref(''), exitoDet = ref([])

const valido = computed(() => form.nombre.trim() && form.email.trim() && (!esNuevo.value || form.password.length >= 6))
function salir() { router.replace('/panel/repartidores') }
async function guardar() {
  if (!valido.value) return
  enviando.value = true; error.value = ''
  try {
    if (esNuevo.value) {
      await http.post('/usuarios', { nombre: form.nombre.trim(), email: form.email.trim(), password: form.password })
    } else {
      const body = { nombre: form.nombre.trim(), email: form.email.trim(), activo: form.activo }
      if (form.password) body.password = form.password
      await http.put(`/usuarios/${route.params.id}`, body)
    }
    exitoTit.value = esNuevo.value ? 'Repartidor creado' : 'Repartidor actualizado'
    exitoDet.value = [{ k: 'Correo', v: form.email.trim() }, { k: 'Estado', v: form.activo ? 'Activo' : 'Inactivo' }]
    exito.value = true
  } catch (e) { error.value = e.response?.data?.mensaje || 'No se pudo guardar.' }
  finally { enviando.value = false }
}
onMounted(async () => {
  emit('ctx', { titulo: esNuevo.value ? 'Nuevo repartidor' : 'Editar repartidor', sub: '', back: '/panel/repartidores' })
  if (!esNuevo.value) {
    try { const { data } = await http.get(`/usuarios/${route.params.id}`); Object.assign(form, { nombre: data.nombre, email: data.email, password: '', activo: data.activo }) }
    catch { error.value = 'No se pudo cargar el repartidor.' }
  }
  cargando.value = false
})
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; }
.err { color: var(--clay); font-size: 13px; font-weight: 600; margin: 12px 2px; }
.form { display: flex; flex-direction: column; gap: 11px; max-width: 480px; }
.field { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px; box-shadow: var(--shadow); }
.fl { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 9px; }
.fl .op { color: #AAB3AC; font-weight: 600; text-transform: none; letter-spacing: 0; margin-left: 6px; }
.inp { width: 100%; border: 1px solid var(--line); background: var(--paper); border-radius: 11px; padding: 12px 13px; font-family: "Hanken Grotesk"; font-size: 15px; font-weight: 600; color: var(--ink); }
.toggle { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.tl { font-weight: 700; font-size: 14px; } .td { font-size: 12px; color: var(--muted); margin-top: 2px; }
.sw { width: 50px; height: 30px; border-radius: 16px; border: none; background: var(--line); position: relative; cursor: pointer; flex: 0 0 auto; transition: background .15s; }
.sw span { position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%; background: #fff; transition: transform .15s; box-shadow: 0 2px 4px rgba(0,0,0,.2); }
.sw.on { background: var(--pine); } .sw.on span { transform: translateX(20px); }
.guardar-bar { margin-top: 18px; max-width: 480px; }
.cta { width: 100%; background: var(--pine); color: #fff; border: none; border-radius: 14px; padding: 15px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; cursor: pointer; box-shadow: 0 12px 22px -12px rgba(14,92,74,.8); }
.cta:disabled { opacity: .5; }
</style>
