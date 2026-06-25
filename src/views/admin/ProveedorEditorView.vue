<template>
  <div class="editor">
    <p v-if="cargando" class="muted">Cargando…</p>
    <template v-else>
      <div class="form" v-show="!exito">
        <div class="field"><div class="fl">Nombre *</div><input class="inp" v-model="form.nombre" placeholder="Ej. Lácteos del Valle"></div>
        <div class="field"><div class="fl">WhatsApp <span class="op">(para reorden)</span></div><input class="inp" v-model="form.whatsapp" placeholder="Ej. 526671234567" inputmode="tel" maxlength="15" @input="filtrarWa"></div>
        <div class="field"><div class="fl">Teléfono</div><input class="inp" v-model="form.telefono" placeholder="Ej. 667 123 4567" inputmode="tel" maxlength="15"></div>
      </div>
      <p v-if="error" class="err">{{ error }}</p>
      <div class="guardar-bar" v-show="!exito">
        <button class="cta" :disabled="enviando || !form.nombre.trim()" @click="guardar()">{{ enviando ? 'Guardando…' : (esNuevo ? 'Crear proveedor' : 'Guardar cambios') }}</button>
        <button v-if="!esNuevo" class="trash" @click="desactivar()">Desactivar</button>
      </div>
    </template>
    <ExitoOverlay :show="exito" :titulo="exitoTit" :subtitulo="form.nombre" :detalle="exitoDet" cta-texto="Ver proveedores" @done="salir" />
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
const form = reactive({ nombre: '', whatsapp: '', telefono: '' })
const cargando = ref(true), enviando = ref(false), error = ref('')
const exito = ref(false), exitoTit = ref(''), exitoDet = ref([])

function salir() { router.replace('/panel/proveedores') }
function filtrarWa() { form.whatsapp = (form.whatsapp || '').replace(/[^\d ]/g, '').slice(0, 15) }
async function guardar() {
  if (!form.nombre.trim()) return
  enviando.value = true; error.value = ''
  const body = { nombre: form.nombre.trim(), whatsapp: form.whatsapp?.trim() || null, telefono: form.telefono?.trim() || null }
  try {
    if (esNuevo.value) await http.post('/proveedores', body)
    else await http.put(`/proveedores/${route.params.id}`, { ...body, activo: true })
    exitoTit.value = esNuevo.value ? 'Proveedor creado' : 'Proveedor actualizado'
    exitoDet.value = [{ k: 'WhatsApp', v: form.whatsapp || '—' }, { k: 'Teléfono', v: form.telefono || '—' }]
    exito.value = true
  } catch (e) { error.value = e.response?.data?.mensaje || 'No se pudo guardar el proveedor.' }
  finally { enviando.value = false }
}
async function desactivar() {
  if (!confirm('¿Desactivar este proveedor?')) return
  try { await http.delete(`/proveedores/${route.params.id}`); salir() }
  catch (e) { error.value = e.response?.data?.mensaje || 'No se pudo desactivar.' }
}
onMounted(async () => {
  emit('ctx', { titulo: esNuevo.value ? 'Nuevo proveedor' : 'Editar proveedor', sub: '', back: '/panel/proveedores' })
  if (!esNuevo.value) {
    try { const { data } = await http.get(`/proveedores/${route.params.id}`); Object.assign(form, { nombre: data.nombre, whatsapp: data.whatsapp || '', telefono: data.telefono || '' }) }
    catch { error.value = 'No se pudo cargar el proveedor.' }
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
.fl .op { color: #AAB3AC; font-weight: 600; text-transform: none; letter-spacing: 0; }
.inp { width: 100%; border: 1px solid var(--line); background: var(--paper); border-radius: 11px; padding: 12px 13px; font-family: "Hanken Grotesk"; font-size: 15px; font-weight: 600; color: var(--ink); }
.guardar-bar { margin-top: 18px; max-width: 480px; display: flex; gap: 10px; }
.guardar-bar .cta { flex: 1; }
.cta { background: var(--pine); color: #fff; border: none; border-radius: 14px; padding: 15px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; cursor: pointer; box-shadow: 0 12px 22px -12px rgba(14,92,74,.8); }
.cta:disabled { opacity: .5; }
.trash { border: 1px solid var(--clay-soft); background: var(--clay-soft); color: var(--clay); border-radius: 14px; padding: 15px 18px; font-family: "Bricolage Grotesque"; font-weight: 700; cursor: pointer; }
</style>
