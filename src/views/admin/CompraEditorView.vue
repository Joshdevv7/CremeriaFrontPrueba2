<template>
  <div class="editor">
    <p v-if="cargando" class="muted">Cargando catálogo y proveedores…</p>
    <p v-if="cargaFallida" class="err">{{ error }}</p>
    <template v-if="!cargando && !cargaFallida">
      <div class="form" v-show="!exito">
        <!-- Columna Izquierda: Proveedor y Resumen -->
        <div class="col selects">
          <div class="field">
            <div class="fl">Proveedor *</div>
            <select class="inp sel" v-model="proveedorId">
              <option :value="null" disabled>Selecciona un proveedor…</option>
              <option v-for="p in proveedores" :key="p.id" :value="p.id">{{ p.nombre }}</option>
            </select>
          </div>

          <div class="field">
            <div class="fl">Folio / factura / remisión (opcional)</div>
            <input class="inp" v-model="referencia" placeholder="Ej. Factura F-9821 / Nota 104">
          </div>

          <div class="totcard">
            <div class="k">
              Total de la compra
              <b>{{ lineasActivas.length }} producto(s) en orden</b>
            </div>
            <div class="v">{{ money(total) }}</div>

            <div class="resumen-pzas" v-if="lineasActivas.length > 0">
              <span>Cantidades a ingresar:</span>
              <b>{{ resumenUnidadesIngresadas }}</b>
            </div>

            <button class="cta" :disabled="enviando || !puede" @click="registrar()">
              {{ enviando ? 'Registrando compra…' : 'Registrar entrada de compra' }}
            </button>

            <p class="nota">
              Al registrar, aumenta la mercancía disponible y se actualiza el costo promedio de cada producto.
            </p>
            <p v-if="costosPendientes" class="err">Captura un costo de compra mayor a cero, con máximo ocho decimales, para cada producto seleccionado.</p>
            <p v-if="error" class="err">{{ error }}</p>
          </div>
        </div>

        <!-- Columna Derecha: Selección de Productos -->
        <div class="col">
          <div class="eyebrow">
            <span>Productos a surtir</span>
            <button class="scan-b" type="button" @click="mostrarScan = true">
              <svg viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M3 12h18"/></svg>
              Escanear
            </button>
          </div>

          <div class="search-row">
            <div class="search">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
              <input v-model="buscar" placeholder="Buscar producto por nombre o código (mínimo 3 caracteres)">
            </div>

            <button
              v-if="proveedorId"
              type="button"
              class="filtro-prov-btn"
              :class="{ on: soloProveedor }"
              @click="soloProveedor = !soloProveedor"
            >
              {{ soloProveedor ? 'Solo de este proveedor' : 'Todo el catálogo' }}
            </button>
          </div>

          <div
            v-for="p in filtrados"
            :key="p.id"
            class="prod"
            :class="{ act: (cant[p.id]||0)>0, flash: resaltado===p.id, delProv: p.proveedorId === proveedorId }"
            :ref="(el)=>setRef(p.id, el)"
          >
            <div class="top">
              <div class="emoji">
                <svg class="pkg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5v-9z"/><path d="M3 7.5l9 4.5 9-4.5"/><path d="M12 12v9"/>
                </svg>
              </div>

              <div class="meta">
                <div class="nm-row">
                  <span class="nm">{{ p.nombre }}</span>
                  <span v-if="p.proveedorId === proveedorId && proveedorId" class="tag-prov">Surtido habitual</span>
                </div>
                <div class="pr">
                  Costo promedio por {{ unidadBaseCompra(p).singular }}: <b>{{ money(p.costoPromedio) }}</b> · En almacén: <b>{{ fmt(p.stockAlmacen) }} {{ unidadBaseCompra(p).plural }}</b>
                </div>
              </div>

              <div class="stepper">
                <button @click="dec(p.id)" :disabled="(cant[p.id]||0)<=0">−</button>
                <input class="q" type="number" min="0" step="any" inputmode="decimal" :aria-label="`Cantidad de ${p.nombre} en ${unidad[p.id] === 'caja' ? (unidadBaseCompra(p).singular === 'caja' ? 'paquetes' : 'cajas') : unidadBaseCompra(p).plural}`" :value="cant[p.id] || 0" @input="setCant(p.id, $event.target.value)" @focus="$event.target.select()">
                <button @click="inc(p.id)">+</button>
              </div>
            </div>

            <!-- Modalidad por caja o pieza -->
            <div v-if="factorCompra(p, 'caja') > 1" class="uni">
              <button type="button" :class="{ on: unidad[p.id] !== 'caja' }" @click="setUnidad(p.id, 'pza')">Comprar por {{ unidadBaseCompra(p).singular }}{{ unidadBaseCompra(p).singular === 'caja' ? ' completa' : '' }}</button>
              <button type="button" :class="{ on: unidad[p.id] === 'caja' }" @click="setUnidad(p.id, 'caja')">Comprar por {{ unidadBaseCompra(p).singular === 'caja' ? 'paquete' : 'caja' }} de {{ p.piezasPorCaja }} {{ unidadBaseCompra(p).plural }}</button>
            </div>

            <!-- Entrada de costo -->
            <div v-if="(cant[p.id]||0)>0" class="costo">
              <div class="costo-lbl">
                <span>Costo por {{ unidad[p.id] === 'caja' ? (unidadBaseCompra(p).singular === 'caja' ? 'paquete' : 'caja') : unidadBaseCompra(p).singular }}{{ unidadBaseCompra(p).singular === 'caja' && unidad[p.id] !== 'caja' ? ' completa' : '' }} en esta compra:</span>
                <small v-if="unidad[p.id]==='caja'">= {{ fmt(piezasLinea(p)) }} {{ unidadBaseCompra(p).plural }} a {{ money((Number(costo[p.id])||0) / factorCompra(p, unidad[p.id])) }} por {{ unidadBaseCompra(p).singular }}</small>
              </div>
              <div class="cinp">
                <span>$</span>
                <input v-model.number="costo[p.id]" type="number" min="0.00000001" step="any" :aria-label="`Costo de compra de ${p.nombre}`" placeholder="Captura costo">
              </div>
            </div>

            <!-- Preview del nuevo Costo Promedio Ponderado -->
            <div v-if="(cant[p.id]||0)>0" class="cpp-preview">
              <span class="cpp-tag">Nuevo stock y costo promedio:</span>
              <b>{{ fmt(Number(p.stockAlmacen) + piezasLinea(p)) }} {{ unidadBaseCompra(p).plural }}</b>
              <span class="sep">→</span>
              <span class="cpp-val">Costo promedio después de la compra: <b>{{ money(calcNuevoCpp(p)) }}</b></span>
            </div>
          </div>

          <p v-if="!filtrados.length" class="muted">No hay productos que coincidan con la búsqueda.</p>
        </div>
      </div>
    </template>

    <transition name="fadem"><div v-if="scanMsg" class="scanmsg">{{ scanMsg }}</div></transition>
    <BarcodeScanner :show="mostrarScan" continuo @scan="onScan" @close="mostrarScan = false" />
    <ExitoOverlay :show="exito" titulo="Compra registrada con éxito" :subtitulo="provNombre" :detalle="exitoDet" cta-texto="Ver historial de compras" @done="salir" />
  </div>
</template>

<script setup>
import { useBusqueda, normalizarBusqueda } from '@/composables/useBusqueda'
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import http from '@/api/http'
import { listarPaginas } from '@/api/listarPaginas'
import { cantidadCompra, factorCompra, unidadBaseCompra, costoCompraValido, convertirCostoCompra, subtotalCompraCentavos, costoPromedioCompra } from '@/utils/compra'
import ExitoOverlay from '@/components/ExitoOverlay.vue'
import BarcodeScanner from '@/components/BarcodeScanner.vue'

const emit = defineEmits(['ctx'])
const route = useRoute()
const router = useRouter()
const proveedores = ref([])
const productos = ref([])
const proveedorId = ref(null)
const referencia = ref('')
const cant = reactive({})
const costo = reactive({})
const costosOrigen = {} // Last captured cost and presentation; conversions do not overwrite it.
const unidad = reactive({}) // productoId -> 'pza' | 'caja'
const { buscar: buscar, termino: terminoBusqueda } = useBusqueda('')
const soloProveedor = ref(false)
const cargando = ref(true)
const cargaFallida = ref(false)
const enviando = ref(false)
const error = ref('')
const exito = ref(false)
const exitoDet = ref([])
const mostrarScan = ref(false)
const scanMsg = ref('')
const resaltado = ref(null)
const refs = {}

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt = (n) => Number(n || 0).toLocaleString('es-MX')
const pmap = computed(() => Object.fromEntries(productos.value.map((p) => [p.id, p])))

const filtrados = computed(() => {
  let list = productos.value
  if (soloProveedor.value && proveedorId.value) {
    list = list.filter(p => p.proveedorId === proveedorId.value)
  }
  const t = terminoBusqueda.value
  if (t) {
    list = list.filter((p) =>
      normalizarBusqueda(p.nombre).includes(t) ||
      (p.codigoBarras && normalizarBusqueda(p.codigoBarras).includes(t))
    )
  }
  // Si hay un proveedor seleccionado, ordenar colocando primero los que le corresponden
  if (proveedorId.value) {
    return [...list].sort((a, b) => {
      const aEs = a.proveedorId === proveedorId.value ? -1 : 1
      const bEs = b.proveedorId === proveedorId.value ? -1 : 1
      return aEs - bEs
    })
  }
  return list
})

const lineasActivas = computed(() => Object.entries(cant).filter(([, q]) => q > 0).map(([id]) => Number(id)))
const total = computed(() => Number(lineasActivas.value.reduce((s, id) => s + subtotalCompraCentavos(cant[id], costo[id]), 0n)) / 100)

const totalPiezasIngresadas = computed(() => {
  return lineasActivas.value.reduce((s, id) => {
    const p = pmap.value[id]
    if (!p) return s
    return s + piezasLinea(p)
  }, 0)
})

const resumenUnidadesIngresadas = computed(() => {
  const cantidades = new Map()
  for (const id of lineasActivas.value) {
    const p = pmap.value[id]
    if (!p) continue
    const etiqueta = unidadBaseCompra(p).plural
    cantidades.set(etiqueta, (cantidades.get(etiqueta) || 0) + piezasLinea(p))
  }
  return [...cantidades].map(([etiqueta, cantidad]) => `${fmt(cantidad)} ${etiqueta}`).join(' · ')
})

const provNombre = computed(() => proveedores.value.find((p) => p.id === proveedorId.value)?.nombre || '')
const costosPendientes = computed(() => lineasActivas.value.some(id => !costoCompraValido(costo[id])))
const puede = computed(() => proveedorId.value && lineasActivas.value.length > 0 && !costosPendientes.value)

function setRef(id, el) { if (el) refs[id] = el }
function setUnidad(id, u) {
  if ((unidad[id] || 'pza') === u) return
  const p = pmap.value[id]
  if (u === 'caja' && factorCompra(p, u) === 1) return
  asegurarCosto(id)
  let origen = costosOrigen[id]
  // v-model edits are new captured costs. Conversions retain their original
  // anchor so a manual box cost survives a round trip through a repeating ratio.
  if (!Object.is(costo[id], origen.mostrado)) {
    origen = { valor: costo[id], factor: factorCompra(p, unidad[id]) }
    costosOrigen[id] = origen
  }
  unidad[id] = u
  costo[id] = convertirCostoCompra(origen.valor, origen.factor, factorCompra(p, u))
  origen.mostrado = costo[id]
}
function asegurarCosto(id) {
  if (costo[id] === undefined) {
    const p = pmap.value[id]
    const valor = costoCompraValido(p?.costoPromedio) ? Number(p.costoPromedio) : ''
    costo[id] = convertirCostoCompra(valor, 1, factorCompra(p, unidad[id]))
    costosOrigen[id] = { valor, factor: 1, mostrado: costo[id] }
  }
}
function inc(id) { cant[id] = (cant[id] || 0) + 1; asegurarCosto(id) }
function dec(id) { if (cant[id] > 0) cant[id] = Math.max(0, cant[id] - 1) }
function setCant(id, val) {
  const n = cantidadCompra(val)
  cant[id] = n
  if (n > 0) asegurarCosto(id)
}

function piezasLinea(p) {
  const c = cant[p.id] || 0
  return c * factorCompra(p, unidad[p.id])
}

function calcNuevoCpp(p) {
  const c = cant[p.id] || 0
  if (c <= 0) return p.costoPromedio
  return costoPromedioCompra(p.stockAlmacen, p.costoPromedio, c, costo[p.id], factorCompra(p, unidad[p.id]))
}

function salir() { router.replace('/panel/compras') }
function normCod(x) { return String(x || '').replace(/\s/g, '') }

async function onScan(code) {
  const p = productos.value.find((x) => x.codigoBarras && normCod(x.codigoBarras) === normCod(code))
  if (!p) {
    scanMsg.value = `Código ${code} no está en el catálogo`
    setTimeout(() => { scanMsg.value = '' }, 2500)
    return
  }
  if (!cant[p.id]) {
    cant[p.id] = 1
    asegurarCosto(p.id)
  }
  scanMsg.value = `Agregado: ${p.nombre} — ajusta cantidad y costo`
  setTimeout(() => { scanMsg.value = '' }, 2500)
  resaltado.value = p.id
  setTimeout(() => { if (resaltado.value === p.id) resaltado.value = null }, 1500)
  await nextTick()
  refs[p.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

async function registrar() {
  if (enviando.value || !puede.value) return
  enviando.value = true
  error.value = ''
  const lineas = lineasActivas.value.map((id) => {
    const esCaja = unidad[id] === 'caja'
    return { productoId: id, cantidad: cant[id] || 0, costoUnitario: Number(costo[id]) || 0, esCaja }
  })
  try {
    await http.post('/compras', {
      proveedorId: proveedorId.value,
      referencia: referencia.value.trim() || null,
      lineas
    })
    exitoDet.value = [
      { k: 'Proveedor', v: provNombre.value },
      { k: 'Productos', v: `${lineas.length} artículo(s)` },
      { k: 'Cantidades ingresadas', v: resumenUnidadesIngresadas.value },
      { k: 'Total factura', v: money(total.value) }
    ]
    exito.value = true
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudo registrar la compra.'
  } finally {
    enviando.value = false
  }
}

onMounted(async () => {
  emit('ctx', { titulo: 'Nueva compra', sub: 'Entrada de mercancía a almacén', back: '/panel/compras' })
  try {
    const [pv, pr] = await Promise.all([
      listarPaginas('/proveedores'),
      listarPaginas('/productos')
    ])
    proveedores.value = pv
    productos.value = pr

    // Preseleccionar si viene por URL (ej. desde ProveedoresView)
    if (route.query.proveedorId) {
      const qId = Number(route.query.proveedorId)
      if (proveedores.value.some(p => p.id === qId)) {
        proveedorId.value = qId
        soloProveedor.value = true
      }
    }
  } catch {
    cargaFallida.value = true
    error.value = 'No se pudieron cargar los proveedores o productos.'
  } finally {
    cargando.value = false
  }
})
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; }
.err { color: var(--clay); font-size: 13px; font-weight: 600; margin-top: 10px; }
.form { display: grid; grid-template-columns: 1fr 1.3fr; gap: 18px; align-items: start; }
.col { display: flex; flex-direction: column; gap: 11px; }

.eyebrow { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 11.5px; letter-spacing: .13em; text-transform: uppercase; color: var(--muted); margin: 4px 2px; display: flex; align-items: center; justify-content: space-between; }
.scan-b { display: flex; align-items: center; gap: 7px; border: 1px solid var(--line); background: var(--sky-soft); color: #1F5269; border-radius: 10px; padding: 7px 12px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12px; letter-spacing: 0; text-transform: none; cursor: pointer; }
.scan-b svg { width: 17px; height: 17px; stroke: var(--sky); fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

.field { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px; box-shadow: var(--shadow); }
.fl { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 9px; }
.inp { width: 100%; border: 1px solid var(--line); background: var(--paper); border-radius: 11px; padding: 12px 13px; font-family: "Hanken Grotesk"; font-size: 15px; font-weight: 600; color: var(--ink); }
.sel { appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%237C8A82' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; }

.totcard { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 16px; box-shadow: var(--shadow); position: sticky; top: 10px; }
.totcard .k { font-size: 12.5px; color: var(--muted); font-weight: 600; }
.totcard .k b { display: block; color: var(--ink); font-size: 11px; font-weight: 600; margin-top: 2px; }
.totcard .v { font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 32px; letter-spacing: -.02em; font-variant-numeric: tabular-nums; margin: 6px 0 10px; color: var(--ink); }
.resumen-pzas { display: flex; justify-content: space-between; font-size: 12px; background: var(--paper-2); padding: 8px 11px; border-radius: 9px; margin-bottom: 12px; }
.resumen-pzas span { color: var(--muted); }
.resumen-pzas b { color: var(--pine); font-weight: 700; }

.cta { width: 100%; background: var(--pine); color: #fff; border: none; border-radius: 14px; padding: 15px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; cursor: pointer; box-shadow: 0 12px 22px -12px rgba(14,92,74,.8); }
.cta:disabled { opacity: .5; }
.nota { font-size: 11.5px; color: var(--muted); margin-top: 10px; line-height: 1.4; }

.search-row { display: flex; gap: 8px; align-items: center; }
.search { flex: 1; display: flex; align-items: center; gap: 10px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 11px 14px; box-shadow: var(--shadow); }
.search svg { width: 18px; height: 18px; stroke: var(--muted); fill: none; stroke-width: 2; flex: 0 0 auto; }
.search input { border: none; background: transparent; outline: none; font-size: 14px; font-weight: 500; color: var(--ink); width: 100%; }

.filtro-prov-btn { border: 1px solid var(--line); background: var(--surface); color: var(--muted); font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12px; border-radius: 12px; padding: 10px 12px; cursor: pointer; box-shadow: var(--shadow); white-space: nowrap; }
.filtro-prov-btn.on { background: var(--sky-soft); color: var(--sky); border-color: var(--sky); }

/* Producto Card */
.prod { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 13px 14px; box-shadow: var(--shadow); transition: background .2s, border-color .2s; }
.prod.delProv { border-left: 4px solid var(--sky); }
.prod.act { border-color: var(--pine); }
.prod.flash { background: var(--sky-soft); }

.prod .top { display: flex; align-items: center; gap: 12px; }
.emoji { width: 42px; height: 42px; border-radius: 12px; background: var(--paper-2); display: grid; place-items: center; flex: 0 0 auto; color: var(--ink-soft); }
.emoji svg { width: 22px; height: 22px; }
.meta { flex: 1; min-width: 0; }
.nm-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.meta .nm { font-weight: 700; font-size: 14.5px; color: var(--ink); }
.tag-prov { font-size: 9.5px; font-weight: 800; background: var(--sky-soft); color: var(--sky); padding: 1px 6px; border-radius: 6px; text-transform: uppercase; }
.meta .pr { font-size: 12px; color: var(--muted); font-weight: 500; margin-top: 2px; }
.meta .pr b { color: var(--ink-soft); }

.stepper { display: flex; align-items: center; background: var(--paper); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; flex: 0 0 auto; }
.stepper button { width: 32px; height: 34px; border: none; background: transparent; font-size: 19px; color: var(--sky); cursor: pointer; font-weight: 600; }
.stepper button:disabled { color: #C7CFC9; }
.stepper .q { width: 50px; height: 34px; min-width: 50px; text-align: center; border: none; background: transparent; outline: none; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; color: var(--ink); -moz-appearance: textfield; }
.stepper .q::-webkit-outer-spin-button, .stepper .q::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

.uni { display: flex; gap: 6px; margin-top: 10px; }
.uni button { flex: 1; border: 1px solid var(--line); background: var(--paper); color: var(--muted); border-radius: 9px; padding: 7px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 11.5px; cursor: pointer; }
.uni button.on { background: var(--sky); color: #fff; border-color: var(--sky); }

.costo { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 11px; padding-top: 11px; border-top: 1px solid var(--line); }
.costo-lbl span { font-size: 12px; color: var(--muted); font-weight: 600; display: block; }
.costo-lbl small { font-size: 11px; color: var(--sky); font-weight: 700; }
.cinp { display: flex; align-items: center; gap: 4px; background: var(--paper); border: 1px solid var(--line); border-radius: 10px; padding: 6px 11px; }
.cinp span { color: var(--ink-soft); font-weight: 700; }
.cinp input { width: 95px; border: none; background: transparent; outline: none; text-align: right; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; color: var(--ink); }

/* CPP Preview */
.cpp-preview { margin-top: 9px; padding-top: 9px; border-top: 1px dashed var(--line); font-size: 11.5px; color: var(--muted); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.cpp-tag { font-weight: 600; }
.cpp-preview b { color: var(--ink); }
.sep { color: var(--muted); }
.cpp-val b { color: var(--pine); }

.scanmsg { position: fixed; left: 50%; transform: translateX(-50%); bottom: 30px; z-index: 4500; background: var(--ink); color: #fff; border-radius: 12px; padding: 10px 16px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; box-shadow: 0 12px 24px -10px rgba(0,0,0,.5); }
.fadem-enter-active, .fadem-leave-active { transition: opacity .2s; } .fadem-enter-from, .fadem-leave-to { opacity: 0; }
@media (max-width: 860px) { .form { grid-template-columns: 1fr; } .totcard { position: static; } }
</style>
