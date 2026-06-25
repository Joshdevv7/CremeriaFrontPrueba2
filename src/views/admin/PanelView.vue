<template>
  <ion-page>
    <ion-content class="dash" :scroll-y="false">
      <div class="app">
        <!-- SIDEBAR -->
        <aside class="side" :class="{ open: navAbierto }">
          <div class="logo"><div class="mk">D</div><div class="nm">Distribuidora<small>Panel admin</small></div></div>
          <div class="navlbl">General</div>
          <a class="nav-a on"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg><span>Resumen</span></a>
          <a class="nav-a" @click="ir('/app/pedidos')"><svg viewBox="0 0 24 24"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg><span>Pedidos</span></a>
          <a class="nav-a" @click="ir('/app/productos')"><svg viewBox="0 0 24 24"><path d="M21 8l-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/></svg><span>Inventario</span></a>
          <a class="nav-a" @click="ir('/app/clientes')"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6"/></svg><span>Clientes</span></a>
          <a class="nav-a" @click="ir('/historial')"><svg viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg><span>Recorridos</span></a>
          <div class="spacer"></div>
          <div class="profile" @click="salir()" title="Cerrar sesión">
            <div class="av">{{ iniciales }}</div>
            <div class="who"><div class="n">{{ auth.usuario?.nombre }}</div><div class="r">Dueño</div></div>
          </div>
        </aside>
        <div class="scrim" :class="{ show: navAbierto }" @click="navAbierto = false"></div>

        <!-- MAIN -->
        <main class="main">
          <div class="top">
            <div style="display:flex;align-items:center;gap:12px">
              <div class="hamb" @click="navAbierto = true"><svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg></div>
              <div><h1>Resumen</h1><div class="sub">{{ subtitulo }}</div></div>
            </div>
            <div class="top-r">
              <div class="seg">
                <button v-for="r in rangos" :key="r.k" :class="{ on: rango === r.k }" @click="setRango(r.k)">{{ r.t }}</button>
              </div>
              <button class="btn-primary" @click="ir('/pedido/nuevo')"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Nuevo pedido</button>
            </div>
          </div>

          <p v-if="cargando" class="loading">Cargando panel…</p>
          <p v-else-if="error" class="error">{{ error }}</p>

          <template v-else-if="d">
            <!-- KPIs -->
            <div class="kpis">
              <div class="kpi v1">
                <div class="k"><span class="ic"><svg viewBox="0 0 24 24"><path d="M4 19V5M9 19V9M14 19v-6M19 19V7"/></svg></span>Ventas</div>
                <svg class="spark" viewBox="0 0 64 30"><polyline :points="spark(1)" fill="none" stroke="#0E5C4A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <div class="val">{{ money(d.ventasTotal) }} <small>MXN</small></div>
                <div class="foot"><span class="vs">{{ d.numeroPedidos }} pedidos · ticket {{ money(d.ticketPromedio) }}</span></div>
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

            <!-- gráfica + método -->
            <div class="row a">
              <div class="card">
                <div class="ch">
                  <div><h3>Ventas y utilidad</h3></div>
                  <div class="lg"><span><span class="dotc" style="background:var(--pine)"></span>Ventas</span><span><span class="dotc" style="background:var(--amber)"></span>Utilidad</span></div>
                </div>
                <svg class="chart" viewBox="0 0 720 240" preserveAspectRatio="none" v-if="serie.ventas">
                  <line x1="40" y1="40" x2="720" y2="40" stroke="#EAE3D5"/>
                  <line x1="40" y1="95" x2="720" y2="95" stroke="#EAE3D5"/>
                  <line x1="40" y1="150" x2="720" y2="150" stroke="#EAE3D5"/>
                  <line x1="40" y1="205" x2="720" y2="205" stroke="#EAE3D5"/>
                  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E5C4A" stop-opacity=".22"/><stop offset="1" stop-color="#0E5C4A" stop-opacity="0"/></linearGradient></defs>
                  <path :d="serie.area" fill="url(#g)"/>
                  <polyline :points="serie.ventas" fill="none" stroke="#0E5C4A" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
                  <polyline :points="serie.util" fill="none" stroke="#E8972E" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
                  <text v-for="(t, i) in serie.ticks" :key="i" :x="t.x" y="225" :text-anchor="i === 0 ? 'start' : 'middle'">{{ t.label }}</text>
                </svg>
                <p v-else class="vacio">Sin ventas en el periodo.</p>
              </div>
              <div class="card">
                <div class="ch"><h3>Por método</h3><span class="meta">{{ rangoTexto }}</span></div>
                <div class="donut-wrap">
                  <div class="donut" :style="{ background: donutBg }"><div class="ctr"><div class="v">{{ totalCorto }}</div><div class="l">TOTAL</div></div></div>
                  <div class="mlegend">
                    <div class="li" v-for="m in metodos" :key="m.nombre"><span class="dotc" :style="{ background: m.color }"></span><span class="nm">{{ m.nombre }}</span><span class="am">{{ m.pct }}%</span></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ranking + stock -->
            <div class="row b">
              <div class="card">
                <div class="ch"><h3>Productos más rentables</h3><span class="meta">Por utilidad</span></div>
                <div style="margin-top:8px">
                  <div class="rk" v-for="(p, i) in d.topProductos" :key="p.productoId">
                    <div class="pos" :class="{ gold: i === 0 }">{{ i + 1 }}</div>
                    <div class="em">📦</div>
                    <div class="info"><div class="n">{{ p.nombre }}</div><div class="bar"><i :style="{ width: barra(p.utilidad) + '%' }"></i></div></div>
                    <div class="util"><div class="u">{{ money(p.utilidad) }}</div><div class="m">{{ Math.round(p.margenPorcentaje) }}% margen</div></div>
                  </div>
                  <p v-if="!d.topProductos.length" class="vacio">Aún sin datos de utilidad.</p>
                </div>
              </div>
              <div class="card">
                <div class="ch"><h3>Alertas de stock</h3><span class="meta">{{ d.alertasStock.length }} por debajo del mínimo</span></div>
                <div style="margin-top:12px">
                  <div class="alert" v-for="a in d.alertasStock" :key="a.productoId">
                    <div class="em">📦</div>
                    <div class="info"><div class="n">{{ a.nombre }}</div><div class="s">Quedan <b>{{ fmt(a.stock) }}</b> · mín <b>{{ fmt(a.minimo) }}</b> · pedir <b>{{ fmt(a.sugerido) }}</b></div></div>
                    <button class="wa" @click="whatsapp(a)"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.4A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.2 1.1-1.7 1.2-.5.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1-1.4-1-2.6 0-1.2.6-1.8.9-2 .2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2 0 .4-.1.5l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.2.1.4.1.5-.1l.7-.8c.2-.2.4-.2.6-.1l1.8.9c.2.1.4.2.4.3.1.1.1.5-.1 1Z"/></svg>WhatsApp</button>
                  </div>
                  <p v-if="!d.alertasStock.length" class="vacio">Todo el inventario está por encima del mínimo. 👍</p>
                </div>
              </div>
            </div>
          </template>
        </main>
      </div>

      <!-- bottom nav (móvil) -->
      <nav class="botnav">
        <a class="on"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>Resumen</a>
        <a @click="ir('/app/pedidos')"><svg viewBox="0 0 24 24"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>Pedidos</a>
        <a @click="ir('/app/productos')"><svg viewBox="0 0 24 24"><path d="M21 8l-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/></svg>Inventario</a>
        <a @click="ir('/app/clientes')"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6"/></svg>Clientes</a>
      </nav>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { IonPage, IonContent, onIonViewWillEnter } from '@ionic/vue'
import http from '@/api/http'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const d = ref(null)
const cargando = ref(true)
const error = ref('')
const navAbierto = ref(false)
const rango = ref('mes')

const rangos = [{ k: 'hoy', t: 'Hoy' }, { k: 'semana', t: 'Semana' }, { k: 'mes', t: 'Mes' }, { k: 'anio', t: 'Año' }]
const rangoTexto = computed(() => ({ hoy: 'Hoy', semana: 'Esta semana', mes: 'Este mes', anio: 'Este año' }[rango.value]))

const money = (n) => '$' + Math.round(Number(n || 0)).toLocaleString('es-MX')
const fmt = (n) => Number(n || 0).toLocaleString('es-MX')
const iniciales = computed(() => (auth.usuario?.nombre || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase())
const margenFrac = computed(() => d.value ? (d.value.margenBrutoPorcentaje || 0) / 100 : 0)
const mermaPct = computed(() => d.value && d.value.ventasTotal > 0 ? (d.value.costoMerma / d.value.ventasTotal * 100).toFixed(1) : '0.0')
const subtitulo = computed(() => {
  const f = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
  return `${rangoTexto.value} · actualizado ${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
})

function ir(path) { navAbierto.value = false; router.push(path) }
function salir() { if (confirm('¿Cerrar sesión?')) { auth.logout(); router.replace('/login') } }

/* ----- gráfica de ventas/utilidad ----- */
const serie = computed(() => {
  const dias = d.value?.ventasPorDia || []
  if (!dias.length) return { ventas: '', util: '', area: '', ticks: [] }
  const x0 = 40, x1 = 700, y0 = 45, y1 = 200
  const max = Math.max(...dias.map((x) => x.total), 1)
  const n = dias.length
  const px = (i) => n === 1 ? (x0 + x1) / 2 : x0 + (x1 - x0) * i / (n - 1)
  const py = (v) => (y1 - (y1 - y0) * (v / max))
  const ventas = dias.map((x, i) => `${px(i).toFixed(0)},${py(x.total).toFixed(0)}`).join(' ')
  const util = dias.map((x, i) => `${px(i).toFixed(0)},${py(x.total * margenFrac.value).toFixed(0)}`).join(' ')
  const area = `M${px(0).toFixed(0)},${py(dias[0].total).toFixed(0)} ` +
    dias.map((x, i) => `L${px(i).toFixed(0)},${py(x.total).toFixed(0)}`).join(' ') +
    ` L${px(n - 1).toFixed(0)},205 L${px(0).toFixed(0)},205 Z`
  const idxs = n <= 5 ? dias.map((_, i) => i) : [0, Math.floor(n / 4), Math.floor(n / 2), Math.floor(3 * n / 4), n - 1]
  const ticks = idxs.map((i) => ({ x: px(i).toFixed(0), label: new Date(dias[i].fecha).getDate() }))
  return { ventas, util, area, ticks }
})
function spark(factor) {
  const dias = d.value?.ventasPorDia || []
  if (!dias.length) return ''
  const max = Math.max(...dias.map((x) => x.total), 1)
  const n = dias.length
  return dias.map((x, i) => {
    const px = n === 1 ? 32 : 64 * i / (n - 1)
    const py = 28 - 24 * (x.total * factor / max)
    return `${px.toFixed(1)},${py.toFixed(1)}`
  }).join(' ')
}

/* ----- dona por método ----- */
const COLORES = { Efectivo: '#0E5C4A', Transferencia: '#2E6F8E', Tarjeta: '#E8972E', Credito: '#C0573B' }
const NOMBRES = { Efectivo: 'Efectivo', Transferencia: 'Transferencia', Tarjeta: 'Tarjeta', Credito: 'Crédito' }
const metodos = computed(() => {
  const arr = d.value?.ventasPorMetodo || []
  const total = arr.reduce((s, m) => s + m.total, 0) || 1
  return ['Efectivo', 'Transferencia', 'Tarjeta', 'Credito'].map((k) => {
    const m = arr.find((x) => x.metodo === k)
    const t = m ? m.total : 0
    return { nombre: NOMBRES[k], color: COLORES[k], pct: Math.round(t / total * 100), val: t }
  })
})
const donutBg = computed(() => {
  let acc = 0
  const stops = metodos.value.map((m) => {
    const from = acc; acc += m.pct
    return `${m.color} ${from}% ${acc}%`
  })
  return `conic-gradient(${stops.join(',')})`
})
const totalCorto = computed(() => {
  const t = d.value?.ventasTotal || 0
  return t >= 1000 ? '$' + Math.round(t / 1000) + 'K' : money(t)
})

/* ----- ranking ----- */
const maxUtil = computed(() => Math.max(...(d.value?.topProductos || []).map((p) => p.utilidad), 1))
function barra(u) { return Math.max(4, Math.round(u / maxUtil.value * 100)) }

/* ----- whatsapp ----- */
function whatsapp(a) {
  const texto = a.whatsappTexto || `Hola, necesito surtir ${a.sugerido} de ${a.nombre}.`
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
}

/* ----- rango -> fechas ----- */
function fechasDeRango(k) {
  const hoy = new Date()
  const iso = (dt) => dt.toISOString().slice(0, 10)
  if (k === 'hoy') return { desde: iso(hoy), hasta: iso(hoy) }
  if (k === 'semana') { const x = new Date(hoy); x.setDate(x.getDate() - 6); return { desde: iso(x), hasta: iso(hoy) } }
  if (k === 'anio') return { desde: `${hoy.getFullYear()}-01-01`, hasta: iso(hoy) }
  return { desde: `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`, hasta: iso(hoy) }
}
function setRango(k) { rango.value = k; cargar() }

async function cargar() {
  cargando.value = true; error.value = ''
  try {
    const { desde, hasta } = fechasDeRango(rango.value)
    const { data } = await http.get('/dashboard', { params: { desde, hasta } })
    d.value = data
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudo cargar el panel.'
  } finally { cargando.value = false }
}
onIonViewWillEnter(cargar)
</script>

<style scoped>
.dash { --background: radial-gradient(1100px 600px at 90% -10%, #EAE2D1, transparent 55%), var(--paper); }
.app { display: flex; height: 100%; }

/* sidebar */
.side { width: 248px; flex: 0 0 auto; padding: 22px 16px; display: flex; flex-direction: column; gap: 6px; border-right: 1px solid var(--line); background: rgba(255,253,248,.5); height: 100%; transition: width .2s; }
.logo { display: flex; align-items: center; gap: 11px; padding: 6px 8px 20px; }
.logo .mk { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(150deg,var(--pine),var(--pine-deep)); display: grid; place-items: center; color: #fff; font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 21px; box-shadow: 0 6px 14px -6px rgba(14,92,74,.7); flex: 0 0 auto; }
.logo .nm { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 16px; letter-spacing: -.01em; line-height: 1.1; }
.logo .nm small { display: block; font-size: 11px; color: var(--muted); font-weight: 600; font-family: "Hanken Grotesk"; }
.navlbl { font-size: 10.5px; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; color: var(--muted); padding: 14px 10px 6px; }
.nav-a { display: flex; align-items: center; gap: 12px; padding: 11px 12px; border-radius: 12px; color: var(--ink-soft); font-weight: 600; font-size: 14px; text-decoration: none; cursor: pointer; transition: .15s; white-space: nowrap; }
.nav-a svg { width: 20px; height: 20px; stroke: currentColor; fill: none; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; flex: 0 0 auto; }
.nav-a:hover { background: var(--paper-2); }
.nav-a.on { background: var(--pine); color: #fff; box-shadow: 0 8px 16px -8px rgba(14,92,74,.6); }
.spacer { flex: 1; }
.profile { display: flex; align-items: center; gap: 11px; padding: 10px; border-radius: 13px; border: 1px solid var(--line); background: var(--surface); cursor: pointer; }
.profile .av { width: 36px; height: 36px; border-radius: 10px; background: var(--amber-soft); display: grid; place-items: center; color: #B9781F; font-weight: 700; font-size: 14px; flex: 0 0 auto; }
.profile .who { min-width: 0; }
.profile .who .n { font-weight: 700; font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.profile .who .r { font-size: 11.5px; color: var(--muted); font-weight: 600; }

/* main */
.main { flex: 1; min-width: 0; padding: 26px 30px 40px; overflow: auto; }
.loading, .error, .vacio { color: var(--muted); font-weight: 600; padding: 24px 4px; }
.error { color: var(--clay); }
.vacio { padding: 16px 4px; font-size: 13.5px; }
.top { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
.top h1 { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 27px; letter-spacing: -.02em; }
.top .sub { font-size: 13.5px; color: var(--muted); font-weight: 600; margin-top: 3px; }
.top-r { display: flex; align-items: center; gap: 12px; }
.seg { display: flex; background: var(--paper-2); border: 1px solid var(--line); border-radius: 12px; padding: 4px; }
.seg button { border: none; background: transparent; font-family: "Hanken Grotesk"; font-weight: 700; font-size: 13px; color: var(--muted); padding: 8px 15px; border-radius: 9px; cursor: pointer; transition: .15s; }
.seg button.on { background: var(--surface); color: var(--ink); box-shadow: 0 2px 6px rgba(0,0,0,.08); }
.btn-primary { display: flex; align-items: center; gap: 8px; background: var(--ink); color: #fff; border: none; border-radius: 12px; padding: 11px 16px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; cursor: pointer; box-shadow: 0 10px 20px -12px rgba(21,42,36,.7); transition: transform .15s; }
.btn-primary:hover { transform: translateY(-1px); }
.btn-primary svg { width: 17px; height: 17px; stroke: #fff; fill: none; stroke-width: 2.4; stroke-linecap: round; }
.hamb { display: none; width: 42px; height: 42px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); place-items: center; cursor: pointer; }
.hamb svg { width: 22px; height: 22px; stroke: var(--ink); fill: none; stroke-width: 2.2; stroke-linecap: round; }

/* KPIs */
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

/* rows */
.row { display: grid; gap: 16px; margin-bottom: 16px; }
.row.a { grid-template-columns: 1.9fr 1fr; }
.row.b { grid-template-columns: 1.35fr 1fr; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 20px; padding: 20px; box-shadow: var(--shadow); }
.card .ch { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.card .ch h3 { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 16.5px; letter-spacing: -.01em; }
.card .ch .meta { font-size: 12.5px; color: var(--muted); font-weight: 600; }
.card .ch .lg { display: flex; gap: 14px; }
.card .ch .lg span { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--ink-soft); }
.dotc { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.chart { width: 100%; height: 240px; margin-top: 14px; overflow: visible; }
.chart text { font-family: "Hanken Grotesk"; fill: var(--muted); font-size: 11px; font-weight: 600; }

/* donut */
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

/* ranking */
.rk { display: flex; align-items: center; gap: 13px; padding: 13px 0; border-bottom: 1px solid var(--line); }
.rk:last-child { border-bottom: none; }
.rk .pos { width: 26px; height: 26px; border-radius: 8px; background: var(--paper-2); display: grid; place-items: center; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13px; color: var(--ink-soft); flex: 0 0 auto; }
.rk .pos.gold { background: var(--amber); color: #fff; }
.rk .em { font-size: 20px; flex: 0 0 auto; }
.rk .info { flex: 1; min-width: 0; }
.rk .info .n { font-weight: 700; font-size: 14px; }
.rk .info .bar { height: 5px; border-radius: 4px; background: var(--paper-2); margin-top: 6px; overflow: hidden; }
.rk .info .bar i { display: block; height: 100%; background: var(--pine); border-radius: 4px; }
.rk .util { text-align: right; flex: 0 0 auto; }
.rk .util .u { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; font-variant-numeric: tabular-nums; }
.rk .util .m { font-size: 11.5px; color: var(--green); font-weight: 700; }

/* alerts */
.alert { display: flex; align-items: center; gap: 13px; padding: 13px; border-radius: 14px; background: var(--clay-soft); border: 1px solid #EAC9BC; margin-bottom: 11px; }
.alert .em { width: 40px; height: 40px; border-radius: 11px; background: #fff; display: grid; place-items: center; font-size: 20px; flex: 0 0 auto; }
.alert .info { flex: 1; min-width: 0; }
.alert .info .n { font-weight: 700; font-size: 14px; }
.alert .info .s { font-size: 12px; color: #9A4730; font-weight: 600; margin-top: 1px; }
.alert .info .s b { font-variant-numeric: tabular-nums; }
.wa { display: flex; align-items: center; gap: 7px; background: #1AA75A; color: #fff; border: none; border-radius: 11px; padding: 10px 13px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12.5px; cursor: pointer; white-space: nowrap; transition: transform .15s; box-shadow: 0 8px 16px -8px rgba(26,167,90,.7); }
.wa:hover { transform: translateY(-1px); }
.wa svg { width: 16px; height: 16px; fill: #fff; }

/* bottom nav móvil */
.botnav { display: none; position: fixed; left: 12px; right: 12px; bottom: 12px; height: 64px; background: rgba(255,253,248,.92); backdrop-filter: blur(16px); border: 1px solid var(--line); border-radius: 20px; align-items: center; justify-content: space-around; box-shadow: 0 14px 30px -14px rgba(21,42,36,.4); z-index: 60; }
.botnav a { display: flex; flex-direction: column; align-items: center; gap: 3px; color: var(--muted); font-size: 10px; font-weight: 600; text-decoration: none; cursor: pointer; }
.botnav a svg { width: 22px; height: 22px; stroke: currentColor; fill: none; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
.botnav a.on { color: var(--pine); }
.scrim { display: none; position: fixed; inset: 0; background: rgba(21,42,36,.4); z-index: 40; }

/* responsivo */
@media (max-width: 1180px) { .row.a, .row.b { grid-template-columns: 1fr; } }
@media (max-width: 1024px) {
  .side { width: 74px; padding: 22px 12px; }
  .side .logo .nm, .side .navlbl, .side .nav-a span, .side .profile .who { display: none; }
  .side .nav-a { justify-content: center; padding: 12px; }
  .side .profile { justify-content: center; padding: 8px; }
  .kpis { grid-template-columns: repeat(2,1fr); }
}
@media (max-width: 720px) {
  .side { display: none; }
  .main { padding: 20px 16px 96px; }
  .hamb { display: grid; }
  .top h1 { font-size: 23px; }
  .botnav { display: flex; }
  .side.open { display: flex; position: fixed; left: 0; top: 0; z-index: 50; width: 248px; padding: 22px 16px; background: var(--surface); }
  .side.open .logo .nm, .side.open .navlbl, .side.open .nav-a span, .side.open .profile .who { display: block; }
  .side.open .nav-a { justify-content: flex-start; padding: 11px 12px; }
  .scrim.show { display: block; }
}
@media (max-width: 440px) { .kpis { grid-template-columns: 1fr; } .donut-wrap { justify-content: center; } }
</style>
