<template>
  <div class="editor">
    <p v-if="cargando" class="muted">Cargando…</p>
    <template v-else>
      <div class="form" v-show="!exito">
        <div class="field">
          <div class="fl">Tipo de gasto *</div>
          <div class="seg">
            <button type="button" :class="{ on: form.tipo === 'Fijo' }" @click="form.tipo = 'Fijo'">
              <ion-icon :icon="repeatOutline" /> Fijo
            </button>
            <button type="button" :class="{ on: form.tipo === 'Variable' }" @click="form.tipo = 'Variable'">
              <ion-icon :icon="flashOutline" /> Variable
            </button>
          </div>
          <div class="hint">{{ form.tipo === 'Fijo' ? 'Se repite cada periodo: renta, sueldos, internet…' : 'Cambia según la operación: luz, gasolina, fletes…' }}</div>
        </div>

        <div class="field">
          <div class="fl">Concepto *</div>
          <input class="inp" v-model="form.concepto" placeholder="Ej. Renta de bodega o Gasolina camioneta">
          
          <!-- Sugerencias rápidas -->
          <div class="sug-wrap">
            <span class="sug-lbl">Sugerencias:</span>
            <div class="sug-list">
              <button 
                type="button" 
                v-for="s in sugerencias" 
                :key="s.nombre" 
                class="sug-btn" 
                @click="aplicarSugerencia(s)"
              >
                {{ s.nombre }}
              </button>
            </div>
          </div>
        </div>

        <div class="field">
          <div class="fl">Monto (MXN) *</div>
          <input class="inp" v-model="form.monto" type="number" step="0.01" inputmode="decimal" placeholder="0.00">
        </div>

        <div class="field">
          <div class="fl">Fecha</div>
          <input class="inp" v-model="form.fecha" type="date">
        </div>
      </div>

      <p v-if="error" class="err">{{ error }}</p>

      <div class="acciones" v-show="!exito">
        <button v-if="!esNuevo" class="del" :disabled="enviando" @click="eliminar()">Eliminar</button>
        <button class="cta" :disabled="enviando || !valido" @click="guardar()">
          {{ enviando ? 'Guardando…' : (esNuevo ? 'Registrar gasto' : 'Guardar cambios') }}
        </button>
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

const sugerencias = [
  { nombre: 'Gasolina / Combustible', tipo: 'Variable' },
  { nombre: 'Renta de bodega', tipo: 'Fijo' },
  { nombre: 'Sueldos / Nómina', tipo: 'Fijo' },
  { nombre: 'Mantenimiento de camioneta', tipo: 'Variable' },
  { nombre: 'Luz / CFE', tipo: 'Variable' },
  { nombre: 'Internet y telefonía', tipo: 'Fijo' },
  { nombre: 'Maniobra / Flete', tipo: 'Variable' }
]

function aplicarSugerencia(s) {
  form.concepto = s.nombre
  form.tipo = s.tipo
}

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const valido = computed(() => form.concepto.trim() && Number(form.monto) > 0)

function salir() { router.replace('/panel/gastos') }

async function guardar() {
  if (!valido.value) return
  enviando.value = true
  error.value = ''
  // Normalizar fecha a mediodía local para evitar desfases UTC
  const fechaIso = new Date(`${form.fecha}T12:00:00`).toISOString()
  const body = {
    tipo: form.tipo === 'Variable' ? 1 : 0,
    concepto: form.concepto.trim(),
    monto: Number(form.monto),
    fecha: fechaIso
  }
  try {
    if (esNuevo.value) await http.post('/gastos', body)
    else await http.put(`/gastos/${route.params.id}`, body)
    exitoTit.value = esNuevo.value ? 'Gasto registrado' : 'Gasto actualizado'
    exitoDet.value = [{ k: 'Tipo', v: form.tipo }, { k: 'Monto', v: money(form.monto) }]
    exito.value = true
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudo guardar el gasto.'
  } finally {
    enviando.value = false
  }
}

async function eliminar() {
  if (!confirm(`¿Eliminar el gasto "${form.concepto}" por ${money(form.monto)}?`)) return
  enviando.value = true
  error.value = ''
  try {
    await http.delete(`/gastos/${route.params.id}`)
    salir()
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudo eliminar.'
    enviando.value = false
  }
}

onMounted(async () => {
  emit('ctx', { titulo: esNuevo.value ? 'Nuevo gasto' : 'Editar gasto', sub: '', back: '/panel/gastos' })
  if (!esNuevo.value) {
    try {
      const { data } = await http.get(`/gastos/${route.params.id}`)
      Object.assign(form, {
        tipo: data.tipo,
        concepto: data.concepto,
        monto: data.monto,
        fecha: new Date(data.fecha).toISOString().slice(0, 10)
      })
    } catch {
      error.value = 'No se pudo cargar el gasto.'
    }
  }
  cargando.value = false
})
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; }
.err { color: var(--clay); font-size: 13px; font-weight: 600; margin: 12px 2px; }
.editor { max-width: 560px; margin: 0 auto; padding-bottom: 40px; }
.form { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 22px; box-shadow: var(--shadow); }
.field { margin-bottom: 18px; }
.fl { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin-bottom: 8px; }
.inp { width: 100%; border: 1.5px solid var(--line); background: var(--paper); border-radius: 12px; padding: 12px 14px; font-family: "Hanken Grotesk", sans-serif; font-size: 14.5px; font-weight: 600; color: var(--ink); }
.inp:focus { outline: none; border-color: var(--pine); }

.seg { display: flex; gap: 8px; }
.seg button {
  flex: 1;
  border: 1.5px solid var(--line);
  background: var(--paper);
  color: var(--muted);
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 800;
  font-size: 14px;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all .2s;
}
.seg button ion-icon { font-size: 18px; }
.seg button.on { border-color: var(--pine); background: var(--pine-tint); color: var(--pine-deep); }
.hint { font-size: 12px; color: var(--muted); margin-top: 6px; line-height: 1.4; }

/* Sugerencias de concepto */
.sug-wrap { margin-top: 10px; }
.sug-lbl { font-size: 11px; color: var(--muted); font-weight: 700; margin-bottom: 6px; display: block; }
.sug-list { display: flex; flex-wrap: wrap; gap: 6px; }
.sug-btn {
  background: var(--paper-2);
  border: 1px solid var(--line);
  color: var(--ink-soft);
  font-size: 11.5px;
  font-weight: 600;
  padding: 4px 9px;
  border-radius: 8px;
  cursor: pointer;
  transition: all .15s;
}
.sug-btn:hover {
  background: var(--pine-tint);
  border-color: #B2D8CD;
  color: var(--pine-deep);
}

.acciones { display: flex; gap: 12px; margin-top: 20px; }
.del {
  border: 1.5px solid #F3C4B8;
  background: var(--clay-soft);
  color: var(--clay);
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 800;
  font-size: 14px;
  padding: 14px 20px;
  border-radius: 14px;
  cursor: pointer;
}
.cta {
  flex: 1;
  border: none;
  background: var(--pine);
  color: #fff;
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 800;
  font-size: 15px;
  padding: 15px;
  border-radius: 14px;
  cursor: pointer;
  box-shadow: 0 8px 18px -6px rgba(14,92,74,.6);
}
.cta:disabled, .del:disabled { opacity: .5; }
</style>
