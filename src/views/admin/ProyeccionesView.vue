<template>
  <div>
    <p v-if="cargando" class="muted">Calculando proyección…</p>
    <p v-else-if="error" class="err">{{ error }}</p>

    <template v-else-if="data">
      <!-- Estimado + tendencia -->
      <div class="cards">
        <div class="card big">
          <div class="lbl">Estimado para {{ data.estimadoEtiqueta }}</div>
          <div class="val">{{ money(data.proximoMesEstimado) }}</div>
          <div class="hint">Promedio de ventas de los últimos meses</div>
        </div>
        <div class="card" :class="tendClase">
          <div class="lbl">Tendencia</div>
          <div class="tend"><span class="ico">{{ tendIcono }}</span>{{ tendTexto }}</div>
          <div class="hint" v-if="data.variacionPorcentaje !== 0">
            El último mes cerrado {{ data.variacionPorcentaje > 0 ? 'subió' : 'bajó' }}
            {{ Math.abs(data.variacionPorcentaje) }}% vs el promedio previo
          </div>
          <div class="hint" v-else>Sin cambios relevantes</div>
        </div>
      </div>

      <!-- Barras por mes -->
      <div class="chart">
        <div class="chart-head">Ventas por mes</div>
        <div class="bars">
          <div v-for="m in data.meses" :key="m.etiqueta" class="bar-col">
            <div class="amt">{{ montoCorto(m.ventas) }}</div>
            <div class="bar-track">
              <div class="bar" :class="{ curso: m.enCurso }" :style="{ height: altura(m.ventas) }"></div>
            </div>
            <div class="mlbl" :class="{ curso: m.enCurso }">{{ m.etiqueta }}</div>
            <div v-if="m.enCurso" class="badge">en curso</div>
          </div>
          <!-- columna estimada -->
          <div class="bar-col est">
            <div class="amt">{{ montoCorto(data.proximoMesEstimado) }}</div>
            <div class="bar-track">
              <div class="bar estimado" :style="{ height: altura(data.proximoMesEstimado) }"></div>
            </div>
            <div class="mlbl est">{{ data.estimadoEtiqueta }}</div>
            <div class="badge est">estimado</div>
          </div>
        </div>
      </div>

      <p class="nota">El estimado es una guía basada en el promedio de los meses cerrados; el mes en curso aún no termina, por eso no cuenta para el cálculo.</p>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import http from '@/api/http'

const emit = defineEmits(['ctx'])
const data = ref(null)
const cargando = ref(true)
const error = ref('')

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
function montoCorto(n) {
  n = Number(n || 0)
  if (n >= 1000) return '$' + (n / 1000).toLocaleString('es-MX', { maximumFractionDigits: 1 }) + 'k'
  return '$' + n.toLocaleString('es-MX', { maximumFractionDigits: 0 })
}
const maxVenta = computed(() => {
  if (!data.value) return 1
  const vals = data.value.meses.map((m) => m.ventas).concat([data.value.proximoMesEstimado])
  return Math.max(1, ...vals)
})
function altura(v) { return Math.max(2, (Number(v || 0) / maxVenta.value) * 100) + '%' }

const tendTexto = computed(() => ({ subiendo: 'Van subiendo', bajando: 'Van bajando', estable: 'Estables' }[data.value?.tendencia] || 'Estables'))
const tendIcono = computed(() => ({ subiendo: '↑', bajando: '↓', estable: '→' }[data.value?.tendencia] || '→'))
const tendClase = computed(() => data.value?.tendencia || 'estable')

onMounted(async () => {
  emit('ctx', { titulo: 'Proyecciones', sub: 'Estimado del próximo mes y tendencia de ventas', back: null })
  try { const { data: d } = await http.get('/proyecciones', { params: { meses: 6 } }); data.value = d }
  catch (e) { error.value = e.response?.data?.mensaje || 'No se pudo calcular la proyección.' }
  finally { cargando.value = false }
})
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; } .err { color: var(--clay); font-weight: 600; margin-top: 16px; }
.cards { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 18px; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 18px 20px; box-shadow: var(--shadow); flex: 1; min-width: 220px; }
.card.big { background: linear-gradient(135deg, var(--pine), var(--pine-deep)); border: none; color: #fff; }
.lbl { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; opacity: .85; }
.card.big .lbl { color: #CFE6DC; }
.val { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 34px; margin: 8px 0 4px; letter-spacing: -.02em; }
.hint { font-size: 12px; opacity: .8; font-weight: 500; line-height: 1.4; }
.card.big .hint { color: #BFE0D2; }
.tend { display: flex; align-items: center; gap: 8px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 24px; margin: 6px 0 4px; }
.tend .ico { font-size: 26px; }
.card.subiendo { border-color: #BDE0C9; } .card.subiendo .tend { color: var(--green); }
.card.bajando { border-color: #E7C4B8; } .card.bajando .tend { color: var(--clay); }
.card.estable .tend { color: var(--muted); }
.chart { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 20px; box-shadow: var(--shadow); }
.chart-head { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; margin-bottom: 18px; }
.bars { display: flex; align-items: flex-end; gap: 10px; height: 240px; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
.amt { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12px; color: var(--ink-soft); margin-bottom: 6px; }
.bar-track { flex: 1; width: 100%; display: flex; align-items: flex-end; justify-content: center; }
.bar { width: 70%; max-width: 46px; background: var(--pine); border-radius: 8px 8px 0 0; min-height: 2px; transition: height .4s; }
.bar.curso { background: var(--amber); }
.bar.estimado { background: repeating-linear-gradient(45deg, var(--sky), var(--sky) 6px, #4A88A6 6px, #4A88A6 12px); }
.mlbl { font-size: 11.5px; font-weight: 700; color: var(--muted); margin-top: 8px; text-transform: capitalize; }
.mlbl.curso { color: #B9781F; } .mlbl.est { color: var(--sky); }
.badge { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #B9781F; background: var(--amber-soft); border-radius: 6px; padding: 2px 6px; margin-top: 4px; }
.badge.est { color: var(--sky); background: var(--sky-soft); }
.bar-col.est .amt { color: var(--sky); }
.nota { font-size: 12px; color: var(--muted); font-weight: 500; line-height: 1.5; margin-top: 16px; }
</style>
