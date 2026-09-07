<template>
  <div class="proy-wrap">
    <div v-if="cargando && !data" class="loading-state">
      <div class="spinner"></div>
      <p class="muted">Calculando proyecciones y analizando tendencias…</p>
    </div>

    <div v-else-if="error" class="error-card">
      <div class="err-icon">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <div>
        <div class="err-title">Error al cargar proyecciones</div>
        <div class="err-desc">{{ error }}</div>
      </div>
      <button class="btn-retry" @click="cargar(periodoMeses)">Reintentar</button>
    </div>

    <template v-else-if="data">
      <!-- Barra superior de controles -->
      <div class="top-controls">
        <!-- Selector de Métrica: Ventas vs Utilidad Neta -->
        <div class="metric-toggle">
          <button 
            type="button" 
            class="toggle-btn" 
            :class="{ active: modo === 'ventas' }" 
            @click="modo = 'ventas'"
          >
            <svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Ventas Totales
          </button>
          <button 
            type="button" 
            class="toggle-btn" 
            :class="{ active: modo === 'utilidad' }" 
            @click="modo = 'utilidad'"
          >
            <svg viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 5l-8 4-8-4m16 5l-8 4-8-4"/></svg>
            Utilidad Neta (Ganancia)
          </button>
        </div>

        <!-- Filtro de meses históricos -->
        <div class="period-select">
          <span class="period-lbl">Historial:</span>
          <div class="period-btns">
            <button 
              type="button" 
              v-for="m in [3, 6, 12]" 
              :key="m" 
              class="p-btn" 
              :class="{ active: periodoMeses === m }" 
              @click="cambiarPeriodo(m)"
            >
              {{ m }} meses
            </button>
          </div>
        </div>
      </div>

      <!-- Tarjetas KPI -->
      <div class="cards-grid">
        <!-- Tarjeta 1: Próximo Mes Estimado (Hero) -->
        <div class="kpi-card hero-card">
          <div class="kpi-tag">Estimación Próximo Mes</div>
          <div class="kpi-period">{{ data.estimadoEtiqueta }}</div>
          <div class="kpi-val">{{ money(valorProximoMes) }}</div>
          <div class="kpi-sub">
            <span v-if="modo === 'ventas'" class="sub-pill">
              Utilidad estimada: <b>{{ money(data.proximoMesUtilidadEstimada) }}</b> ({{ data.margenPromedioPorcentaje }}% margen)
            </span>
            <span v-else class="sub-pill">
              Ventas estimadas: <b>{{ money(data.proximoMesEstimado) }}</b>
            </span>
          </div>
          <div class="kpi-foot">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            Calculado con el promedio móvil de los meses cerrados
          </div>
        </div>

        <!-- Tarjeta 2: Mes en Curso (Proyección de Cierre / Run-Rate) -->
        <div class="kpi-card">
          <div class="kpi-header">
            <div>
              <div class="kpi-tag">Mes en curso</div>
              <div class="kpi-subhead">{{ mesActualDto?.etiqueta || 'Mes actual' }} · Día {{ data.diasTranscurridos }} de {{ data.diasTotalesMes }}</div>
            </div>
            <div class="badge-run">Ritmo diario</div>
          </div>
          <div class="kpi-val secondary">{{ money(valorCierreMesActual) }}</div>
          
          <!-- Barra de progreso del mes -->
          <div class="progress-wrap">
            <div class="progress-info">
              <span>Llevas <b>{{ money(valorActualAcumulado) }}</b></span>
              <span>{{ pctMesTranscurrido }}% del mes</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: pctMesTranscurrido + '%' }"></div>
            </div>
          </div>

          <div class="kpi-foot">
            <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Ritmo: <b>{{ money(valorRitmoDiario) }} / día</b> proyectado a fin de mes
          </div>
        </div>

        <!-- Tarjeta 3: Tendencia -->
        <div class="kpi-card" :class="data.tendencia">
          <div class="kpi-tag">Tendencia del negocio</div>
          <div class="tend-row">
            <div class="tend-badge" :class="data.tendencia">
              <span class="tend-arrow">{{ tendIcono }}</span>
              <span class="tend-name">{{ tendTexto }}</span>
            </div>
            <div class="tend-pct" v-if="data.variacionPorcentaje !== 0">
              {{ data.variacionPorcentaje > 0 ? '+' : '' }}{{ data.variacionPorcentaje }}%
            </div>
          </div>
          <div class="tend-desc">
            <template v-if="data.variacionPorcentaje > 0">
              El último mes cerrado superó en <b>{{ data.variacionPorcentaje }}%</b> el promedio previo.
            </template>
            <template v-else-if="data.variacionPorcentaje < 0">
              El último mes cerrado se ubicó <b>{{ Math.abs(data.variacionPorcentaje) }}%</b> por debajo del promedio previo.
            </template>
            <template v-else>
              Las ventas se mantienen dentro de un rango estable respecto al histórico.
            </template>
          </div>
          <div class="kpi-foot">
            <svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            Umbral de variación de ±5%
          </div>
        </div>

        <!-- Tarjeta 4: Margen Operativo Promedio -->
        <div class="kpi-card">
          <div class="kpi-tag">Margen Neto Promedio</div>
          <div class="kpi-val secondary">{{ data.margenPromedioPorcentaje }}%</div>
          <div class="margin-desc">
            Rendimiento neto sobre facturación después de compras (COGS), mermas y gastos fijos/variables.
          </div>
          <div class="kpi-foot">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            Basado en meses con información contable
          </div>
        </div>
      </div>

      <!-- Gráfica de Barras Interactiva con Proyección de Cierre -->
      <div class="chart-section">
        <div class="chart-header">
          <div class="chart-title">
            <span>{{ modo === 'ventas' ? 'Ventas' : 'Utilidad Neta' }} por Periodo</span>
            <small>Histórico con proyección integrada del mes actual y próximo</small>
          </div>
          
          <div class="chart-legend">
            <div class="leg-item"><span class="leg-dot closed"></span> Mes cerrado</div>
            <div class="leg-item"><span class="leg-dot current"></span> Mes en curso (acumulado)</div>
            <div class="leg-item"><span class="leg-dot projected-cur"></span> Proyección fin de mes</div>
            <div class="leg-item"><span class="leg-dot projected-next"></span> Próximo mes estimado</div>
          </div>
        </div>

        <div class="bars-container">
          <!-- Columnas de meses históricos y mes en curso -->
          <div 
            v-for="m in data.meses" 
            :key="m.etiqueta" 
            class="bar-group" 
            :class="{ 'is-current': m.enCurso }"
          >
            <!-- Monto en la cima de la columna -->
            <div class="bar-amt">
              <template v-if="m.enCurso">
                <span class="amt-main">{{ montoCorto(modo === 'ventas' ? m.proyeccionCierre : m.proyeccionUtilidadCierre) }}</span>
                <span class="amt-sub">est.</span>
              </template>
              <template v-else>
                {{ montoCorto(modo === 'ventas' ? m.ventas : m.utilidadNeta) }}
              </template>
            </div>

            <!-- Riel de la barra -->
            <div class="bar-slot">
              <!-- Mes Cerrado Normal -->
              <div 
                v-if="!m.enCurso" 
                class="bar-fill normal" 
                :style="{ height: altura(modo === 'ventas' ? m.ventas : m.utilidadNeta) }"
                :title="`${m.etiqueta}: ${money(modo === 'ventas' ? m.ventas : m.utilidadNeta)}`"
              ></div>

              <!-- Mes en Curso Compuesto (Acumulado + Proyección Cierre) -->
              <div 
                v-else 
                class="bar-stacked" 
                :style="{ height: altura(modo === 'ventas' ? m.proyeccionCierre : m.proyeccionUtilidadCierre) }"
              >
                <!-- Fracción superior proyectada -->
                <div 
                  class="bar-segment projected" 
                  :style="{ height: alturaSegmentoProyectado(m) }"
                  :title="`Proyección restante: ${money(modo === 'ventas' ? (m.proyeccionCierre - m.ventas) : (m.proyeccionUtilidadCierre - m.utilidadNeta))}`"
                ></div>
                <!-- Fracción inferior ya acumulada -->
                <div 
                  class="bar-segment accumulated" 
                  :style="{ height: alturaSegmentoAcumulado(m) }"
                  :title="`Vendido hasta hoy: ${money(modo === 'ventas' ? m.ventas : m.utilidadNeta)}`"
                ></div>
              </div>
            </div>

            <!-- Etiqueta del mes -->
            <div class="bar-label" :class="{ 'is-current': m.enCurso }">
              {{ m.etiqueta }}
            </div>
            
            <!-- Insignia inferior -->
            <div class="bar-badge" :class="m.enCurso ? 'badge-current' : 'badge-closed'">
              {{ m.enCurso ? 'en curso' : 'cerrado' }}
            </div>
          </div>

          <!-- Columna del Próximo Mes Estimado -->
          <div class="bar-group is-estimate">
            <div class="bar-amt est">
              <span class="amt-main">{{ montoCorto(valorProximoMes) }}</span>
              <span class="amt-sub">est.</span>
            </div>

            <div class="bar-slot">
              <div 
                class="bar-fill estimate" 
                :style="{ height: altura(valorProximoMes) }"
                :title="`Estimado ${data.estimadoEtiqueta}: ${money(valorProximoMes)}`"
              ></div>
            </div>

            <div class="bar-label is-estimate">{{ data.estimadoEtiqueta }}</div>
            <div class="bar-badge badge-estimate">estimado</div>
          </div>
        </div>
      </div>

      <!-- Tabla Detallada de Rendimiento -->
      <div class="table-section">
        <div class="table-header">
          <div class="table-title">Detalle Mes a Mes</div>
          <div class="table-sub">Comparativa de ingresos, utilidades y márgenes operativos</div>
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mes</th>
                <th>Estado</th>
                <th class="num">Ventas</th>
                <th class="num">Utilidad Neta</th>
                <th class="num">Margen Real</th>
                <th class="num">Proyección Cierre</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="m in data.meses" 
                :key="m.etiqueta" 
                :class="{ 'row-current': m.enCurso }"
              >
                <td class="font-bold">{{ m.etiqueta }}</td>
                <td>
                  <span class="badge-status" :class="m.enCurso ? 'en-curso' : 'cerrado'">
                    {{ m.enCurso ? 'En curso (Día ' + data.diasTranscurridos + ')' : 'Cerrado' }}
                  </span>
                </td>
                <td class="num tabular">{{ money(m.ventas) }}</td>
                <td class="num tabular font-bold" :class="m.utilidadNeta >= 0 ? 'text-green' : 'text-clay'">
                  {{ money(m.utilidadNeta) }}
                </td>
                <td class="num tabular">
                  <span class="margin-pill">{{ m.margenPorcentaje }}%</span>
                </td>
                <td class="num tabular">
                  <template v-if="m.enCurso">
                    <span class="font-bold text-amber">{{ money(m.proyeccionCierre) }}</span>
                    <span class="text-xs text-muted block">(Ritmo: {{ money(data.ritmoDiarioActual) }}/d)</span>
                  </template>
                  <template v-else>
                    <span class="text-muted">—</span>
                  </template>
                </td>
              </tr>
              <!-- Fila del próximo mes estimado -->
              <tr class="row-estimate">
                <td class="font-bold text-sky">{{ data.estimadoEtiqueta }}</td>
                <td>
                  <span class="badge-status estimado">Proyectado</span>
                </td>
                <td class="num tabular font-bold text-sky">{{ money(data.proximoMesEstimado) }}</td>
                <td class="num tabular font-bold text-sky">{{ money(data.proximoMesUtilidadEstimada) }}</td>
                <td class="num tabular">
                  <span class="margin-pill sky">{{ data.margenPromedioPorcentaje }}%</span>
                </td>
                <td class="num tabular font-bold text-sky">{{ money(data.proximoMesEstimado) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Sección Educativa: ¿Cómo funcionan las proyecciones? -->
      <div class="guide-card">
        <div class="guide-top">
          <div class="guide-icon">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div>
            <h3 class="guide-title">¿Cómo funcionan las proyecciones en Distribuidora?</h3>
            <p class="guide-subtitle">Conoce las fórmulas y criterios matemáticos utilizados para calcular tus estimaciones.</p>
          </div>
        </div>

        <div class="guide-grid">
          <!-- Pilar 1 -->
          <div class="g-item">
            <div class="g-head">
              <span class="g-num">1</span>
              <h4>Estimado del Próximo Mes</h4>
            </div>
            <p>
              Calculamos el <b>promedio móvil ponderado</b> de los últimos meses completos cerrados. 
              Al excluir los meses incompletos, la estimación no sufre distorsiones y te permite 
              prever pedidos a proveedores con base en demanda real.
            </p>
          </div>

          <!-- Pilar 2 -->
          <div class="g-item">
            <div class="g-head">
              <span class="g-num">2</span>
              <h4>Proyección de Fin de Mes (Run-Rate)</h4>
            </div>
            <p>
              Tomamos las ventas del mes en curso y obtenemos tu <b>ritmo diario</b> (Ventas acumuladas ÷ Días transcurridos). 
              Ese ritmo se multiplica por los días totales del mes para mostrarte a qué cifra llegarás si mantienes el paso actual.
            </p>
          </div>

          <!-- Pilar 3 -->
          <div class="g-item">
            <div class="g-head">
              <span class="g-num">3</span>
              <h4>Detección de Tendencia (±5%)</h4>
            </div>
            <p>
              Compara el rendimiento del último mes cerrado contra el promedio histórico previo. 
              Si creció más del <b>+5%</b> se considera en <b>ascenso (↑)</b>; si cayó más del <b>-5%</b>, en <b>bajada (↓)</b>; 
              de lo contrario, se clasifica como <b>estable (→)</b>.
            </p>
          </div>

          <!-- Pilar 4 -->
          <div class="g-item">
            <div class="g-head">
              <span class="g-num">4</span>
              <h4>Margen y Utilidad Real</h4>
            </div>
            <p>
              La utilidad no es solo la diferencia de precios. Descuenta el <b>costo de compra de mercancía (COGS)</b>, 
              las <b>mermas físicas</b> registradas y los <b>gastos operativos</b> fijos y variables capturados en el sistema.
            </p>
          </div>
        </div>

        <div class="guide-tip">
          <svg viewBox="0 0 24 24"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
          <div>
            <b>Consejo de gestión para compras:</b> Si tu proyección de cierre supera el mes anterior o la tendencia marca ascenso, programa tus pedidos de reposición a proveedores con anticipación para asegurar volumen y evitar desabasto en ruta y mostrador.
          </div>
        </div>
      </div>
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

// Filtros y modos interactivos
const modo = ref('ventas') // 'ventas' | 'utilidad'
const periodoMeses = ref(6) // 3 | 6 | 12

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function montoCorto(n) {
  n = Number(n || 0)
  if (Math.abs(n) >= 1000) {
    return '$' + (n / 1000).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'k'
  }
  return '$' + n.toLocaleString('es-MX', { maximumFractionDigits: 0 })
}

// Mes en curso DTO
const mesActualDto = computed(() => data.value?.meses?.find((m) => m.enCurso))

// Valores reactivos según el modo seleccionado (Ventas vs Utilidad)
const valorProximoMes = computed(() => {
  if (!data.value) return 0
  return modo.value === 'ventas' ? data.value.proximoMesEstimado : data.value.proximoMesUtilidadEstimada
})

const valorCierreMesActual = computed(() => {
  if (!data.value) return 0
  return modo.value === 'ventas' ? data.value.mesActualCierreEstimado : data.value.mesActualUtilidadEstimada
})

const valorActualAcumulado = computed(() => {
  if (!mesActualDto.value) return 0
  return modo.value === 'ventas' ? mesActualDto.value.ventas : mesActualDto.value.utilidadNeta
})

const valorRitmoDiario = computed(() => {
  if (!data.value) return 0
  return modo.value === 'ventas' ? data.value.ritmoDiarioActual : data.value.ritmoDiarioUtilidad
})

const pctMesTranscurrido = computed(() => {
  if (!data.value || !data.value.diasTotalesMes) return 0
  return Math.min(100, Math.round((data.value.diasTranscurridos / data.value.diasTotalesMes) * 100))
})

// Escala de altura de la gráfica
const maxValorGrafica = computed(() => {
  if (!data.value) return 1
  const valores = data.value.meses.map((m) => {
    if (m.enCurso) {
      return modo.value === 'ventas' 
        ? Math.max(m.ventas, m.proyeccionCierre || 0)
        : Math.max(m.utilidadNeta, m.proyeccionUtilidadCierre || 0)
    }
    return modo.value === 'ventas' ? m.ventas : m.utilidadNeta
  })
  valores.push(valorProximoMes.value)
  return Math.max(1, ...valores)
})

function altura(v) {
  const n = Number(v || 0)
  if (n <= 0) return '3px'
  return Math.max(4, Math.round((n / maxValorGrafica.value) * 100)) + '%'
}

// Proporciones para la barra compuesta del mes en curso
function alturaSegmentoAcumulado(m) {
  const total = modo.value === 'ventas' ? (m.proyeccionCierre || m.ventas) : (m.proyeccionUtilidadCierre || m.utilidadNeta)
  const act = modo.value === 'ventas' ? m.ventas : m.utilidadNeta
  if (total <= 0) return '100%'
  const pct = Math.min(100, Math.max(0, (act / total) * 100))
  return pct + '%'
}

function alturaSegmentoProyectado(m) {
  const total = modo.value === 'ventas' ? (m.proyeccionCierre || m.ventas) : (m.proyeccionUtilidadCierre || m.utilidadNeta)
  const act = modo.value === 'ventas' ? m.ventas : m.utilidadNeta
  if (total <= 0) return '0%'
  const rem = Math.max(0, total - act)
  const pct = Math.min(100, Math.max(0, (rem / total) * 100))
  return pct + '%'
}

// Indicadores de tendencia
const tendTexto = computed(() => {
  const t = data.value?.tendencia
  if (t === 'subiendo') return 'En crecimiento'
  if (t === 'bajando') return 'En contracción'
  return 'Rendimiento estable'
})

const tendIcono = computed(() => {
  const t = data.value?.tendencia
  if (t === 'subiendo') return '↑'
  if (t === 'bajando') return '↓'
  return '→'
})

async function cambiarPeriodo(meses) {
  periodoMeses.value = meses
  await cargar(meses)
}

async function cargar(meses = 6) {
  cargando.value = true
  error.value = ''
  try {
    const { data: d } = await http.get('/proyecciones', { params: { meses } })
    data.value = d
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudieron obtener las proyecciones.'
  } finally {
    cargando.value = false
  }
}

onMounted(async () => {
  emit('ctx', {
    titulo: 'Proyecciones Financieras',
    sub: 'Estimado de ventas, utilidades y análisis de tendencia',
    back: null
  })
  await cargar(periodoMeses.value)
})
</script>

<style scoped>
.proy-wrap {
  padding-bottom: 40px;
}

.muted { color: var(--muted); }
.font-bold { font-weight: 700; }
.tabular { font-variant-numeric: tabular-nums; }
.text-green { color: var(--green); }
.text-clay { color: var(--clay); }
.text-amber { color: #B9781F; }
.text-sky { color: var(--sky); }
.text-xs { font-size: 11px; }
.block { display: block; }

/* Loading & Error */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
}
.spinner {
  width: 36px;
  height: 36px;
  border: 3.5px solid var(--line);
  border-top-color: var(--pine);
  border-radius: 50%;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.error-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--clay-soft);
  border: 1px solid #E2AFA0;
  border-radius: var(--radius);
  padding: 18px 22px;
  margin-top: 16px;
}
.err-icon svg {
  width: 28px;
  height: 28px;
  stroke: var(--clay);
  fill: none;
  stroke-width: 2;
}
.err-title { font-weight: 700; color: var(--clay); font-size: 15px; }
.err-desc { font-size: 13px; color: #8F3E28; margin-top: 2px; }
.btn-retry {
  margin-left: auto;
  background: var(--clay);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 8px 16px;
  font-weight: 700;
  cursor: pointer;
}

/* Barra superior de controles */
.top-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 22px;
}

.metric-toggle {
  display: flex;
  background: var(--paper-2);
  padding: 4px;
  border-radius: 14px;
  border: 1px solid var(--line);
}
.toggle-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  padding: 9px 18px;
  border-radius: 10px;
  font-family: "Hanken Grotesk", sans-serif;
  font-weight: 700;
  font-size: 13.5px;
  color: var(--muted);
  cursor: pointer;
  transition: all .2s;
}
.toggle-btn svg {
  width: 17px;
  height: 17px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2.2;
}
.toggle-btn.active {
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow);
}

.period-select {
  display: flex;
  align-items: center;
  gap: 10px;
}
.period-lbl {
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}
.period-btns {
  display: flex;
  background: var(--paper-2);
  border: 1px solid var(--line);
  padding: 3px;
  border-radius: 12px;
}
.p-btn {
  background: transparent;
  border: none;
  padding: 6px 14px;
  border-radius: 9px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
  transition: all .2s;
}
.p-btn.active {
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow);
}

/* Tarjetas KPI Grid */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.kpi-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 22px 24px;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  position: relative;
}

.hero-card {
  background: linear-gradient(140deg, var(--pine), var(--pine-deep));
  color: #fff;
  border: none;
}
.hero-card .kpi-tag { color: #A9D2C6; }
.hero-card .kpi-period { color: #E7F0EC; }
.hero-card .kpi-val { color: #fff; }
.hero-card .kpi-foot { color: #92C2B3; border-top-color: rgba(255,255,255,.15); }
.hero-card .kpi-foot svg { stroke: #92C2B3; }

.kpi-tag {
  font-size: 11.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--muted);
}
.kpi-period {
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 800;
  font-size: 18px;
  text-transform: capitalize;
  margin-top: 2px;
}
.kpi-val {
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 800;
  font-size: 34px;
  letter-spacing: -.02em;
  margin: 10px 0 6px;
  font-variant-numeric: tabular-nums;
}
.kpi-val.secondary {
  color: var(--ink);
  font-size: 30px;
}

.sub-pill {
  display: inline-block;
  font-size: 12px;
  background: rgba(255,255,255,.15);
  padding: 4px 10px;
  border-radius: 8px;
  backdrop-filter: blur(4px);
}
.sub-pill b { color: #fff; }

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.kpi-subhead {
  font-size: 12.5px;
  color: var(--muted);
  font-weight: 600;
  margin-top: 2px;
  text-transform: capitalize;
}
.badge-run {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .04em;
  background: var(--amber-soft);
  color: #9A6512;
  padding: 3px 8px;
  border-radius: 6px;
}

/* Barra de progreso de mes */
.progress-wrap {
  margin: 12px 0 8px;
}
.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 11.5px;
  color: var(--muted);
  font-weight: 600;
  margin-bottom: 6px;
}
.progress-info b { color: var(--ink); }
.progress-bar {
  height: 7px;
  background: var(--line);
  border-radius: 99px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--amber);
  border-radius: 99px;
  transition: width .4s ease;
}

.kpi-foot {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--muted);
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}
.kpi-foot svg {
  width: 14px;
  height: 14px;
  stroke: var(--muted);
  fill: none;
  stroke-width: 2.2;
  flex-shrink: 0;
}

/* Tendencia */
.tend-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 0 8px;
}
.tend-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 12px;
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 800;
  font-size: 16px;
}
.tend-badge.subiendo { background: var(--pine-tint); color: var(--pine); }
.tend-badge.bajando { background: var(--clay-soft); color: var(--clay); }
.tend-badge.estable { background: var(--sky-soft); color: var(--sky); }
.tend-arrow { font-size: 20px; }
.tend-pct {
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 800;
  font-size: 20px;
  color: var(--ink);
}
.tend-desc, .margin-desc {
  font-size: 12.5px;
  color: var(--ink-soft);
  line-height: 1.45;
  margin-bottom: 12px;
}

/* Gráfica de Barras */
.chart-section {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow);
  margin-bottom: 24px;
}
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 26px;
}
.chart-title span {
  display: block;
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 800;
  font-size: 17px;
  color: var(--ink);
}
.chart-title small {
  font-size: 12.5px;
  color: var(--muted);
  font-weight: 500;
}

.chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}
.leg-item {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-soft);
}
.leg-dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}
.leg-dot.closed { background: var(--pine); }
.leg-dot.current { background: var(--amber); }
.leg-dot.projected-cur {
  background: repeating-linear-gradient(45deg, #FBEACF, #FBEACF 3px, #E8972E 3px, #E8972E 6px);
}
.leg-dot.projected-next {
  background: repeating-linear-gradient(45deg, var(--sky-soft), var(--sky-soft) 3px, var(--sky) 3px, var(--sky) 6px);
}

.bars-container {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  height: 270px;
  padding: 10px 4px 0;
  border-bottom: 1.5px solid var(--line);
  overflow-x: auto;
}

.bar-group {
  flex: 1;
  min-width: 58px;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}
.bar-amt {
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 800;
  font-size: 12px;
  color: var(--ink-soft);
  margin-bottom: 8px;
  display: flex;
  align-items: baseline;
  gap: 2px;
}
.bar-amt.est { color: var(--sky); }
.amt-sub {
  font-size: 9.5px;
  color: var(--muted);
  font-weight: 700;
}

.bar-slot {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bar-fill {
  width: 72%;
  max-width: 54px;
  border-radius: 8px 8px 0 0;
  transition: height .4s ease;
}
.bar-fill.normal { background: var(--pine); }
.bar-fill.estimate {
  background: repeating-linear-gradient(45deg, #3A7F9E, #3A7F9E 6px, #265B75 6px, #265B75 12px);
  border: 1px solid var(--sky);
}

/* Barra compuesta (stacked) para el mes en curso */
.bar-stacked {
  width: 72%;
  max-width: 54px;
  display: flex;
  flex-direction: column;
  border-radius: 8px 8px 0 0;
  overflow: hidden;
  transition: height .4s ease;
}
.bar-segment.projected {
  width: 100%;
  background: repeating-linear-gradient(45deg, #FBEACF, #FBEACF 5px, #E8972E 5px, #E8972E 10px);
  border-top: 1.5px solid var(--amber);
}
.bar-segment.accumulated {
  width: 100%;
  background: var(--amber);
}

.bar-label {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--muted);
  margin-top: 10px;
  text-transform: capitalize;
  text-align: center;
}
.bar-label.is-current { color: #B9781F; }
.bar-label.is-estimate { color: var(--sky); }

.bar-badge {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .04em;
  border-radius: 5px;
  padding: 2px 6px;
  margin-top: 4px;
  white-space: nowrap;
}
.badge-closed { background: var(--paper-2); color: var(--muted); }
.badge-current { background: var(--amber-soft); color: #B9781F; }
.badge-estimate { background: var(--sky-soft); color: var(--sky); }

/* Tabla detallada */
.table-section {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 22px 24px;
  box-shadow: var(--shadow);
  margin-bottom: 24px;
}
.table-header {
  margin-bottom: 16px;
}
.table-title {
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 800;
  font-size: 16px;
  color: var(--ink);
}
.table-sub {
  font-size: 12px;
  color: var(--muted);
}
.table-scroll {
  overflow-x: auto;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.data-table th {
  text-align: left;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: var(--muted);
  padding: 10px 12px;
  border-bottom: 1.5px solid var(--line);
}
.data-table th.num, .data-table td.num { text-align: right; }
.data-table td {
  padding: 13px 12px;
  border-bottom: 1px solid var(--line);
  color: var(--ink);
}
.data-table tr.row-current {
  background: #FFF9F0;
}
.data-table tr.row-estimate {
  background: #F3F8FA;
}

.badge-status {
  display: inline-block;
  font-size: 10.5px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: .03em;
}
.badge-status.cerrado { background: var(--paper-2); color: var(--muted); }
.badge-status.en-curso { background: var(--amber-soft); color: #B9781F; }
.badge-status.estimado { background: var(--sky-soft); color: var(--sky); }

.margin-pill {
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 700;
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--pine-tint);
  color: var(--pine);
}
.margin-pill.sky {
  background: var(--sky-soft);
  color: var(--sky);
}

/* Guía Educativa: ¿Cómo funcionan las proyecciones? */
.guide-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 26px;
  box-shadow: var(--shadow);
}
.guide-top {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 22px;
}
.guide-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--pine-tint);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.guide-icon svg {
  width: 24px;
  height: 24px;
  stroke: var(--pine);
  fill: none;
  stroke-width: 2.2;
}
.guide-title {
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 800;
  font-size: 18px;
  color: var(--ink);
  margin: 0;
}
.guide-subtitle {
  font-size: 13px;
  color: var(--muted);
  margin-top: 3px;
}

.guide-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
  margin-bottom: 20px;
}
.g-item {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 16px 18px;
}
.g-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.g-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--pine);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.g-head h4 {
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 800;
  font-size: 13.5px;
  color: var(--ink);
  margin: 0;
}
.g-item p {
  font-size: 12px;
  line-height: 1.5;
  color: var(--ink-soft);
  margin: 0;
}
.g-item p b {
  color: var(--ink);
}

.guide-tip {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: var(--pine-tint);
  border: 1px solid #C1E1D7;
  border-radius: var(--radius-sm);
  padding: 14px 18px;
  font-size: 12.5px;
  color: var(--pine-deep);
  line-height: 1.5;
}
.guide-tip svg {
  width: 20px;
  height: 20px;
  stroke: var(--pine);
  fill: none;
  stroke-width: 2.2;
  flex-shrink: 0;
  margin-top: 1px;
}

@media (max-width: 640px) {
  .top-controls {
    flex-direction: column;
    align-items: stretch;
  }
  .metric-toggle {
    width: 100%;
  }
  .toggle-btn {
    flex: 1;
    justify-content: center;
    font-size: 12.5px;
    padding: 8px 10px;
  }
  .period-select {
    justify-content: space-between;
  }
  .bars-container {
    height: 220px;
  }
}
</style>
