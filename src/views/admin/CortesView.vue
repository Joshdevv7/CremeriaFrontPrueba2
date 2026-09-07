<template>
  <div class="cortes-wrap">
    <!-- Resumen KPI de Cortes -->
    <div class="resumen-grid">
      <div class="rc-card">
        <div class="rc-lbl">Cortes registrados</div>
        <div class="rc-val">{{ total }}</div>
        <div class="rc-sub">Total en el periodo</div>
      </div>
      <div class="rc-card">
        <div class="rc-lbl">Ventas totales cortadas</div>
        <div class="rc-val">{{ money(kpiTotalVentas) }}</div>
        <div class="rc-sub">Ingresos auditados</div>
      </div>
      <div class="rc-card" :class="{ 'has-faltante': kpiTotalFaltante > 0 }">
        <div class="rc-lbl">Faltante por justificar</div>
        <div class="rc-val" :class="kpiTotalFaltante > 0 ? 'text-clay' : ''">{{ money(kpiTotalFaltante) }}</div>
        <div class="rc-sub">{{ conteoIncompletos }} corte(s) incompletos</div>
      </div>
      <div class="rc-card">
        <div class="rc-lbl">Mercancía devuelta</div>
        <div class="rc-val">{{ money(kpiTotalDevuelto) }}</div>
        <div class="rc-sub">Reingresada al almacén</div>
      </div>
    </div>

    <!-- Barra de Filtros de Periodo y Búsqueda -->
    <div class="filtros-bar">
      <div class="filtros-left">
        <!-- Selector de periodo -->
        <div class="tabs-group">
          <button class="f-tab" :class="{ on: periodo === 'todos' }" @click="setPeriodo('todos')">Todos</button>
          <button class="f-tab" :class="{ on: periodo === 'hoy' }" @click="setPeriodo('hoy')">Hoy</button>
          <button class="f-tab" :class="{ on: periodo === 'personalizado' }" @click="setPeriodo('personalizado')">Rango</button>
        </div>

        <!-- Selector de fechas cuando es personalizado -->
        <div v-if="periodo === 'personalizado'" class="custom-dates">
          <div class="fld"><span class="fl">Desde</span><input type="date" v-model="fechaDesde" @change="pagina = 1; cargar()"></div>
          <div class="fld"><span class="fl">Hasta</span><input type="date" v-model="fechaHasta" @change="pagina = 1; cargar()"></div>
        </div>
      </div>

      <!-- Buscador -->
      <div class="search-box">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input 
          v-model="busqueda" 
          placeholder="Buscar repartidor, vendedor, corte #…"
        >
        <button v-if="busqueda" class="clear-btn" @click="busqueda = ''">×</button>
      </div>
    </div>

    <!-- Filtros por estado del corte -->
    <div class="chips-bar">
      <button class="chip" :class="{ on: filtro === 'todos' }" @click="setFiltro('todos')">Todos</button>
      <button class="chip" :class="{ on: filtro === 'Incompleto' }" @click="setFiltro('Incompleto')">
        Incompletos<span v-if="conteoIncompletos" class="ch-badge">{{ conteoIncompletos }}</span>
      </button>
      <button class="chip" :class="{ on: filtro === 'Justificado' }" @click="setFiltro('Justificado')">Justificados</button>
      <button class="chip" :class="{ on: filtro === 'Completo' }" @click="setFiltro('Completo')">Cuadra</button>
    </div>

    <!-- Lista de cortes -->
    <p v-if="cargando" class="muted">Cargando cortes…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else-if="!itemsFiltrados.length" class="muted">
      {{ busqueda ? 'No se encontraron cortes que coincidan con la búsqueda.' : 'No hay cortes en este filtro.' }}
    </p>

    <div v-else class="grid">
      <div v-for="c in itemsFiltrados" :key="c.id" class="card" :class="claseEstado(c.estado)">
        <div class="c-top">
          <div class="av" :class="claseEstado(c.estado)">{{ ini(c.repartidorNombre) }}</div>
          <div class="c-info">
            <div class="nm">{{ c.repartidorNombre }}</div>
            <div class="meta">
              Corte #{{ c.id }}
              <span v-if="c.cargaId"> · Carga #{{ c.cargaId }}</span>
              <span v-else> · Mostrador</span>
              · {{ fecha(c.fecha) }}
            </div>
          </div>
          <span class="badge" :class="claseEstado(c.estado)">{{ etiqueta(c.estado) }}</span>
        </div>

        <div class="c-nums">
          <div class="n"><span class="k">Ventas</span><span class="v">{{ money(c.totalVentas) }}</span></div>
          <div class="n">
            <span class="k">Diferencia</span>
            <span class="v" :class="{ neg: c.diferencia < 0, pos: c.diferencia > 0 }">
              {{ signo(c.diferencia) }}{{ money(Math.abs(c.diferencia)) }}
            </span>
          </div>
          <div class="n" v-if="c.faltantePorJustificar > 0">
            <span class="k">Por justificar</span>
            <span class="v neg font-bold">{{ money(c.faltantePorJustificar) }}</span>
          </div>
        </div>

        <div class="c-actions">
          <button class="btn-det" @click="verDetalle(c)">Ver detalle</button>
          <button v-if="c.faltantePorJustificar > 0" class="btn-just" @click="abrir(c)">Justificar faltante</button>
        </div>
      </div>
    </div>

    <!-- Paginación -->
    <div class="paginacion-bar" v-if="!cargando && total > 0">
      <div class="pag-info">
        <span>Mostrando <b>{{ itemsFiltrados.length }}</b> de <b>{{ total }}</b> corte(s)</span>
        <div class="tamano-sel">
          <span>Por página:</span>
          <select v-model.number="tamano" @change="cambiarTamano()">
            <option :value="12">12</option>
            <option :value="24">24</option>
            <option :value="48">48</option>
            <option :value="96">96</option>
          </select>
        </div>
      </div>

      <div class="pager" v-if="totalPaginas > 1 && !busqueda">
        <button class="pg" :disabled="pagina <= 1" @click="irPagina(pagina - 1)" title="Página anterior">
          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <button v-for="n in paginasVisibles" :key="n" class="pg num" :class="{ on: n === pagina }" @click="irPagina(n)">
          {{ n }}
        </button>
        <button class="pg" :disabled="pagina >= totalPaginas" @click="irPagina(pagina + 1)" title="Página siguiente">
          <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
    </div>

    <!-- Modal de DETALLE completo con reimpresión -->
    <div v-if="detModal" class="modal-bg" @click.self="cerrarDet()">
      <div class="modal modal-lg">
        <div class="m-head">
          <div>
            <div class="m-title">Detalle del corte #{{ detModal.id }}</div>
            <div class="m-sub">
              {{ detModal.repartidorNombre }}
              <span v-if="detModal.cargaId"> · Carga #{{ detModal.cargaId }}</span>
              <span v-else> · Ventas de mostrador</span>
            </div>
          </div>
          <button class="m-x" @click="cerrarDet()"><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div class="m-body">
          <p v-if="detCargando" class="muted2">Cargando desglose completo…</p>
          <template v-else-if="det">
            <!-- Cuadre monetario principal -->
            <div class="d-nums">
              <div class="dn"><span class="k">Ventas totales</span><span class="v font-bold">{{ money(det.totalVentas) }}</span></div>
              <div class="dn">
                <span class="k">Efectivo esperado</span>
                <span class="v">{{ money(det.efectivoEsperado) }}</span>
                <span v-if="det.efectivoPendiente > 0" class="dn-hint">({{ money(det.efectivoPendiente) }} pendiente)</span>
              </div>
              <div class="dn"><span class="k">Efectivo entregado</span><span class="v">{{ money(det.efectivoEntregado) }}</span></div>
              <div class="dn">
                <span class="k">Diferencia</span>
                <span class="v font-bold" :class="{ neg: det.diferencia < 0, pos: det.diferencia > 0 }">
                  {{ signo(det.diferencia) }}{{ money(Math.abs(det.diferencia)) }}
                </span>
              </div>
              <div class="dn" v-if="det.efectivoPendiente > 0 || det.transferenciaPendiente > 0">
                <span class="k">Total pendiente</span>
                <span class="v text-amber font-bold">{{ money((det.efectivoPendiente || 0) + (det.transferenciaPendiente || 0)) }}</span>
              </div>
            </div>

            <!-- Desglose por método de pago -->
            <div class="d-section-title">Cómo se pagaron las ventas</div>
            <div class="pay-methods-grid">
              <div class="pm-box" :class="{ 'pm-warn': det.efectivoPendiente > 0 }">
                <span class="pm-k">Efectivo</span>
                <span class="pm-v">{{ money(det.totalEfectivo) }}</span>
                <span v-if="det.efectivoPendiente > 0" class="pm-sub-warn">⚠️ {{ money(det.efectivoPendiente) }} pendiente</span>
                <span v-else-if="det.totalEfectivo > 0" class="pm-sub-ok">✓ Cobrado físico</span>
              </div>
              <div class="pm-box" :class="{ 'pm-warn': det.transferenciaPendiente > 0 }">
                <span class="pm-k">Transferencia</span>
                <span class="pm-v">{{ money(det.totalTransferencia) }}</span>
                <span v-if="det.transferenciaPendiente > 0" class="pm-sub-warn">⏳ {{ money(det.transferenciaPendiente) }} por confirmar</span>
                <span v-else-if="det.totalTransferencia > 0" class="pm-sub-ok">✓ Conciliada</span>
              </div>
              <div class="pm-box">
                <span class="pm-k">Tarjeta</span>
                <span class="pm-v">{{ money(det.totalTarjeta) }}</span>
                <span v-if="det.totalTarjeta > 0" class="pm-sub-ok">✓ Cobrada</span>
              </div>
              <div class="pm-box">
                <span class="pm-k">Crédito</span>
                <span class="pm-v">{{ money(det.totalCredito) }}</span>
                <span v-if="det.totalCredito > 0" class="pm-sub-info">En cuenta cte</span>
              </div>
            </div>

            <!-- Ventas entregadas con Pago Pendiente -->
            <div v-if="ventasPendientes.length" class="pend-card">
              <div class="pend-head">
                <div class="pend-title">
                  <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <span>Ventas entregadas con Pago Pendiente ({{ ventasPendientes.length }})</span>
                </div>
                <span class="pend-badge">{{ money(totalPendienteDet) }} sin cobrar</span>
              </div>
              <p class="pend-desc">
                Estas órdenes fueron entregadas al cliente pero el cobro se registró como <b>Pendiente</b> (pago posterior o folio pendiente de confirmar). Por esta razón no se consideran en el efectivo físico esperado.
              </p>
              <div class="pend-list">
                <div v-for="vp in ventasPendientes" :key="vp.pedidoId" class="pend-row">
                  <div class="pr-top">
                    <div class="pr-cli">
                      <span class="pr-id">Pedido #{{ vp.pedidoId }}</span>
                      <span class="pr-nombre">{{ vp.clienteNombre }}</span>
                    </div>
                    <div class="pr-right">
                      <span class="pr-metodo" :class="vp.metodoPago">{{ vp.metodoPago }}</span>
                      <span class="pr-monto">{{ money(vp.total) }}</span>
                    </div>
                  </div>
                  <div v-if="vp.lineas && vp.lineas.length" class="pr-chips">
                    <span v-for="(l, li) in vp.lineas" :key="li" class="pr-chip">
                      {{ fmtCant(l.cantidad) }} × {{ l.productoNombre }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Desglose de todas las ventas del corte (colapsable) -->
            <div v-if="det.ventas && det.ventas.length" class="ventas-block">
              <button class="btn-toggle-ventas" @click="mostrarTodasVentas = !mostrarTodasVentas">
                <div class="btv-left">
                  <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
                  <span>Ver todas las ventas del corte ({{ det.ventas.length }} pedidos)</span>
                </div>
                <span class="btv-arrow" :class="{ open: mostrarTodasVentas }">▾</span>
              </button>

              <div v-if="mostrarTodasVentas" class="ventas-list">
                <div v-for="v in det.ventas" :key="v.pedidoId" class="v-row" :class="{ 'is-pend': v.estadoPago === 'Pendiente' }">
                  <div class="vr-main">
                    <div class="vr-cli">
                      <span class="vr-id">#{{ v.pedidoId }}</span>
                      <span class="vr-name">{{ v.clienteNombre }}</span>
                      <span class="vr-pago-tag" :class="v.estadoPago === 'Pendiente' ? 'tag-pend' : 'tag-pagado'">
                        {{ v.estadoPago === 'Pendiente' ? 'Pago pendiente' : 'Pagado' }}
                      </span>
                    </div>
                    <div class="vr-right">
                      <span class="vr-met">{{ v.metodoPago }}</span>
                      <span class="vr-tot">{{ money(v.total) }}</span>
                    </div>
                  </div>
                  <div v-if="v.lineas && v.lineas.length" class="vr-lines">
                    <span v-for="(l, idx) in v.lineas" :key="idx" class="v-chip">
                      {{ fmtCant(l.cantidad) }} × {{ l.productoNombre }} ({{ money(l.subtotal) }})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Mercancía devuelta y merma -->
            <div class="d-merc">
              <div class="dm"><span class="k">Valor devuelto al almacén</span><span class="v">{{ money(det.valorDevuelto) }}</span></div>
              <div class="dm"><span class="k">Valor en merma</span><span class="v">{{ money(det.valorMerma) }}</span></div>
            </div>

            <!-- Productos devueltos físicos -->
            <div v-if="det.devueltos && det.devueltos.length" class="dev-list">
              <div class="dev-t">Productos devueltos físicamente al almacén</div>
              <div class="dev-row" v-for="d in det.devueltos" :key="d.productoNombre">
                <span class="dr-nom">{{ d.productoNombre }}</span>
                <span class="dr-cant">{{ fmtCant(d.cantidad) }} pza(s)</span>
              </div>
            </div>
            <p v-else class="sin-dev">Este corte no tuvo devolución de producto sobrante.</p>

            <!-- Justificaciones registradas -->
            <div v-if="det.justificaciones && det.justificaciones.length" class="ya">
              <div class="ya-t">Faltante justificado por administración</div>
              <div class="ya-row" v-for="j in det.justificaciones" :key="j.id">
                <span class="yr-tipo" :class="j.tipo">{{ etiquetaTipo(j.tipo) }}</span>
                <span class="yr-con">{{ j.concepto }}</span>
                <span class="yr-mon">{{ money(j.monto) }}</span>
              </div>
            </div>

            <p v-if="det.observacion" class="obs"><b>Observación del repartidor:</b> {{ det.observacion }}</p>
            <p v-if="printMsg" class="print-feedback">{{ printMsg }}</p>
          </template>
        </div>
        <div class="m-foot">
          <button class="btn-print" :disabled="imprimiendo" @click="imprimirTicketCorte()">
            <svg viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5h20v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>
            {{ imprimiendo ? 'Imprimiendo…' : 'Reimprimir ticket' }}
          </button>
          <button class="m-cancel" @click="cerrarDet()">Cerrar</button>
          <button v-if="det && det.faltantePorJustificar > 0" class="m-ok" @click="pasarAJustificar()">
            Justificar faltante
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de justificación -->
    <div v-if="modal" class="modal-bg" @click.self="cerrar()">
      <div class="modal">
        <div class="m-head">
          <div>
            <div class="m-title">Justificar faltante</div>
            <div class="m-sub">{{ modal.repartidorNombre }} · Corte #{{ modal.id }}</div>
          </div>
          <button class="m-x" @click="cerrar()"><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div class="m-body">
          <div class="falta">
            <span class="fl">Falta por justificar</span>
            <span class="fv">{{ money(porJustificar) }}</span>
          </div>

          <div v-if="detalle && detalle.justificaciones.length" class="ya">
            <div class="ya-t">Ya justificado previamente</div>
            <div class="ya-row" v-for="j in detalle.justificaciones" :key="j.id">
              <span class="yr-tipo" :class="j.tipo">{{ etiquetaTipo(j.tipo) }}</span>
              <span class="yr-con">{{ j.concepto }}</span>
              <span class="yr-mon">{{ money(j.monto) }}</span>
            </div>
          </div>

          <template v-if="porJustificar > 0">
            <div class="fl2">Destino del faltante</div>
            <div class="tipos">
              <button class="tp" :class="{ on: tipo === 'GastoVariable' }" @click="tipo = 'GastoVariable'">
                <svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>
                Gasto variable
              </button>
              <button class="tp" :class="{ on: tipo === 'GastoFijo' }" @click="tipo = 'GastoFijo'">
                <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/></svg>
                Gasto fijo
              </button>
              <button class="tp" :class="{ on: tipo === 'DeudaRepartidor' }" @click="tipo = 'DeudaRepartidor'">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6"/></svg>
                Deuda del colaborador
              </button>
            </div>

            <div class="campo">
              <div class="fl2">Concepto</div>
              <input class="inp" v-model="concepto" :placeholder="placeholderConcepto">
            </div>

            <div class="campo">
              <div class="fl2">Monto (MXN)</div>
              <div class="mwrap">
                <span class="pfx">$</span>
                <input class="inp mono" type="number" step="0.01" v-model.number="monto">
              </div>
            </div>

            <p class="hint" v-if="tipo !== 'DeudaRepartidor'">Se registrará como un gasto real de la operación en el módulo de <b>Gastos</b>.</p>
            <p class="hint" v-else>Se sumará al saldo pendiente que debe <b>{{ modal.repartidorNombre }}</b> en el módulo de <b>Deudas</b>.</p>
            <p v-if="modalError" class="m-err">{{ modalError }}</p>
          </template>
          <p v-else class="listo">Este faltante ya quedó completamente justificado.</p>
        </div>
        <div class="m-foot" v-if="porJustificar > 0">
          <button class="m-cancel" @click="cerrar()">Cerrar</button>
          <button class="m-ok" :disabled="procesando || !puedeGuardar" @click="guardar()">
            {{ procesando ? 'Guardando…' : 'Registrar justificación' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Guía Educativa: ¿Cómo funciona el ciclo de cortes? -->
    <div class="guide-card">
      <div class="guide-top">
        <div class="guide-icon">
          <svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>
        </div>
        <div>
          <h3 class="guide-title">¿Cómo funciona el ciclo de cierre y justificación de cortes?</h3>
          <p class="guide-subtitle">Conoce los estados de cuadre y la conciliación del efectivo físico entregado.</p>
        </div>
      </div>
      <div class="guide-grid">
        <div class="g-item">
          <div class="g-head"><span class="g-num">1</span><h4>Cierre en ruta o mostrador</h4></div>
          <p>Cada chofer cierra su corte al terminar su carga devolviendo la mercancía sobrante. En mostrador, el vendedor corta sus ventas libres del día.</p>
        </div>
        <div class="g-item">
          <div class="g-head"><span class="g-num">2</span><h4>Estado: Cuadra (Completo)</h4></div>
          <p>El efectivo físico entregado coincide al centavo con lo esperado (Diferencia = $0). Las ventas y mercancía se asientan sin discrepancias.</p>
        </div>
        <div class="g-item">
          <div class="g-head"><span class="g-num">3</span><h4>Estado: Incompleto</h4></div>
          <p>El colaborador entregó menos dinero del que correspondía por sus ventas en efectivo. Requiere que el administrador audite la causa.</p>
        </div>
        <div class="g-item">
          <div class="g-head"><span class="g-num">4</span><h4>Estado: Justificado</h4></div>
          <p>El administrador clasifica el faltante: si fue gasolina o viáticos pasa a <b>Gastos</b>; si no tiene comprobante, se asigna a <b>Deudas del personal</b>.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import http from '@/api/http'
import { imprimirCorte } from '@/services/printer'

const emit = defineEmits(['ctx'])
const items = ref([])
const cargando = ref(true)
const error = ref('')

// Paginación
const pagina = ref(1)
const tamano = ref(24)
const total = ref(0)

const periodo = ref('todos') // 'todos' | 'hoy' | 'personalizado'
const hoyStr = new Date().toISOString().slice(0, 10)
const fechaDesde = ref(hoyStr)
const fechaHasta = ref(hoyStr)

const filtro = ref('todos') // 'todos' | 'Incompleto' | 'Justificado' | 'Completo'
const busqueda = ref('')

// Modal justificación
const modal = ref(null)
const detalle = ref(null)
const tipo = ref('GastoVariable')
const concepto = ref('')
const monto = ref(null)
const modalError = ref('')
const procesando = ref(false)

// Modal detalle
const detModal = ref(null)
const det = ref(null)
const detCargando = ref(false)
const imprimiendo = ref(false)
const printMsg = ref('')
const mostrarTodasVentas = ref(false)

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const signo = (n) => n < 0 ? '−' : n > 0 ? '+' : ''
const fmtCant = (n) => Number(n || 0).toLocaleString('es-MX')
const fecha = (f) => new Date(f).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const ini = (n) => (n || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

const claseEstado = (e) => e === 'Completo' ? 'e-ok' : e === 'Justificado' ? 'e-just' : 'e-inc'
const etiqueta = (e) => e === 'Completo' ? 'Cuadra' : e === 'Justificado' ? 'Justificado' : 'Incompleto'
const etiquetaTipo = (t) => t === 'GastoFijo' ? 'Gasto fijo' : t === 'GastoVariable' ? 'Gasto variable' : 'Deuda'

// Filtro compuesto por estado y por texto en vivo
const itemsFiltrados = computed(() => {
  let list = filtro.value === 'todos' ? items.value : items.value.filter((c) => c.estado === filtro.value)
  if (!busqueda.value.trim()) return list
  const q = busqueda.value.toLowerCase().trim()
  return list.filter((c) => {
    const nom = (c.repartidorNombre || '').toLowerCase()
    const cId = String(c.id)
    const cargaId = c.cargaId ? String(c.cargaId) : ''
    return nom.includes(q) || cId.includes(q) || cargaId.includes(q)
  })
})

const conteoIncompletos = computed(() => items.value.filter((c) => c.estado === 'Incompleto').length)

// KPIs
const kpiTotalVentas = computed(() => itemsFiltrados.value.reduce((s, c) => s + c.totalVentas, 0))
const kpiTotalFaltante = computed(() => itemsFiltrados.value.reduce((s, c) => s + (c.faltantePorJustificar || 0), 0))
const kpiTotalDevuelto = computed(() => itemsFiltrados.value.reduce((s, c) => s + (c.valorDevuelto || 0), 0))

// Paginación calculada
const totalPaginas = computed(() => Math.max(1, Math.ceil(total.value / tamano.value)))
const paginasVisibles = computed(() => {
  const tp = totalPaginas.value
  const cur = pagina.value
  if (tp <= 5) return Array.from({ length: tp }, (_, i) => i + 1)
  let start = Math.max(1, cur - 2)
  let end = Math.min(tp, start + 4)
  if (end - start < 4) start = Math.max(1, end - 4)
  const pages = []
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

function irPagina(n) {
  if (n < 1 || n > totalPaginas.value) return
  pagina.value = n
  cargar()
}

function cambiarTamano() {
  pagina.value = 1
  cargar()
}

// Ventas pendientes del detalle
const ventasPendientes = computed(() => (det.value?.ventas || []).filter((v) => v.estadoPago === 'Pendiente'))
const totalPendienteDet = computed(() => ventasPendientes.value.reduce((s, v) => s + (v.total || 0), 0))

const porJustificar = computed(() => detalle.value?.faltantePorJustificar ?? modal.value?.faltantePorJustificar ?? 0)
const puedeGuardar = computed(() =>
  concepto.value.trim() !== '' && Number(monto.value) > 0 && Number(monto.value) <= porJustificar.value)

const placeholderConcepto = computed(() =>
  tipo.value === 'GastoVariable' ? 'Ej. Gasolina, comida en ruta, maniobra'
    : tipo.value === 'GastoFijo' ? 'Ej. Renta, sueldo, caseta'
      : 'Ej. Faltante pendiente a cargo del colaborador')

function setFiltro(f) { filtro.value = f }
function setPeriodo(p) { periodo.value = p; pagina.value = 1; cargar() }

function rangoFechas() {
  if (periodo.value === 'hoy') {
    const d = hoyStr
    const ini = new Date(`${d}T00:00:00`)
    const fin = new Date(`${d}T23:59:59.999`)
    return { desde: ini.toISOString(), hasta: fin.toISOString() }
  }
  if (periodo.value === 'personalizado') {
    const ini = new Date(`${fechaDesde.value}T00:00:00`)
    const fin = new Date(`${fechaHasta.value}T23:59:59.999`)
    return { desde: ini.toISOString(), hasta: fin.toISOString() }
  }
  return { desde: null, hasta: null }
}

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const r = rangoFechas()
    const params = {
      pagina: pagina.value,
      tamano: tamano.value
    }
    if (r.desde) params.desde = r.desde
    if (r.hasta) params.hasta = r.hasta
    const { data } = await http.get('/cortes', { params })
    items.value = data.items || []
    total.value = data.total ?? (data.items || []).length
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudieron cargar los cortes.'
  } finally {
    cargando.value = false
  }
}

// ── Detalle ──
async function verDetalle(c) {
  detModal.value = c
  det.value = null
  detCargando.value = true
  printMsg.value = ''
  mostrarTodasVentas.value = false
  try {
    const { data } = await http.get(`/cortes/${c.id}`)
    det.value = data
  } catch (e) {
    det.value = null
  } finally {
    detCargando.value = false
  }
}

function cerrarDet() {
  detModal.value = null
  det.value = null
  printMsg.value = ''
  mostrarTodasVentas.value = false
}

function pasarAJustificar() {
  const c = detModal.value
  cerrarDet()
  abrir(c)
}

// ── Reimpresión térmica de comprobante ──
async function imprimirTicketCorte() {
  if (!det.value) return
  imprimiendo.value = true
  printMsg.value = ''
  try {
    const d = det.value
    await imprimirCorte({
      repartidor: d.repartidorNombre,
      cargaId: d.cargaId,
      fecha: d.fecha,
      totalVentas: d.totalVentas,
      totalEfectivo: d.totalEfectivo,
      totalTransferencia: d.totalTransferencia,
      totalTarjeta: d.totalTarjeta,
      totalCredito: d.totalCredito,
      efectivoEsperado: d.efectivoEsperado,
      efectivoEntregado: d.efectivoEntregado,
      diferencia: d.diferencia,
      valorDevuelto: d.valorDevuelto,
      valorMerma: d.valorMerma,
      devueltos: d.devueltos || []
    })
    printMsg.value = '✓ Ticket enviado a la impresora correctamente.'
  } catch (e) {
    printMsg.value = 'Aviso: No se pudo conectar a la impresora térmica Bluetooth.'
  } finally {
    imprimiendo.value = false
  }
}

// ── Justificación ──
async function abrir(c) {
  modal.value = c
  detalle.value = null
  tipo.value = 'GastoVariable'
  concepto.value = ''
  monto.value = null
  modalError.value = ''
  try {
    const { data } = await http.get(`/cortes/${c.id}`)
    detalle.value = data
    monto.value = data.faltantePorJustificar || null
  } catch { /* fallback */ }
}

function cerrar() {
  modal.value = null
  detalle.value = null
}

async function guardar() {
  procesando.value = true
  modalError.value = ''
  try {
    const { data } = await http.post(`/cortes/${modal.value.id}/justificar`, {
      tipo: tipo.value,
      monto: Number(monto.value),
      concepto: concepto.value.trim()
    })
    detalle.value = data
    // Actualizar elemento en lista
    const i = items.value.findIndex((x) => x.id === modal.value.id)
    if (i !== -1) {
      items.value[i].estado = data.estado
      items.value[i].faltantePorJustificar = data.faltantePorJustificar
    }
    cerrar()
  } catch (e) {
    modalError.value = e.response?.data?.mensaje || 'No se pudo guardar la justificación.'
  } finally {
    procesando.value = false
  }
}

onMounted(() => {
  emit('ctx', { titulo: 'Cortes de Caja', sub: 'Control de cierres, cuadres y justificaciones', back: null })
  cargar()
})
</script>

<style scoped>
.cortes-wrap { padding-bottom: 30px; }
.muted { color: var(--muted); margin-top: 24px; }
.muted2 { color: var(--muted); padding: 20px; text-align: center; }
.err { color: var(--clay); font-weight: 600; margin-top: 16px; }
.font-bold { font-weight: 800; }
.text-clay { color: var(--clay); }

/* Resumen KPI */
.resumen-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 18px; }
.rc-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 16px 18px;
  box-shadow: var(--shadow);
}
.rc-card.has-faltante { border-color: #E2AFA0; background: #FFF9F7; }
.rc-lbl { font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--muted); letter-spacing: .05em; }
.rc-val { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 24px; margin-top: 4px; font-variant-numeric: tabular-nums; }
.rc-sub { font-size: 11.5px; color: var(--muted); margin-top: 2px; }

/* Barra de filtros */
.filtros-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.filtros-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.tabs-group {
  display: flex;
  gap: 4px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 3px;
}
.f-tab {
  border: none;
  background: transparent;
  color: var(--muted);
  font-family: "Hanken Grotesk", sans-serif;
  font-weight: 700;
  font-size: 12.5px;
  padding: 8px 14px;
  border-radius: 9px;
  cursor: pointer;
  transition: all .15s;
}
.f-tab.on { background: var(--surface); color: var(--ink); box-shadow: 0 1px 3px rgba(0,0,0,.1); }

.custom-dates { display: flex; gap: 8px; align-items: center; }
.fld { display: flex; flex-direction: column; gap: 2px; }
.fld .fl { font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--muted); }
.fld input { border: 1px solid var(--line); background: var(--surface); border-radius: 9px; padding: 6px 9px; font-size: 12.5px; font-weight: 600; color: var(--ink); }

.search-box {
  display: flex;
  align-items: center;
  gap: 9px;
  background: var(--surface);
  border: 1.5px solid var(--line);
  border-radius: 12px;
  padding: 8px 14px;
  min-width: 260px;
  box-shadow: var(--shadow);
}
.search-box svg { width: 17px; height: 17px; stroke: var(--muted); fill: none; stroke-width: 2.2; }
.search-box input { border: none; background: transparent; outline: none; font-family: "Hanken Grotesk", sans-serif; font-size: 13.5px; font-weight: 500; color: var(--ink); width: 100%; }
.clear-btn { background: none; border: none; font-size: 18px; color: var(--muted); cursor: pointer; }

/* Chips de estado */
.chips-bar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.chip {
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--muted);
  border-radius: 12px;
  padding: 8px 16px;
  font-family: "Hanken Grotesk", sans-serif;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 7px;
  box-shadow: var(--shadow);
  transition: all .15s;
}
.chip.on { background: var(--pine); color: #fff; border-color: var(--pine); }
.ch-badge { background: var(--clay); color: #fff; font-size: 10px; padding: 1px 6px; border-radius: 999px; }

/* Grid de tarjetas de corte */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 14px; margin-bottom: 24px; }
.card { background: var(--surface); border: 1.5px solid var(--line); border-radius: 18px; padding: 16px; box-shadow: var(--shadow); display: flex; flex-direction: column; justify-content: space-between; }
.card.e-ok { border-color: #C8E3D8; }
.card.e-inc { border-color: #F8D8A7; background: linear-gradient(0deg, #FFFBF5 0%, var(--surface) 60%); }
.card.e-just { border-color: #CFE3EC; }

.c-top { display: flex; align-items: center; gap: 12px; }
.av { width: 44px; height: 44px; border-radius: 14px; font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 15px; display: grid; place-items: center; flex: 0 0 auto; }
.av.e-ok { background: var(--pine-tint); color: var(--pine); }
.av.e-inc { background: var(--amber-soft); color: #B9781F; }
.av.e-just { background: var(--sky-soft); color: var(--sky); }
.c-info { flex: 1; min-width: 0; }
.nm { font-weight: 700; font-size: 15px; color: var(--ink); }
.meta { font-size: 12px; color: var(--muted); margin-top: 2px; }
.badge { font-size: 10px; font-weight: 800; letter-spacing: .03em; text-transform: uppercase; padding: 3px 8px; border-radius: 7px; }
.badge.e-ok { background: var(--pine-tint); color: var(--pine); }
.badge.e-inc { background: var(--amber-soft); color: #B9781F; }
.badge.e-just { background: var(--sky-soft); color: var(--sky); }

.c-nums { display: flex; gap: 14px; margin: 14px 0 10px; padding: 10px 14px; background: var(--paper); border-radius: 12px; }
.c-nums .n { flex: 1; }
.c-nums .k { font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: var(--muted); display: block; }
.c-nums .v { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 16px; margin-top: 2px; font-variant-numeric: tabular-nums; display: block; }
.c-nums .v.neg { color: var(--clay); }
.c-nums .v.pos { color: var(--pine); }

.c-actions { display: flex; gap: 8px; margin-top: 10px; }
.btn-det { flex: 1; border: 1px solid var(--line); background: var(--surface); color: var(--ink); font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 13px; padding: 9px; border-radius: 11px; cursor: pointer; }
.btn-just { flex: 1.3; border: none; background: var(--amber); color: #3b2505; font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 13px; padding: 9px; border-radius: 11px; cursor: pointer; }

/* Modales */
.modal-bg { position: fixed; inset: 0; background: rgba(21,42,36,.45); backdrop-filter: blur(3px); display: grid; place-items: center; z-index: 3000; padding: 20px; }
.modal { background: var(--surface); border-radius: 22px; width: 100%; max-width: 460px; box-shadow: 0 30px 60px -20px rgba(0,0,0,.5); overflow: hidden; max-height: 90vh; display: flex; flex-direction: column; }
.modal.modal-lg { max-width: 640px; }
.m-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 18px 20px 14px; border-bottom: 1px solid var(--line); }
.m-title { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 18px; }
.m-sub { font-size: 13px; color: var(--muted); font-weight: 600; margin-top: 2px; }
.m-x { width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--line); background: var(--paper); display: grid; place-items: center; cursor: pointer; flex: 0 0 auto; }
.m-x svg { width: 16px; height: 16px; stroke: var(--muted); fill: none; stroke-width: 2.4; stroke-linecap: round; }
.m-body { padding: 18px 20px; overflow-y: auto; }

/* Detalle interno */
.d-nums { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 10px; margin-bottom: 16px; background: var(--paper); padding: 12px; border-radius: 14px; }
.dn .k { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; display: block; }
.dn .v { font-family: "Bricolage Grotesque", sans-serif; font-size: 16px; margin-top: 3px; font-variant-numeric: tabular-nums; display: block; }
.dn .v.neg { color: var(--clay); } .dn .v.pos { color: var(--pine); }
.text-amber { color: #B9781F; }
.dn-hint { font-size: 10.5px; font-weight: 700; color: var(--clay); display: block; margin-top: 2px; }

.d-section-title { font-size: 11.5px; font-weight: 800; text-transform: uppercase; color: var(--muted); letter-spacing: .05em; margin: 16px 0 8px; }
.pay-methods-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 8px; margin-bottom: 14px; }
.pm-box { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 10px; text-align: center; }
.pm-box.pm-warn { border-color: #F8D8A7; background: #FFFBF5; }
.pm-k { font-size: 10.5px; color: var(--muted); font-weight: 700; display: block; }
.pm-v { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 15px; margin-top: 2px; font-variant-numeric: tabular-nums; display: block; }
.pm-sub-warn { font-size: 10px; font-weight: 700; color: var(--clay); margin-top: 4px; display: block; }
.pm-sub-ok { font-size: 10px; font-weight: 700; color: var(--pine); margin-top: 4px; display: block; }
.pm-sub-info { font-size: 10px; font-weight: 700; color: var(--sky); margin-top: 4px; display: block; }

.d-merc { display: flex; gap: 10px; margin-bottom: 14px; }
.dm { flex: 1; background: var(--paper); border-radius: 12px; padding: 10px 14px; }
.dm .k { font-size: 10.5px; font-weight: 700; color: var(--muted); text-transform: uppercase; display: block; }
.dm .v { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 16px; margin-top: 3px; display: block; }

.dev-list { background: var(--paper); border-radius: 12px; padding: 12px 14px; margin-bottom: 14px; }
.dev-t { font-size: 11.5px; font-weight: 800; color: var(--ink-soft); margin-bottom: 8px; }
.dev-row { display: flex; justify-content: space-between; font-size: 12.5px; padding: 4px 0; border-bottom: 1px solid var(--line); }
.dev-row:last-child { border-bottom: none; }
.sin-dev { font-size: 12.5px; color: var(--muted); margin-bottom: 14px; font-style: italic; }

.ya { background: #FFF9F0; border: 1px solid #F8D8A7; border-radius: 12px; padding: 12px 14px; margin-bottom: 14px; }
.ya-t { font-size: 11.5px; font-weight: 800; color: #8F5E16; margin-bottom: 6px; }
.ya-row { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 4px 0; }
.yr-tipo { font-size: 9.5px; font-weight: 800; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
.yr-tipo.GastoFijo, .yr-tipo.GastoVariable { background: var(--sky-soft); color: var(--sky); }
.yr-tipo.DeudaRepartidor { background: var(--clay-soft); color: var(--clay); }
.yr-con { flex: 1; font-weight: 600; color: var(--ink); }
.yr-mon { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 13.5px; }

.obs { font-size: 12px; color: var(--ink-soft); background: var(--paper); padding: 9px 12px; border-radius: 10px; margin-top: 8px; }
.print-feedback { font-size: 12px; color: var(--pine); font-weight: 700; margin-top: 8px; text-align: center; }

/* Botones de acción modal */
.m-foot { display: flex; gap: 10px; padding: 6px 20px 20px; }
.btn-print {
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1.5px solid var(--sky);
  background: var(--sky-soft);
  color: var(--sky);
  border-radius: 13px;
  padding: 12px 16px;
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 800;
  font-size: 13px;
  cursor: pointer;
}
.btn-print svg { width: 17px; height: 17px; stroke: currentColor; fill: none; stroke-width: 2.2; }
.m-cancel { flex: 1; border: 1px solid var(--line); background: var(--surface); color: var(--ink-soft); border-radius: 13px; padding: 12px; font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 14px; cursor: pointer; }
.m-ok { flex: 1.5; border: none; background: var(--pine); color: #fff; border-radius: 13px; padding: 12px; font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 14px; cursor: pointer; }
.m-ok:disabled { opacity: .5; }

/* Justificación */
.falta { display: flex; justify-content: space-between; align-items: center; background: var(--clay-soft); border: 1px solid #EAC0B4; border-radius: 14px; padding: 14px 16px; margin-bottom: 16px; }
.falta .fl { font-size: 12.5px; font-weight: 700; color: #8F3E28; }
.falta .fv { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 22px; color: var(--clay); font-variant-numeric: tabular-nums; }
.fl2 { font-size: 11.5px; font-weight: 800; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
.tipos { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.tp { display: flex; align-items: center; gap: 10px; border: 1.5px solid var(--line); background: var(--paper); color: var(--ink); border-radius: 12px; padding: 10px 14px; font-family: "Hanken Grotesk", sans-serif; font-weight: 700; font-size: 13.5px; cursor: pointer; transition: all .15s; }
.tp svg { width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 2.2; }
.tp.on { border-color: var(--pine); background: var(--pine-tint); color: var(--pine-deep); }
.campo { margin-bottom: 14px; }
.inp { width: 100%; border: 1.5px solid var(--line); background: var(--paper); border-radius: 12px; padding: 11px 13px; font-family: "Hanken Grotesk", sans-serif; font-size: 14px; font-weight: 600; color: var(--ink); }
.mwrap { display: flex; align-items: center; background: var(--paper); border: 1.5px solid var(--line); border-radius: 12px; padding: 2px 14px; }
.mwrap .pfx { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 20px; color: var(--ink-soft); margin-right: 6px; }
.inp.mono { border: none; background: transparent; font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 20px; outline: none; }
.hint { font-size: 12px; color: var(--muted); margin-top: 6px; line-height: 1.4; }
.m-err { color: var(--clay); font-size: 13px; font-weight: 600; margin-top: 10px; }
.listo { text-align: center; color: var(--pine); font-weight: 700; padding: 20px; }

/* Paginación */
.paginacion-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin: 18px 0 24px;
}
.pag-info {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 13px;
  color: var(--muted);
}
.pag-info b { color: var(--ink); }
.tamano-sel {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
}
.tamano-sel select {
  border: 1.5px solid var(--line);
  background: var(--surface);
  border-radius: 8px;
  padding: 4px 8px;
  font-family: "Hanken Grotesk", sans-serif;
  font-weight: 700;
  font-size: 12.5px;
  color: var(--ink);
  cursor: pointer;
}
.pager { display: flex; align-items: center; justify-content: center; gap: 6px; }
.pg {
  min-width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--surface);
  display: grid;
  place-items: center;
  cursor: pointer;
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 700;
  font-size: 13.5px;
  color: var(--ink-soft);
  padding: 0 6px;
}
.pg svg { width: 16px; height: 16px; stroke: var(--ink-soft); fill: none; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.pg:disabled { opacity: .4; cursor: default; }
.pg.num.on { background: var(--pine); color: #fff; border-color: var(--pine); }

/* Ventas con Pago Pendiente */
.pend-card {
  background: #FFF8F5;
  border: 1.5px solid #F5C7B8;
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 16px;
}
.pend-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.pend-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 800;
  font-size: 14px;
  color: #9E3A24;
}
.pend-title svg {
  width: 18px;
  height: 18px;
  stroke: #9E3A24;
  fill: none;
  stroke-width: 2.2;
}
.pend-badge {
  background: var(--clay);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 6px;
  letter-spacing: .02em;
}
.pend-desc {
  font-size: 12px;
  color: #6B3B30;
  margin: 8px 0 12px;
  line-height: 1.45;
}
.pend-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pend-row {
  background: var(--surface);
  border: 1px solid #EAC0B4;
  border-radius: 10px;
  padding: 10px 12px;
}
.pr-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.pr-cli {
  display: flex;
  align-items: center;
  gap: 7px;
}
.pr-id {
  font-size: 11px;
  font-weight: 800;
  color: var(--muted);
}
.pr-nombre {
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
}
.pr-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pr-metodo {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 5px;
  background: var(--amber-soft);
  color: #8C5708;
}
.pr-monto {
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 800;
  font-size: 14px;
  color: var(--clay);
}
.pr-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 6px;
}
.pr-chip {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink-soft);
  background: var(--paper);
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid var(--line);
}

/* Lista colapsable de todas las ventas */
.ventas-block {
  margin-bottom: 16px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
}
.btn-toggle-ventas {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: "Hanken Grotesk", sans-serif;
  font-weight: 700;
  font-size: 13px;
  color: var(--ink);
  transition: background .15s;
}
.btn-toggle-ventas:hover {
  background: rgba(0,0,0,.03);
}
.btv-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.btv-left svg {
  width: 16px;
  height: 16px;
  stroke: var(--muted);
  fill: none;
  stroke-width: 2.2;
}
.btv-arrow {
  font-size: 14px;
  color: var(--muted);
  transition: transform .2s ease;
}
.btv-arrow.open {
  transform: rotate(180deg);
}
.ventas-list {
  padding: 0 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.v-row {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 9px 12px;
}
.v-row.is-pend {
  border-color: #F8D8A7;
  background: #FFFDF8;
}
.vr-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.vr-cli {
  display: flex;
  align-items: center;
  gap: 7px;
}
.vr-id {
  font-size: 11px;
  font-weight: 800;
  color: var(--muted);
}
.vr-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
}
.vr-pago-tag {
  font-size: 9.5px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
}
.tag-pend {
  background: var(--amber-soft);
  color: #8C5708;
}
.tag-pagado {
  background: var(--pine-tint);
  color: var(--pine);
}
.vr-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.vr-met {
  font-size: 11.5px;
  color: var(--muted);
  font-weight: 600;
}
.vr-tot {
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 800;
  font-size: 14px;
}
.vr-lines {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}
.v-chip {
  font-size: 11px;
  color: var(--ink-soft);
  background: var(--paper);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--line);
}

/* Guía Educativa */
.guide-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow);
  margin-top: 24px;
}
.guide-top { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
.guide-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--amber-soft);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.guide-icon svg { width: 22px; height: 22px; stroke: #B9781F; fill: none; stroke-width: 2.2; }
.guide-title { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 17px; color: var(--ink); margin: 0; }
.guide-subtitle { font-size: 12.5px; color: var(--muted); margin-top: 2px; }
.guide-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 16px; }
.g-item { background: var(--paper); border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 14px 16px; }
.g-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.g-num { width: 20px; height: 20px; border-radius: 50%; background: var(--amber); color: #3b2505; font-size: 11px; font-weight: 800; display: grid; place-items: center; flex-shrink: 0; }
.g-head h4 { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 13px; color: var(--ink); margin: 0; }
.g-item p { font-size: 12px; line-height: 1.45; color: var(--ink-soft); margin: 0; }
</style>
