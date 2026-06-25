<template>
  <div class="editor">
    <p v-if="cargando" class="muted">Cargando…</p>
    <template v-else>
      <div class="form" v-show="!exito">
        <div class="field">
          <div class="fl">Tipo de gasto *</div>
          <div class="seg">
            <button :class="{ on: form.tipo === 'Fijo' }" @click="form.tipo = 'Fijo'">
              <ion-icon :icon="repeatOutline" /> Fijo
            </button>
            <button :class="{ on: form.tipo === 'Variable' }" @click="form.tipo = 'Variable'">
              <ion-icon :icon="flashOutline" /> Variable
            </button>
          </div>
          <div class="hint">{{ form.tipo === 'Fijo' ? 'Se repite cada periodo: renta, sueldos, internet…' : 'Cambia según la operación: luz, agua, gasolina…' }}</div>
        </div>
        <div class="field"><div class="fl">Concepto *</div><input class="inp" v-model="form.concepto" placeholder="Ej. Renta de bodega"></div>
        <div class="field"><div class="fl">Monto (MXN) *</div><input class="inp" v-model="form.monto" type="number" inputmode="decimal" placeholder="0.00"></div>
        <div class="field"><div class="fl">Fecha</div><input class="inp" v-model="form.fecha" type="date"></div>
      </div>
      <p v-if="error" class="err">{{ error }}</p>
      <div class="acciones" v-show="!exito">
        <button v-if="!esNuevo" class="del" :disabled="enviando" @click="eliminar()">Eliminar</button>
        <button class="cta" :disabled="enviando || !valido" @click="guardar()">{{ enviando ? 'Guardando…' : (esNuevo ? 'Registrar gasto' : 'Guardar cambios') }}</button>
      </div>
    </template>
    <ExitoOverlay :show="exito" :titulo="exitoTit" :subtitulo="form.concepto" :detalle="exitoDet" cta-texto="Ver gastos" @done="salir" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonIcon } from '@ionic/vue'
import { repeatOutline, flashOutline } from 'ionicons/icons'
import http from '@/api/http'
import ExitoOverlay from '@/components/ExitoOverlay.vue'

const emit = defineEmits(['ctx'])
const route = useRoute()
const router = useRouter()
const esNuevo = computed(() => route.params.id === 'nuevo')
const hoyISO = new Date().toISOString().slice(0, 10)
const form = reactive({ tipo: 'Fijo', concepto: '', monto: '', fecha: hoyISO })
const cargando = ref(true), enviando = ref(false), error = ref('')
const exito = ref(false), exitoTit = ref(''), exitoDet = ref([])

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const valido = computed(() => form.concepto.trim() && Number(form.monto) > 0)
function salir() { router.replace('/panel/gastos') }
async function guardar() {
  if (!valido.value) return
  enviando.value = true; error.value = ''
  const body = { tipo: form.tipo === 'Variable' ? 1 : 0, concepto: form.concepto.trim(), monto: Number(form.monto), fecha: new Date(form.fecha).toISOString() }
  try {
    if (esNuevo.value) await http.post('/gastos', body)
    else await http.put(`/gastos/${route.params.id}`, body)
    exitoTit.value = esNuevo.value ? 'Gasto registrado' : 'Gasto actualizado'
    exitoDet.value = [{ k: 'Tipo', v: form.tipo }, { k: 'Monto', v: money(form.monto) }]
    exito.value = true
  } catch (e) { error.value = e.response?.data?.mensaje || 'No se pudo guardar el gasto.' }
  finally { enviando.value = false }
}
async function eliminar() {
  if (!confirm(`¿Eliminar el gasto "${form.concepto}" por ${money(form.monto)}?`)) return
  enviando.value = true; error.value = ''
  try { await http.delete(`/gastos/${route.params.id}`); salir() }
  catch (e) { error.value = e.response?.data?.mensaje || 'No se pudo eliminar.'; enviando.value = false }
}
onMounted(async () => {
  emit('ctx', { titulo: esNuevo.value ? 'Nuevo gasto' : 'Editar gasto', sub: '', back: '/panel/gastos' })
  if (!esNuevo.value) {
    try {
      const { data } = await http.get(`/gastos/${route.params.id}`)
      Object.assign(form, { tipo: data.tipo, concepto: data.concepto, monto: data.monto, fecha: new Date(data.fecha).toISOString().slice(0, 10) })
    } catch { error.value = 'No se pudo cargar el gasto.' }
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
.inp { width: 100%; border: 1px solid var(--line); background: var(--paper); border-radius: 11px; padding: 12px 13px; font-family: "Hanken Grotesk"; font-size: 15px; font-weight: 600; color: var(--ink); }
.seg { display: flex; gap: 8px; }
.seg button { flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px; border: 1px solid var(--line); background: var(--paper); color: var(--ink-soft); border-radius: 11px; padding: 12px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; }
.seg button ion-icon { font-size: 18px; }
.seg button.on { background: var(--pine); color: #fff; border-color: var(--pine); }
.hint { font-size: 12px; color: var(--muted); margin-top: 9px; line-height: 1.4; }
.acciones { display: flex; gap: 10px; margin-top: 18px; max-width: 480px; }
.del { border: 1px solid #E7C4B8; background: var(--clay-soft); color: var(--clay); border-radius: 14px; padding: 15px 18px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; flex: 0 0 auto; }
.del:disabled { opacity: .5; }
.cta { flex: 1; background: var(--pine); color: #fff; border: none; border-radius: 14px; padding: 15px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; cursor: pointer; box-shadow: 0 12px 22px -12px rgba(14,92,74,.8); }
.cta:disabled { opacity: .5; }
</style>
