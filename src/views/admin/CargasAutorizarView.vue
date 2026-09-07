<template>
  <div class="cargas-wrap">
    <!-- Métricas KPI -->
    <div class="kpis">
      <div class="kpi-card">
        <div class="kpi-l">Total pendientes</div>
        <div class="kpi-v">{{ items.length }}</div>
        <div class="kpi-s">Solicitudes de producto</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-l">Cargas nuevas</div>
        <div class="kpi-v text-amber">{{ totalCargas }}</div>
        <div class="kpi-s">Salida matutina de ruta</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-l">Reabastecimientos</div>
        <div class="kpi-v text-sky">{{ totalReabs }}</div>
        <div class="kpi-s">Pedidos adicionales en ruta</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-l">Valor total en espera</div>
        <div class="kpi-v money">{{ money(valorTotal) }}</div>
        <div class="kpi-s">Mercancía por despachar</div>
      </div>
    </div>

    <!-- Barra de búsqueda y pestañas de filtro -->
    <div class="toolbar">
      <div class="busc-wrap">
        <svg class="busc-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input class="busc-inp" type="text" v-model="busqueda" placeholder="Buscar por repartidor o producto…">
      </div>
      <div class="tabs">
        <button class="tab" :class="{ act: filtroTipo === 'todos' }" @click="filtroTipo = 'todos'">
          Todos <span class="badge-tab">{{ items.length }}</span>
        </button>
        <button class="tab" :class="{ act: filtroTipo === 'carga' }" @click="filtroTipo = 'carga'">
          Cargas nuevas <span class="badge-tab">{{ totalCargas }}</span>
        </button>
        <button class="tab" :class="{ act: filtroTipo === 'reabastecimiento' }" @click="filtroTipo = 'reabastecimiento'">
          Reabastecer <span class="badge-tab">{{ totalReabs }}</span>
        </button>
      </div>
    </div>

    <!-- Estado de carga y errores -->
    <p v-if="cargando" class="muted">Cargando pendientes de autorización…</p>
    <p v-else-if="error" class="err">{{ error }}</p>

    <!-- Estado vacío -->
    <div v-else-if="!filtrados.length" class="vacio">
      <div class="v-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg></div>
      <div class="v-t">{{ busqueda ? 'Sin resultados para la búsqueda' : 'Todo en orden: no hay nada por autorizar' }}</div>
      <div class="v-s">{{ busqueda ? 'Intenta con otro término o limpia el buscador.' : 'Cuando un repartidor arme su carga o solicite reabastecer en ruta, aparecerá aquí.' }}</div>
    </div>

    <!-- Grid de solicitudes -->
    <div v-else class="grid">
      <div v-for="it in filtrados" :key="it.tipo + '-' + it.id" class="card" :class="{ reab: it.tipo === 'reabastecimiento' }">
        <div class="c-head">
          <div class="c-rep">
            <div class="av" :class="{ reab: it.tipo === 'reabastecimiento' }">{{ ini(it.repartidorNombre) }}</div>
            <div>
              <div class="nm">{{ it.repartidorNombre }}</div>
              <div class="meta">
                <span class="tag" :class="it.tipo">{{ it.tipo === 'carga' ? 'Carga nueva' : 'Reabastecer' }}</span>
                #{{ it.id }} · {{ fecha(it.fecha) }}
              </div>
            </div>
          </div>
          <div class="c-val">{{ money(it.valor) }}</div>
        </div>

        <div class="c-lineas">
          <div class="cl" v-for="l in it.lineas" :key="l.id">
            <span class="pkg"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5v-9z"/><path d="M3 7.5l9 4.5 9-4.5"/><path d="M12 12v9"/></svg></span>
            <span class="cl-nm">{{ l.productoNombre }}</span>
            <div class="cl-info-stock">
              <span class="cl-q">{{ fmtQty(l.cantidad) }} pzas</span>
              <span class="cl-stk" :class="{ bajo: l.stockAlmacen < l.cantidad }">
                (Alm: {{ fmtQty(l.stockAlmacen) }})
              </span>
            </div>
          </div>
        </div>

        <button class="revisar" @click="abrir(it)">Revisar y autorizar</button>
      </div>
    </div>

    <!-- Modal de revisión y ajuste -->
    <div v-if="modal" class="modal-bg" @click.self="cerrar()">
      <div class="modal">
        <div class="m-head">
          <div>
            <div class="m-title">{{ modal.tipo === 'carga' ? 'Autorizar carga' : 'Autorizar reabastecimiento' }} #{{ modal.id }}</div>
            <div class="m-sub">{{ modal.repartidorNombre }} · Total ajustado: {{ money(totalAjustado) }}</div>
          </div>
          <button class="m-x" @click="cerrar()" title="Cerrar"><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>

        <div class="m-body">
          <div class="m-hint">
            {{ modal.tipo === 'carga'
              ? 'Valida los productos que saldrán del almacén. El stock físico se descontará al confirmar.'
              : 'El repartidor solicita estas piezas adicionales para su ruta. Puedes ajustar cantidades antes de autorizar.' }}
          </div>

          <div v-if="hayStockInsuficiente" class="banner-aviso">
            ⚠️ Uno o más productos superan el stock disponible en almacén. Ajusta las cantidades marcadas en rojo para poder autorizar.
          </div>

          <div class="m-linea" v-for="l in editable" :key="l.id">
            <div class="ml-info">
              <div class="ml-nm">{{ l.productoNombre }}</div>
              <div class="ml-sub">
                <span>Solicitó: <b>{{ fmtQty(l.original) }}</b></span>
                <span class="dot-sep">·</span>
                <span class="stk-badge" :class="{ alert: l.cantidad > l.stockAlmacen }">
                  Almacén: {{ fmtQty(l.stockAlmacen) }} disp.
                </span>
              </div>
              <div v-if="l.cantidad > l.stockAlmacen" class="stk-action-row">
                <span class="stk-err-txt">Excede inventario disponible</span>
                <button type="button" class="btn-ajuste-rapido" @click="l.cantidad = l.stockAlmacen">
                  Ajustar a {{ fmtQty(l.stockAlmacen) }}
                </button>
              </div>
            </div>
            <div class="stepper">
              <button @click="l.cantidad = Math.max(0, +(l.cantidad - 1).toFixed(3))" :disabled="l.cantidad <= 0">−</button>
              <input class="q" type="number" step="any" v-model.number="l.cantidad">
              <button @click="l.cantidad = +(l.cantidad + 1).toFixed(3)">+</button>
            </div>
          </div>

          <p v-if="modalError" class="m-err">{{ modalError }}</p>
        </div>

        <div class="m-foot" v-if="!modoRechazo">
          <button class="m-rechazar" @click="modoRechazo = true">Rechazar</button>
          <button
            class="m-ok"
            :disabled="procesando || !hayCantidades || hayStockInsuficiente"
            @click="autorizar()"
            :title="hayStockInsuficiente ? 'No puedes autorizar más producto del que existe en almacén' : ''"
          >
            {{ procesando ? 'Autorizando…' : 'Autorizar salida' }}
          </button>
        </div>

        <div v-if="modoRechazo" class="rechazo">
          <div class="r-fl">Motivo del rechazo (se notificará al chofer)</div>
          <textarea class="r-inp" v-model="motivo" rows="2" placeholder="Ej. No hay suficiente queso en almacén, ajusta tu pedido…"></textarea>
          <div class="r-foot">
            <button class="r-cancel" @click="modoRechazo = false">Volver</button>
            <button class="r-ok" :disabled="procesando" @click="rechazar()">{{ procesando ? 'Rechazando…' : 'Confirmar rechazo' }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tarjeta explicativa de la autorización de cargas -->
    <div class="guia-card">
      <button class="guia-toggle" @click="mostrarGuia = !mostrarGuia">
        <div class="gt-l">
          <span class="gt-ic">💡</span>
          <div>
            <div class="gt-t">¿Cómo funciona la autorización de cargas y reabastecimientos?</div>
            <div class="gt-s">Conoce el control de inventario de almacén a camioneta y el flujo de autorizaciones</div>
          </div>
        </div>
        <span class="gt-arrow">{{ mostrarGuia ? '▲ Ocultar' : '▼ Ver explicación' }}</span>
      </button>

      <div class="guia-content" v-show="mostrarGuia">
        <div class="gc-grid">
          <div class="gc-item">
            <div class="gc-num">1</div>
            <div class="gc-tx">
              <b>Cargas matutinas (Salida a ruta):</b> El chofer solicita el producto con el que iniciará el día. Al autorizarla, el sistema descuenta automáticamente las piezas del inventario general de almacén y las transfiere a la custodia del chofer.
            </div>
          </div>
          <div class="gc-item">
            <div class="gc-num">2</div>
            <div class="gc-tx">
              <b>Reabastecimientos en ruta:</b> Si el repartidor se queda sin producto a mitad de jornada, solicita mercancía adicional. Al autorizarla, se suma a su carga activa sin interrumpir sus ventas ni reiniciar su corte.
            </div>
          </div>
          <div class="gc-item">
            <div class="gc-num">3</div>
            <div class="gc-tx">
              <b>Control de existencias reales:</b> Cada renglón muestra en tiempo real cuántas piezas físicas quedan en almacén. El sistema te avisa si se solicita más producto del existente para que ajustes la cantidad antes de autorizar.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import http from '@/api/http'

const emit = defineEmits(['ctx'])
const items = ref([])
const cargando = ref(true)
const error = ref('')
const busqueda = ref('')
const filtroTipo = ref('todos') // 'todos', 'carga', 'reabastecimiento'
const mostrarGuia = ref(false)

const modal = ref(null)
const editable = ref([])
const modalError = ref('')
const procesando = ref(false)
const modoRechazo = ref(false)
const motivo = ref('')

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const fmtQty = (n) => Number(n || 0).toLocaleString('es-MX')
const fecha = (f) => new Date(f).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const ini = (n) => (n || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

const totalCargas = computed(() => items.value.filter((it) => it.tipo === 'carga').length)
const totalReabs = computed(() => items.value.filter((it) => it.tipo === 'reabastecimiento').length)
const valorTotal = computed(() => items.value.reduce((s, it) => s + (Number(it.valor) || 0), 0))

const filtrados = computed(() => {
  return items.value.filter((it) => {
    if (filtroTipo.value !== 'todos' && it.tipo !== filtroTipo.value) return false

    if (busqueda.value.trim()) {
      const q = busqueda.value.toLowerCase().trim()
      const rep = (it.repartidorNombre || '').toLowerCase()
      const prod = it.lineas.some((l) => (l.productoNombre || '').toLowerCase().includes(q))
      return rep.includes(q) || prod
    }
    return true
  })
})

const totalAjustado = computed(() =>
  editable.value.reduce((s, l) => s + (Number(l.cantidad) || 0) * (l.precioVenta || 0), 0))
const hayCantidades = computed(() => editable.value.some((l) => Number(l.cantidad) > 0))
const hayStockInsuficiente = computed(() =>
  editable.value.some((l) => Number(l.cantidad) > (Number(l.stockAlmacen) || 0)))

// Trae cargas pendientes y reabastecimientos pendientes, y los une en una sola lista enriquecida.
async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const [cargas, reabs] = await Promise.all([
      http.get('/cargas', { params: { estado: 'PendienteAutorizacion', tamano: 50 } }),
      http.get('/cargas/reabastecimientos', { params: { estado: 'Pendiente', tamano: 50 } })
    ])

    const listaCargas = (cargas.data?.items || []).map((c) => ({
      tipo: 'carga',
      id: c.id,
      repartidorNombre: c.repartidorNombre,
      fecha: c.fecha,
      valor: c.valorCargado,
      lineas: (c.lineas || []).map((l) => ({
        id: l.id,
        productoNombre: l.productoNombre,
        precioVenta: l.precioVenta,
        cantidad: l.cantidadCargada,
        stockAlmacen: Number(l.stockAlmacen) || 0
      }))
    }))

    const listaReabs = (reabs.data?.items || []).map((r) => ({
      tipo: 'reabastecimiento',
      id: r.id,
      repartidorNombre: r.repartidorNombre,
      fecha: r.fecha,
      valor: r.valorSolicitado,
      lineas: (r.lineas || []).map((l) => ({
        id: l.id,
        productoNombre: l.productoNombre,
        precioVenta: l.precioVenta,
        cantidad: l.cantidad,
        stockAlmacen: Number(l.stockAlmacen) || 0
      }))
    }))

    items.value = [...listaCargas, ...listaReabs].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudieron cargar las solicitudes pendientes.'
  } finally {
    cargando.value = false
  }
}

function abrir(it) {
  modal.value = it
  editable.value = it.lineas.map((l) => ({
    id: l.id,
    productoNombre: l.productoNombre,
    precioVenta: l.precioVenta,
    original: l.cantidad,
    cantidad: l.cantidad,
    stockAlmacen: Number(l.stockAlmacen) || 0
  }))
  modalError.value = ''
  modoRechazo.value = false
  motivo.value = ''
}

function cerrar() {
  modal.value = null
}

async function autorizar() {
  if (hayStockInsuficiente.value) {
    modalError.value = 'No puedes autorizar cantidades superiores al stock disponible en almacén.'
    return
  }

  const esCarga = modal.value.tipo === 'carga'
  const ajustes = editable.value
    .filter((l) => Number(l.cantidad) !== l.original)
    .map((l) => esCarga
      ? { cargaLineaId: l.id, cantidad: Number(l.cantidad) }
      : { reabastecimientoLineaId: l.id, cantidad: Number(l.cantidad) })

  const url = esCarga
    ? `/cargas/${modal.value.id}/autorizar`
    : `/cargas/reabastecimientos/${modal.value.id}/autorizar`

  procesando.value = true
  modalError.value = ''

  try {
    await http.post(url, { lineas: ajustes.length ? ajustes : null })
    cerrar()
    await cargar()
  } catch (e) {
    modalError.value = e.response?.data?.mensaje || 'No se pudo autorizar la solicitud.'
  } finally {
    procesando.value = false
  }
}

async function rechazar() {
  const esCarga = modal.value.tipo === 'carga'
  const url = esCarga
    ? `/cargas/${modal.value.id}/rechazar`
    : `/cargas/reabastecimientos/${modal.value.id}/rechazar`

  procesando.value = true
  modalError.value = ''

  try {
    await http.post(url, { motivo: motivo.value.trim() || null })
    cerrar()
    await cargar()
  } catch (e) {
    modalError.value = e.response?.data?.mensaje || 'No se pudo rechazar la solicitud.'
  } finally {
    procesando.value = false
  }
}

onMounted(() => {
  emit('ctx', {
    titulo: 'Cargas por autorizar',
    sub: 'Supervisa y valida los productos que salen del almacén a ruta',
    back: null
  })
  cargar()
})
</script>

<style scoped>
.cargas-wrap { display: flex; flex-direction: column; gap: 16px; }

/* KPIs */
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
.kpi-card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px 16px; box-shadow: var(--shadow); }
.kpi-l { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); margin-bottom: 4px; }
.kpi-v { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 24px; color: var(--ink); }
.kpi-v.text-amber { color: #B9781F; }
.kpi-v.text-sky { color: #1F5269; }
.kpi-v.money { color: var(--pine); }
.kpi-s { font-size: 12px; color: var(--muted); margin-top: 2px; }

/* Toolbar */
.toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.busc-wrap { position: relative; flex: 1; min-width: 260px; }
.busc-ic { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; stroke: var(--muted); pointer-events: none; }
.busc-inp { width: 100%; border: 1px solid var(--line); background: var(--surface); border-radius: 12px; padding: 10px 14px 10px 38px; font-family: "Hanken Grotesk"; font-size: 14px; color: var(--ink); box-shadow: var(--shadow); }

.tabs { display: flex; gap: 4px; background: var(--paper-2); padding: 3px; border-radius: 12px; border: 1px solid var(--line); }
.tab { border: none; background: transparent; padding: 7px 12px; border-radius: 9px; font-family: "Hanken Grotesk"; font-size: 13px; font-weight: 600; color: var(--muted); cursor: pointer; display: flex; align-items: center; gap: 6px; }
.tab.act { background: var(--surface); color: var(--ink); font-weight: 700; box-shadow: 0 2px 6px rgba(0,0,0,.06); }
.badge-tab { font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 6px; background: var(--line); color: var(--ink-soft); }
.tab.act .badge-tab { background: var(--pine-tint); color: var(--pine); }

/* Vacio */
.vacio { text-align: center; padding: 50px 20px; background: var(--surface); border: 1px dashed var(--line); border-radius: 20px; }
.v-ic { width: 64px; height: 64px; border-radius: 18px; margin: 0 auto 16px; display: grid; place-items: center; background: var(--pine-tint); }
.v-ic svg { width: 30px; height: 30px; stroke: var(--pine); fill: none; }
.v-t { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; color: var(--ink); }
.v-s { color: var(--muted); font-size: 13.5px; margin-top: 6px; }

/* Grid de solicitudes */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 14px; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 20px; padding: 16px; box-shadow: var(--shadow); transition: all .15s ease; }
.card.reab { border-color: #C7DDE7; }
.card:hover { transform: translateY(-1px); box-shadow: 0 8px 18px -6px rgba(0,0,0,.1); }

.c-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.c-rep { display: flex; align-items: center; gap: 11px; }
.c-rep .av { width: 40px; height: 40px; border-radius: 12px; background: var(--amber-soft); display: grid; place-items: center; color: #B9781F; font-weight: 700; font-size: 14px; flex: 0 0 auto; }
.c-rep .av.reab { background: var(--sky-soft); color: #1F5269; }
.c-rep .nm { font-weight: 700; font-size: 15px; color: var(--ink); }
.c-rep .meta { font-size: 12px; color: var(--muted); margin-top: 3px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.tag { font-size: 10px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; padding: 2px 7px; border-radius: 6px; }
.tag.carga { color: #B9781F; background: var(--amber-soft); }
.tag.reabastecimiento { color: #1F5269; background: var(--sky-soft); }
.c-val { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; color: var(--ink); flex: 0 0 auto; }

.c-lineas { background: var(--paper); border: 1px solid var(--line); border-radius: 12px; padding: 6px 12px; margin-bottom: 12px; max-height: 180px; overflow-y: auto; }
.cl { display: flex; align-items: center; gap: 9px; padding: 8px 0; border-bottom: 1px solid var(--line); }
.cl:last-child { border-bottom: none; }
.cl .pkg svg { width: 16px; height: 16px; stroke: var(--ink-soft); fill: none; }
.cl-nm { flex: 1; font-size: 13.5px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cl-info-stock { display: flex; align-items: center; gap: 6px; flex: 0 0 auto; }
.cl-q { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; color: var(--ink); font-variant-numeric: tabular-nums; }
.cl-stk { font-size: 11.5px; color: var(--muted); font-weight: 500; }
.cl-stk.bajo { color: var(--clay); font-weight: 700; }

.revisar { width: 100%; background: var(--pine); color: #fff; border: none; border-radius: 13px; padding: 13px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; box-shadow: 0 8px 16px -8px rgba(14,92,74,.6); transition: opacity .15s; }
.revisar:hover { opacity: .92; }

/* Modal de revisión */
.modal-bg { position: fixed; inset: 0; background: rgba(21,42,36,.5); backdrop-filter: blur(4px); display: grid; place-items: center; z-index: 3000; padding: 20px; }
.modal { background: var(--surface); border-radius: 22px; width: 100%; max-width: 480px; box-shadow: 0 30px 60px -20px rgba(0,0,0,.5); overflow: hidden; max-height: 90vh; display: flex; flex-direction: column; }
.m-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 20px 14px; border-bottom: 1px solid var(--line); }
.m-title { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; color: var(--ink); }
.m-sub { font-size: 13px; color: var(--muted); font-weight: 600; margin-top: 2px; }
.m-x { width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--line); background: var(--paper); display: grid; place-items: center; cursor: pointer; flex: 0 0 auto; }
.m-x svg { width: 16px; height: 16px; stroke: var(--muted); fill: none; stroke-width: 2.4; stroke-linecap: round; }

.m-body { padding: 16px 20px; overflow-y: auto; }
.m-hint { font-size: 12.5px; color: var(--muted); font-weight: 500; margin-bottom: 12px; line-height: 1.4; }
.banner-aviso { background: #FFF4F0; border: 1px solid #F8D7DA; color: #721C24; border-radius: 11px; padding: 10px 12px; font-size: 12px; font-weight: 600; line-height: 1.4; margin-bottom: 12px; }

.m-linea { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--line); }
.m-linea:last-child { border-bottom: none; }
.ml-info { flex: 1; min-width: 0; }
.ml-nm { font-weight: 700; font-size: 14.5px; color: var(--ink); }
.ml-sub { font-size: 12px; color: var(--muted); margin-top: 2px; display: flex; align-items: center; gap: 6px; }
.dot-sep { color: var(--line); }
.stk-badge { font-size: 11.5px; color: var(--ink-soft); font-weight: 600; }
.stk-badge.alert { color: var(--clay); font-weight: 700; }

.stk-action-row { display: flex; align-items: center; gap: 8px; margin-top: 5px; }
.stk-err-txt { font-size: 11px; color: var(--clay); font-weight: 700; }
.btn-ajuste-rapido { border: 1px solid #F5C6CB; background: #FFF0F2; color: var(--clay); font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 6px; cursor: pointer; }
.btn-ajuste-rapido:hover { background: #F8D7DA; }

.stepper { display: flex; align-items: center; background: var(--paper); border: 1px solid var(--line); border-radius: 11px; overflow: hidden; flex: 0 0 auto; }
.stepper button { width: 34px; height: 38px; border: none; background: transparent; font-size: 19px; color: var(--pine); cursor: pointer; font-weight: 600; }
.stepper button:disabled { color: #C7CFC9; cursor: not-allowed; }
.stepper .q { width: 60px; text-align: center; border: none; background: transparent; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; color: var(--ink); font-variant-numeric: tabular-nums; }
.stepper .q:focus { outline: none; }

.m-err { color: var(--clay); font-size: 13px; font-weight: 600; margin-top: 12px; }
.m-foot { display: flex; gap: 10px; padding: 12px 20px 20px; border-top: 1px solid var(--line); }
.m-rechazar { flex: 1; border: 1px solid var(--clay-soft); background: var(--clay-soft); color: var(--clay); border-radius: 13px; padding: 13px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; }
.m-ok { flex: 1.6; border: none; background: var(--pine); color: #fff; border-radius: 13px; padding: 13px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; box-shadow: 0 8px 16px -8px rgba(14,92,74,.6); transition: opacity .15s; }
.m-ok:disabled { opacity: .45; cursor: not-allowed; }

.rechazo { padding: 16px 20px 20px; border-top: 1px solid var(--line); }
.r-fl { font-size: 11.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
.r-inp { width: 100%; border: 1px solid var(--line); background: var(--paper); border-radius: 11px; padding: 11px 13px; font-family: "Hanken Grotesk"; font-size: 14px; color: var(--ink); resize: vertical; }
.r-foot { display: flex; gap: 10px; margin-top: 12px; }
.r-cancel { flex: 1; border: 1px solid var(--line); background: var(--surface); color: var(--ink-soft); border-radius: 12px; padding: 12px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; cursor: pointer; }
.r-ok { flex: 1.4; border: none; background: var(--clay); color: #fff; border-radius: 12px; padding: 12px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; cursor: pointer; }
.r-ok:disabled { opacity: .5; }

.muted { color: var(--muted); margin-top: 24px; }
.err { color: var(--clay); font-weight: 600; margin-top: 24px; }

/* Tarjeta de Guía Explicativa */
.guia-card { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow); overflow: hidden; margin-top: 8px; }
.guia-toggle { width: 100%; border: none; background: transparent; display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; cursor: pointer; text-align: left; }
.gt-l { display: flex; align-items: center; gap: 12px; }
.gt-ic { font-size: 22px; flex: 0 0 auto; }
.gt-t { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14.5px; color: var(--ink); }
.gt-s { font-size: 12px; color: var(--muted); margin-top: 1px; }
.gt-arrow { font-size: 12px; font-weight: 700; color: var(--pine); }
.guia-content { padding: 0 18px 18px; border-top: 1px solid var(--line); background: var(--paper); }
.gc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-top: 14px; }
.gc-item { display: flex; gap: 10px; }
.gc-num { width: 22px; height: 22px; border-radius: 50%; background: var(--pine-tint); color: var(--pine); display: grid; place-items: center; font-weight: 800; font-size: 11.5px; flex: 0 0 auto; margin-top: 2px; }
.gc-tx { font-size: 12.5px; color: var(--ink-soft); line-height: 1.45; }
.gc-tx b { color: var(--ink); }
</style>
