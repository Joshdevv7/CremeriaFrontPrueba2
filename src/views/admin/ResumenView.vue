<template>
  <div class="resumen">

    <p v-if="cargando" class="loading">Cargando panel…</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <template v-else-if="d">
      <div class="kpis">
        <div class="kpi v1">
          <div class="k"><span class="ic"><svg viewBox="0 0 24 24"><path d="M4 19V5M9 19V9M14 19v-6M19 19V7"/></svg></span>Ventas</div>
          <svg class="spark" viewBox="0 0 64 30"><polyline :points="spark(1)" fill="none" stroke="#0E5C4A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <div class="val">{{ money(d.ventasTotal) }} <small>MXN</small></div>
          <div class="foot"><span class="vs">{{ d.numeroPedidos }} pedidos · venta prom. {{ money(d.ticketPromedio) }}</span></div>
        </div>
        <div class="kpi v2">
          <div class="k"><span class="ic"><svg viewBox="0 0 24 24"><path d="M12 1v22M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span>Utilidad neta</div>
          <svg class="spark" viewBox="0 0 64 30"><polyline :points="spark(margenFrac)" fill="none" stroke="#E8972E" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <div class="val">{{ money(d.utilidadNeta) }} <small>MXN</small></div>
          <div class="foot"><span class="vs">margen {{ Math.round(d.margenBrutoPorcentaje) }}%</span></div>
        </div>
        <div class="kpi v3">
          <div class="k"><span class="ic"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span>Por cobrar</div>
          <div class="val">{{ money(d.cuentasPorCobrarPendiente) }} <small>MXN</small></div>
          <div class="foot">
            <span v-if="d.cuentasPorCobrarVencido > 0" class="delta down"><svg viewBox="0 0 24 24"><path d="M12 9v6M9 13l3 3 3-3"/></svg>{{ money(d.cuentasPorCobrarVencido) }}</span>
            <span class="vs">{{ d.cuentasPorCobrarVencido > 0 ? 'vencido' : 'al corriente' }}</span>
          </div>
        </div>
        <div class="kpi v4">
          <div class="k"><span class="ic"><svg viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg></span>Merma</div>
          <div class="val">{{ money(d.costoMerma) }} <small>MXN</small></div>
          <div class="foot"><span class="vs">{{ mermaPct }}% de ventas</span></div>
        </div>
      </div>

      <div class="row a">
        <!-- PUNTO DE EQUILIBRIO -->
        <div class="card equilibrio" :class="estadoEq.clase">
          <div class="ch"><h3>¿Ya cubriste tus gastos?</h3><span class="meta">{{ rangoTexto }}</span></div>

          <div class="eq-msg">
            <span class="eq-ic">
              <svg v-if="estadoEq.clase === 'ok'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>
              <svg v-else-if="estadoEq.clase === 'falta'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/></svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 17h4"/></svg>
            </span>
            <div>
              <div class="eq-titulo">{{ estadoEq.titulo }}</div>
              <div class="eq-sub">{{ estadoEq.sub }}</div>
            </div>
          </div>

          <div class="eq-bar">
            <div class="eq-fill" :style="{ width: progresoEq + '%' }"></div>
            <div class="eq-meta-line" v-if="d.puntoEquilibrio > 0" :style="{ left: 'min(100%, ' + metaPos + '%)' }"></div>
          </div>
          <div class="eq-labels">
            <span><b>{{ money(d.ventasTotal) }}</b> vendido</span>
            <span v-if="d.puntoEquilibrio > 0">meta: <b>{{ money(d.puntoEquilibrio) }}</b></span>
            <span v-else>sin gastos registrados</span>
          </div>

          <!-- mini-indicadores -->
          <div class="mini">
            <div class="mi"><div class="ml">Ventas</div><div class="mv">{{ money(d.ventasTotal) }}</div></div>
            <div class="mi"><div class="ml">Utilidad neta</div><div class="mv" :class="{ neg: d.utilidadNeta < 0 }">{{ money(d.utilidadNeta) }}</div></div>
            <div class="mi"><div class="ml">Margen</div><div class="mv">{{ Math.round(d.margenBrutoPorcentaje) }}%</div></div>
          </div>
        </div>

        <div class="card">
          <div class="ch"><h3>Por método</h3><span class="meta">{{ rangoTexto }}</span></div>
          <div class="donut-wrap">
            <div class="donut" :style="{ background: donutBg }"><div class="ctr"><div class="v">{{ totalCorto }}</div><div class="l">TOTAL</div></div></div>
            <div class="mlegend"><div class="li" v-for="m in metodos" :key="m.nombre"><span class="dotc" :style="{ background: m.color }"></span><span class="nm">{{ m.nombre }}</span><span class="am">{{ m.pct }}%</span></div></div>
          </div>
        </div>
      </div>

      <div class="row b">
        <div class="card">
          <div class="ch"><h3>Productos más rentables</h3><span class="meta">Por utilidad</span></div>
          <div style="margin-top:8px">
            <div class="rk" v-for="(p, i) in d.topProductos" :key="p.productoId">
              <div class="pos" :class="{ gold: i === 0 }">{{ i + 1 }}</div><div class="em"><svg class="pkg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5v-9z"/><path d="M3 7.5l9 4.5 9-4.5"/><path d="M12 12v9"/></svg></div>
              <div class="info"><div class="n">{{ p.nombre }}</div><div class="bar"><i :style="{ width: barra(p.utilidad) + '%' }"></i></div></div>
              <div class="util"><div class="u">{{ money(p.utilidad) }}</div><div class="m">{{ Math.round(p.margenPorcentaje) }}% margen</div></div>
            </div>
            <p v-if="!d.topProductos.length" class="vacio">Todavía no hay ventas para mostrar aquí.</p>
          </div>
        </div>
        <div class="card">
          <div class="ch"><h3>Alertas de stock</h3><span class="meta">{{ d.alertasStock.length }} por debajo del mínimo</span></div>
          <div style="margin-top:12px">
            <div class="alert" v-for="a in d.alertasStock" :key="a.productoId">
              <div class="em"><svg class="pkg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5v-9z"/><path d="M3 7.5l9 4.5 9-4.5"/><path d="M12 12v9"/></svg></div>
              <div class="info"><div class="n">{{ a.nombre }}</div><div class="s">Quedan <b>{{ fmt(a.stock) }}</b> · mín <b>{{ fmt(a.minimo) }}</b> · pedir <b>{{ fmt(a.sugerido) }}</b></div></div>
              <button class="wa" @click="whatsapp(a)"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.4A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.2 1.1-1.7 1.2-.5.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1-1.4-1-2.6 0-1.2.6-1.8.9-2 .2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2 0 .4-.1.5l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.2.1.4.1.5-.1l.7-.8c.2-.2.4-.2.6-.1l1.8.9c.2.1.4.2.4.3.1.1.1.5-.1 1Z"/></svg>WhatsApp</button>
            </div>
            <p v-if="!d.alertasStock.length" class="vacio">Todo el inventario está por encima del mínimo.</p>
          </div>
        </div>
      </div>

      <div class="row c">
        <div class="card cred">
          <div class="ch"><h3>Créditos</h3><span class="meta link" @click="$router.push('/panel/creditos')">Ver todos →</span></div>
          <div class="cred-row">
            <div class="cred-box"><div class="l">Activos (por cobrar)</div><div class="v">{{ money(cred.activosMonto) }}</div><div class="s">{{ cred.activosCuentas }} cuentas · {{ money(cred.vencidoMonto) }} vencido</div></div>
            <div class="cred-box ok"><div class="l">Liquidados</div><div class="v">{{ cred.liquidados }}</div><div class="s">cuentas pagadas</div></div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import http from '@/api/http'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits(['ctx'])
const auth = useAuthStore()
const d = ref(null)
const cargando = ref(true)
const error = ref('')
const rango = ref('mes')
const cred = ref({ activosMonto: 0, activosCuentas: 0, vencidoMonto: 0, liquidados: 0 })

const rangos = [{ k: 'hoy', t: 'Hoy' }, { k: 'semana', t: 'Semana' }, { k: 'mes', t: 'Mes' }, { k: 'anio', t: 'Año' }]
const rangoTexto = computed(() => ({ hoy: 'Hoy', semana: 'Esta semana', mes: 'Este mes', anio: 'Este año' }[rango.value]))
const money = (n) => '$' + Math.round(Number(n || 0)).toLocaleString('es-MX')
const fmt = (n) => Number(n || 0).toLocaleString('es-MX')
const margenFrac = computed(() => d.value ? (d.value.margenBrutoPorcentaje || 0) / 100 : 0)
const mermaPct = computed(() => d.value && d.value.ventasTotal > 0 ? (d.value.costoMerma / d.value.ventasTotal * 100).toFixed(1) : '0.0')

// ----- Punto de equilibrio -----
const progresoEq = computed(() => {
  if (!d.value || d.value.puntoEquilibrio <= 0) return d.value && d.value.ventasTotal > 0 ? 100 : 0
  return Math.max(0, Math.min(100, Math.round(d.value.ventasTotal / d.value.puntoEquilibrio * 100)))
})
const metaPos = computed(() => 100) // la meta es el 100% de la barra
const faltante = computed(() => d.value ? Math.max(0, d.value.puntoEquilibrio - d.value.ventasTotal) : 0)
const estadoEq = computed(() => {
  if (!d.value) return { clase: '', titulo: '', sub: '' }
  if (d.value.puntoEquilibrio <= 0) {
    return { clase: 'neutro', titulo: 'Aún no registras gastos', sub: 'Captura tus gastos (renta, sueldos, etc.) para ver cuánto necesitas vender para no perder.' }
  }
  if (d.value.ventasTotal >= d.value.puntoEquilibrio) {
    return { clase: 'ok', titulo: 'Ya cubriste tus gastos', sub: `Todo lo que vendas de más es ganancia. Llevas ${money(d.value.ventasTotal - d.value.puntoEquilibrio)} por encima de la meta.` }
  }
  return { clase: 'falta', titulo: `Te faltan ${money(faltante.value)} para cubrir gastos`, sub: `Necesitas vender ${money(d.value.puntoEquilibrio)} en el periodo para no perder. Llevas ${progresoEq.value}%.` }
})

function emitCtx() {
  emit('ctx', {
    titulo: 'Resumen',
    sub: `${rangoTexto.value} · actualizado ${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`,
    back: null,
    acciones: {
      seg: { opciones: rangos, valor: rango.value, onSelect: setRango },
      boton: { texto: 'Nuevo pedido', to: '/panel/pedido/nuevo' }
    }
  })
}

function spark(factor) {
  const dias = d.value?.ventasPorDia || []
  if (!dias.length) return ''
  const max = Math.max(...dias.map((x) => x.total), 1)
  const n = dias.length
  return dias.map((x, i) => `${(n === 1 ? 32 : 64 * i / (n - 1)).toFixed(1)},${(28 - 24 * (x.total * factor / max)).toFixed(1)}`).join(' ')
}

const COLORES = { Efectivo: '#0E5C4A', Transferencia: '#2E6F8E', Tarjeta: '#E8972E', Credito: '#C0573B' }
const NOMBRES = { Efectivo: 'Efectivo', Transferencia: 'Transferencia', Tarjeta: 'Tarjeta', Credito: 'Crédito' }
const metodos = computed(() => {
  const arr = d.value?.ventasPorMetodo || []
  const total = arr.reduce((s, m) => s + m.total, 0) || 1
  return ['Efectivo', 'Transferencia', 'Tarjeta', 'Credito'].map((k) => {
    const m = arr.find((x) => x.metodo === k); const t = m ? m.total : 0
    return { nombre: NOMBRES[k], color: COLORES[k], pct: Math.round(t / total * 100), val: t }
  })
})
const donutBg = computed(() => {
  let acc = 0
  return `conic-gradient(${metodos.value.map((m) => { const from = acc; acc += m.pct; return `${m.color} ${from}% ${acc}%` }).join(',')})`
})
const totalCorto = computed(() => { const t = d.value?.ventasTotal || 0; return t >= 1000 ? '$' + Math.round(t / 1000) + 'K' : money(t) })
const maxUtil = computed(() => Math.max(...(d.value?.topProductos || []).map((p) => p.utilidad), 1))
function barra(u) { return Math.max(4, Math.round(u / maxUtil.value * 100)) }
function whatsapp(a) { window.open(`https://wa.me/?text=${encodeURIComponent(a.whatsappTexto || `Hola, necesito surtir ${a.sugerido} de ${a.nombre}.`)}`, '_blank') }

function fechasDeRango(k) {
  const hoy = new Date(); const iso = (dt) => dt.toISOString().slice(0, 10)
  if (k === 'hoy') return { desde: iso(hoy), hasta: iso(hoy) }
  if (k === 'semana') { const x = new Date(hoy); x.setDate(x.getDate() - 6); return { desde: iso(x), hasta: iso(hoy) } }
  if (k === 'anio') return { desde: `${hoy.getFullYear()}-01-01`, hasta: iso(hoy) }
  return { desde: `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`, hasta: iso(hoy) }
}
function setRango(k) { rango.value = k; emitCtx(); cargar() }

async function cargar() {
  cargando.value = true; error.value = ''
  try {
    const { desde, hasta } = fechasDeRango(rango.value)
    const { data } = await http.get('/dashboard', { params: { desde, hasta } })
    d.value = data
    cargarCreditos()
  } catch (e) { error.value = e.response?.data?.mensaje || 'No se pudo cargar el panel.' }
  finally { cargando.value = false }
}
async function cargarCreditos() {
  try {
    const [res, pag] = await Promise.all([
      http.get('/creditos/resumen'),
      http.get('/creditos', { params: { estado: 'Pagada', tamano: 1 } })
    ])
    cred.value = {
      activosMonto: (res.data.totalPendiente || 0) + (res.data.totalVencido || 0),
      activosCuentas: (res.data.cuentasPendientes || 0) + (res.data.cuentasVencidas || 0),
      vencidoMonto: res.data.totalVencido || 0,
      liquidados: pag.data.total || 0
    }
  } catch { /* noop */ }
}
onMounted(() => { emitCtx(); cargar() })
</script>

<style scoped>
.loading, .error, .vacio { color: var(--muted); font-weight: 600; padding: 24px 4px; }
.error { color: var(--clay); }
.vacio { padding: 16px 4px; font-size: 13.5px; }
.seg { display: flex; background: var(--paper-2); border: 1px solid var(--line); border-radius: 12px; padding: 4px; }
.seg button { border: none; background: transparent; font-family: "Hanken Grotesk"; font-weight: 700; font-size: 13px; color: var(--muted); padding: 8px 15px; border-radius: 9px; cursor: pointer; transition: .15s; }
.seg button.on { background: var(--surface); color: var(--ink); box-shadow: 0 2px 6px rgba(0,0,0,.08); }
.btn-primary { display: flex; align-items: center; gap: 8px; background: var(--ink); color: #fff; border: none; border-radius: 12px; padding: 11px 16px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; cursor: pointer; box-shadow: 0 10px 20px -12px rgba(21,42,36,.7); }
.btn-primary svg { width: 17px; height: 17px; stroke: #fff; fill: none; stroke-width: 2.4; stroke-linecap: round; }

.kpis { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 18px; }
.kpi { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 17px 18px; box-shadow: var(--shadow); position: relative; overflow: hidden; }
.kpi .k { display: flex; align-items: center; gap: 9px; font-size: 12.5px; font-weight: 700; color: var(--muted); }
.kpi .k .ic { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; flex: 0 0 auto; }
.kpi .k .ic svg { width: 16px; height: 16px; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.kpi.v1 .ic { background: var(--pine-tint); } .kpi.v1 .ic svg { stroke: var(--pine); }
.kpi.v2 .ic { background: var(--amber-soft); } .kpi.v2 .ic svg { stroke: #B9781F; }
.kpi.v3 .ic { background: var(--sky-soft); } .kpi.v3 .ic svg { stroke: var(--sky); }
.kpi.v4 .ic { background: var(--clay-soft); } .kpi.v4 .ic svg { stroke: var(--clay); }
.kpi .val { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 26px; letter-spacing: -.02em; margin: 12px 0 0; font-variant-numeric: tabular-nums; }
.kpi .val small { font-size: 13px; color: var(--muted); font-weight: 600; }
.kpi .foot { display: flex; align-items: center; gap: 7px; margin-top: 7px; }
.delta { display: inline-flex; align-items: center; gap: 3px; font-size: 12px; font-weight: 700; padding: 3px 8px; border-radius: 7px; }
.delta.down { color: var(--clay); background: var(--clay-soft); }
.delta svg { width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 3; }
.kpi .foot .vs { font-size: 11.5px; color: var(--muted); font-weight: 600; }
.spark { position: absolute; right: 14px; top: 16px; width: 64px; height: 30px; opacity: .9; }
.row { display: grid; gap: 16px; margin-bottom: 16px; }
.row.a { grid-template-columns: 1.9fr 1fr; }
.row.b { grid-template-columns: 1.35fr 1fr; }
.row.c { grid-template-columns: 1fr; }

/* Punto de equilibrio */
.equilibrio { display: flex; flex-direction: column; }
.eq-msg { display: flex; align-items: flex-start; gap: 13px; margin: 14px 0 16px; }
.eq-ic { flex: 0 0 auto; }
.eq-ic svg { width: 32px; height: 32px; }
.equilibrio.ok .eq-ic { color: var(--green); }
.equilibrio.falta .eq-ic { color: var(--amber); }
.equilibrio.neutro .eq-ic { color: var(--muted); }
.eq-titulo { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; letter-spacing: -.01em; }
.eq-sub { font-size: 13px; color: var(--ink-soft); font-weight: 500; line-height: 1.45; margin-top: 3px; }
.eq-bar { position: relative; height: 16px; border-radius: 10px; background: var(--paper-2); overflow: hidden; }
.eq-fill { height: 100%; border-radius: 10px; transition: width .5s ease; }
.equilibrio.ok .eq-fill { background: var(--green); }
.equilibrio.falta .eq-fill { background: var(--amber); }
.equilibrio.neutro .eq-fill { background: var(--line); }
.eq-labels { display: flex; justify-content: space-between; gap: 10px; margin-top: 9px; font-size: 12.5px; color: var(--muted); font-weight: 600; }
.eq-labels b { color: var(--ink); font-variant-numeric: tabular-nums; }
.equilibrio.ok { border-color: #BDE0C9; }
.equilibrio.falta { border-color: #EAD9B8; }
.mini { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--line); }
.mi { text-align: center; }
.mi .ml { font-size: 11.5px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
.mi .mv { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 21px; margin-top: 4px; font-variant-numeric: tabular-nums; }
.mi .mv.neg { color: var(--clay); }

.cred .ch .link { color: var(--pine); cursor: pointer; font-weight: 700; }
.cred-row { display: flex; gap: 14px; margin-top: 12px; flex-wrap: wrap; }
.cred-box { flex: 1; min-width: 180px; background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 14px; }
.cred-box .l { font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
.cred-box .v { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 24px; margin-top: 4px; font-variant-numeric: tabular-nums; }
.cred-box .s { font-size: 12px; color: var(--muted); margin-top: 2px; }
.cred-box.ok .v { color: var(--green); }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 20px; padding: 20px; box-shadow: var(--shadow); }
.card .ch { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.card .ch h3 { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 16.5px; letter-spacing: -.01em; }
.card .ch .meta { font-size: 12.5px; color: var(--muted); font-weight: 600; }
.dotc { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.donut-wrap { display: flex; align-items: center; gap: 20px; margin-top: 14px; flex-wrap: wrap; }
.donut { width: 128px; height: 128px; border-radius: 50%; flex: 0 0 auto; position: relative; }
.donut::before { content: ""; position: absolute; inset: 20px; border-radius: 50%; background: var(--surface); }
.donut .ctr { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
.donut .ctr .v { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; font-variant-numeric: tabular-nums; }
.donut .ctr .l { font-size: 10px; color: var(--muted); font-weight: 700; letter-spacing: .05em; }
.mlegend { flex: 1; min-width: 140px; display: flex; flex-direction: column; gap: 11px; }
.mlegend .li { display: flex; align-items: center; gap: 10px; font-size: 13px; }
.mlegend .li .nm { font-weight: 600; color: var(--ink-soft); flex: 1; }
.mlegend .li .am { font-family: "Bricolage Grotesque"; font-weight: 700; font-variant-numeric: tabular-nums; }
.rk { display: flex; align-items: center; gap: 13px; padding: 13px 0; border-bottom: 1px solid var(--line); }
.rk:last-child { border-bottom: none; }
.rk .pos { width: 26px; height: 26px; border-radius: 8px; background: var(--paper-2); display: grid; place-items: center; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13px; color: var(--ink-soft); flex: 0 0 auto; }
.rk .pos.gold { background: var(--amber); color: #fff; }
.rk .em { width: 30px; height: 30px; display: grid; place-items: center; flex: 0 0 auto; color: var(--ink-soft); }
.rk .em svg, .alert .em svg { width: 22px; height: 22px; }
.rk .info { flex: 1; min-width: 0; }
.rk .info .n { font-weight: 700; font-size: 14px; }
.rk .info .bar { height: 5px; border-radius: 4px; background: var(--paper-2); margin-top: 6px; overflow: hidden; }
.rk .info .bar i { display: block; height: 100%; background: var(--pine); border-radius: 4px; }
.rk .util { text-align: right; flex: 0 0 auto; }
.rk .util .u { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; font-variant-numeric: tabular-nums; }
.rk .util .m { font-size: 11.5px; color: var(--green); font-weight: 700; }
.alert { display: flex; align-items: center; gap: 13px; padding: 13px; border-radius: 14px; background: var(--clay-soft); border: 1px solid #EAC9BC; margin-bottom: 11px; }
.alert .em { width: 40px; height: 40px; border-radius: 11px; background: #fff; display: grid; place-items: center; flex: 0 0 auto; color: var(--clay); }
.alert .info { flex: 1; min-width: 0; }
.alert .info .n { font-weight: 700; font-size: 14px; }
.alert .info .s { font-size: 12px; color: #9A4730; font-weight: 600; margin-top: 1px; }
.wa { display: flex; align-items: center; gap: 7px; background: #1AA75A; color: #fff; border: none; border-radius: 11px; padding: 10px 13px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12.5px; cursor: pointer; white-space: nowrap; box-shadow: 0 8px 16px -8px rgba(26,167,90,.7); }
.wa svg { width: 16px; height: 16px; fill: #fff; }
@media (max-width: 1180px) { .row.a, .row.b { grid-template-columns: 1fr; } }
@media (max-width: 1024px) { .kpis { grid-template-columns: repeat(2,1fr); } }
@media (max-width: 440px) { .kpis { grid-template-columns: 1fr; } .donut-wrap { justify-content: center; } .mini { grid-template-columns: 1fr; gap: 8px; } }
</style>
