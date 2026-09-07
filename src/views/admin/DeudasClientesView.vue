<template>
  <div>
    <p v-if="cargando" class="muted">Cargando cartera y deudas…</p>
    <p v-else-if="error" class="err">{{ error }}</p>

    <template v-else>
      <!-- Resumen de cartera deudora -->
      <div class="resumen">
        <div class="rz-col">
          <div class="rz-k">Total por cobrar a clientes</div>
          <div class="rz-v">{{ money(totalDeuda) }}<span class="mxn">MXN</span></div>
        </div>
        <div class="rz-stats">
          <div class="stat">
            <span class="sk">Clientes con adeudo</span>
            <span class="sv">{{ conDeuda.length }}</span>
          </div>
          <div class="stat">
            <span class="sk">Total abonado histórico</span>
            <span class="sv">{{ money(totalAbonadoHistorico) }}</span>
          </div>
        </div>
      </div>

      <!-- Barra de búsqueda -->
      <div class="search-bar">
        <div class="search-wrap">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
          <input v-model="buscar" placeholder="Buscar cliente deudor por nombre…">
        </div>
      </div>

      <p v-if="!conDeudaFiltrada.length && !sinDeudaFiltrada.length" class="muted">
        {{ buscar ? 'No hay deudores que coincidan con la búsqueda.' : 'Ningún cliente tiene saldo pendiente.' }}
      </p>

      <!-- Grilla de clientes deudores -->
      <div class="grid" v-if="conDeudaFiltrada.length">
        <div v-for="d in conDeudaFiltrada" :key="d.clienteId" class="card">
          <div class="c-top">
            <div class="av">{{ ini(d.clienteNombre) }}</div>
            <div class="info">
              <div class="nm">{{ d.clienteNombre }}</div>
              <div class="meta">Cargado {{ money(d.totalCargado) }} · Abonado {{ money(d.totalAbonado) }}</div>
            </div>
            <div class="saldo">{{ money(d.saldo) }}</div>
          </div>

          <div class="card-acts">
            <button class="btn-kardex" @click="abrirKardex(d)" title="Ver Kardex y desglose de pedidos">
              <ion-icon :icon="readerOutline" /> Kardex / Estado de cuenta
            </button>
            <button class="btn-abonar" @click="abrirAbono(d)" title="Registrar abono de pago">
              <ion-icon :icon="cashOutline" /> Abonar
            </button>
          </div>
        </div>
      </div>

      <!-- Clientes al corriente (sin saldo deudor) -->
      <div v-if="sinDeudaFiltrada.length" class="limpios">
        <div class="lm-t">Clientes al corriente (historial de crédito liquidado)</div>
        <div class="lm-list">
          <div v-for="d in sinDeudaFiltrada" :key="d.clienteId" class="lm-item" @click="abrirKardex(d)">
            <span class="lm-nm">{{ d.clienteNombre }}</span>
            <span class="lm-tag">Liquidado ({{ money(d.totalAbonado) }})</span>
          </div>
        </div>
      </div>

      <!-- Guía interactiva -->
      <div class="guia-card">
        <div class="guia-header" @click="mostrarGuia = !mostrarGuia">
          <div class="guia-icon">💡</div>
          <div class="guia-tit">¿Cómo opera el Kardex y la Deuda de Clientes?</div>
          <div class="guia-badge">{{ mostrarGuia ? 'Ocultar guía' : 'Ver guía' }}</div>
        </div>
        <div v-if="mostrarGuia" class="guia-content">
          <div class="guia-item">
            <div class="gi-num">1</div>
            <div class="gi-text">
              <b>Cálculo del saldo exacto:</b> El saldo deudor es el resultado estricto de <code>Total Cargado en Compras a Crédito − Total Abonado por el Cliente</code>.
            </div>
          </div>
          <div class="guia-item">
            <div class="gi-num">2</div>
            <div class="gi-text">
              <b>Sincronización automática FIFO:</b> Al capturar un abono general, el sistema liquida las cuentas por cobrar pendientes más antiguas en orden de antigüedad, manteniendo al día el módulo de Créditos.
            </div>
          </div>
          <div class="guia-item">
            <div class="gi-num">3</div>
            <div class="gi-text">
              <b>Estado de Cuenta transparente:</b> Haz clic en "Kardex / Estado de cuenta" para ver cada pedido con sus productos y fechas, y compárteselo al cliente por WhatsApp con un solo clic.
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Modal de Kardex / Estado de Cuenta -->
    <div v-if="modalKardex" class="modal-bg" @click.self="cerrarKardex()">
      <div class="modal modal-lg">
        <div class="m-head">
          <div>
            <div class="m-title">Estado de Cuenta / Kardex</div>
            <div class="m-sub">{{ kardexData?.clienteNombre || modalKardex.clienteNombre }} · {{ kardexData?.clienteTelefono || 'Sin teléfono' }}</div>
          </div>
          <button class="m-x" @click="cerrarKardex()"><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>

        <div class="m-body" v-if="cargandoKardex">
          <p class="muted2">Cargando movimientos contables de este cliente…</p>
        </div>
        <div class="m-body" v-else-if="kardexData">
          <!-- Balance banner -->
          <div class="kardex-banner">
            <div class="kb-col">
              <span class="kbl">Total a crédito</span>
              <span class="kbv">{{ money(kardexData.totalCargado) }}</span>
            </div>
            <div class="kb-col">
              <span class="kbl">Total abonado</span>
              <span class="kbv verde">{{ money(kardexData.totalAbonado) }}</span>
            </div>
            <div class="kb-col">
              <span class="kbl">Saldo deudor</span>
              <span class="kbv rojo">{{ money(kardexData.saldoActual) }}</span>
            </div>
          </div>

          <!-- Tabs de Kardex -->
          <div class="kardex-tabs">
            <button :class="{ on: kardexTab === 'compras' }" @click="kardexTab = 'compras'">
              Compras a crédito ({{ kardexData.compras?.length || 0 }})
            </button>
            <button :class="{ on: kardexTab === 'abonos' }" @click="kardexTab = 'abonos'">
              Historial de abonos ({{ kardexData.abonos?.length || 0 }})
            </button>
          </div>

          <!-- Tab Compras -->
          <div v-if="kardexTab === 'compras'" class="kardex-tab-content">
            <p v-if="!kardexData.compras?.length" class="muted2">No hay compras a crédito registradas.</p>
            <div v-for="c in kardexData.compras" :key="c.cuentaPorCobrarId" class="compra-item">
              <div class="ci-head" @click="toggleCompra(c.cuentaPorCobrarId)">
                <div>
                  <div class="ci-tit">
                    <b>Pedido #{{ c.pedidoId }}</b> · {{ fecha(c.fecha) }}
                    <span class="tag-est" :class="c.estado.toLowerCase()">{{ c.estado }}</span>
                  </div>
                  <div class="ci-sub">
                    Límite: {{ fecha(c.fechaLimite) }} <span v-if="c.pagadaEn">· Pagada: {{ fecha(c.pagadaEn) }}</span>
                  </div>
                </div>
                <div class="ci-tot">
                  {{ money(c.monto) }}
                  <ion-icon :icon="compraAbierta === c.cuentaPorCobrarId ? chevronUp : chevronDown" />
                </div>
              </div>

              <!-- Desglose de productos de la compra -->
              <div v-if="compraAbierta === c.cuentaPorCobrarId" class="ci-det">
                <div v-for="(l, idx) in c.lineas" :key="idx" class="ci-linea">
                  <span class="cl-n">{{ l.productoNombre }}</span>
                  <span class="cl-q">{{ l.cantidad }} {{ l.esCaja ? 'caja(s)' : 'pza(s)' }} × {{ money(l.precioUnitario) }}</span>
                  <span class="cl-s">{{ money(l.subtotal) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab Abonos -->
          <div v-if="kardexTab === 'abonos'" class="kardex-tab-content">
            <p v-if="!kardexData.abonos?.length" class="muted2">Aún no se han registrado abonos para este cliente.</p>
            <div v-for="a in kardexData.abonos" :key="a.abonoId" class="abono-item">
              <div class="ai-left">
                <div class="ai-m">{{ money(a.monto) }}</div>
                <div class="ai-n">{{ a.nota || 'Abono general a cuenta' }}</div>
              </div>
              <div class="ai-date">{{ fechaHora(a.fecha) }}</div>
            </div>
          </div>
        </div>

        <div class="m-foot">
          <button v-if="kardexData" class="m-wa" @click="compartirKardexWhatsApp()">
            <ion-icon :icon="logoWhatsapp" /> Compartir estado de cuenta por WhatsApp
          </button>
          <button class="m-cancel" @click="cerrarKardex()">Cerrar</button>
        </div>
      </div>
    </div>

    <!-- Modal de registrar abono -->
    <div v-if="modalAbono" class="modal-bg" @click.self="cerrarAbono()">
      <div class="modal">
        <div class="m-head">
          <div>
            <div class="m-title">Registrar abono a cuenta</div>
            <div class="m-sub">{{ modalAbono.clienteNombre }}</div>
          </div>
          <button class="m-x" @click="cerrarAbono()"><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div class="m-body">
          <div class="falta">
            <span class="fl">Saldo deudor actual</span>
            <span class="fv">{{ money(modalAbono.saldo) }}</span>
          </div>
          <div class="campo">
            <div class="fl2">Monto que abona el cliente</div>
            <div class="mwrap">
              <span class="pfx">$</span>
              <input class="inp mono" type="number" step="0.01" v-model.number="montoAbono">
            </div>
            <div class="quick-abonos">
              <button @click="montoAbono = modalAbono.saldo">Liquidar total ({{ money(modalAbono.saldo) }})</button>
              <button v-if="modalAbono.saldo > 100" @click="montoAbono = Math.round(modalAbono.saldo / 2)">50% ({{ money(modalAbono.saldo / 2) }})</button>
            </div>
          </div>
          <div class="campo">
            <div class="fl2">Nota o concepto del abono (opcional)</div>
            <input class="inp" v-model="notaAbono" placeholder="Ej. Pago en efectivo recibido en bodega">
          </div>
          <p v-if="modalError" class="m-err">{{ modalError }}</p>
        </div>
        <div class="m-foot">
          <button class="m-cancel" @click="cerrarAbono()">Cancelar</button>
          <button class="m-ok" :disabled="procesando || !puedeGuardarAbono" @click="guardarAbono()">
            {{ procesando ? 'Guardando…' : 'Registrar abono' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { IonIcon } from '@ionic/vue'
import {
  readerOutline,
  cashOutline,
  chevronDown,
  chevronUp,
  logoWhatsapp
} from 'ionicons/icons'
import http from '@/api/http'

const emit = defineEmits(['ctx'])
const deudas = ref([])
const cargando = ref(true)
const error = ref('')
const buscar = ref('')
const mostrarGuia = ref(false)

// Modales
const modalAbono = ref(null)
const montoAbono = ref(null)
const notaAbono = ref('')
const modalError = ref('')
const procesando = ref(false)

const modalKardex = ref(null)
const kardexData = ref(null)
const cargandoKardex = ref(false)
const kardexTab = ref('compras') // 'compras' | 'abonos'
const compraAbierta = ref(null)

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fecha = (f) => new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
const fechaHora = (f) => new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const ini = (n) => (n || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

const conDeuda = computed(() => deudas.value.filter((d) => d.saldo > 0))
const sinDeuda = computed(() => deudas.value.filter((d) => d.saldo <= 0))
const totalDeuda = computed(() => conDeuda.value.reduce((s, d) => s + d.saldo, 0))
const totalAbonadoHistorico = computed(() => deudas.value.reduce((s, d) => s + (d.totalAbonado || 0), 0))

const conDeudaFiltrada = computed(() => {
  const q = buscar.value.trim().toLowerCase()
  if (!q) return conDeuda.value
  return conDeuda.value.filter(d => (d.clienteNombre || '').toLowerCase().includes(q))
})

const sinDeudaFiltrada = computed(() => {
  const q = buscar.value.trim().toLowerCase()
  if (!q) return sinDeuda.value
  return sinDeuda.value.filter(d => (d.clienteNombre || '').toLowerCase().includes(q))
})

const puedeGuardarAbono = computed(() => Number(montoAbono.value) > 0 && Number(montoAbono.value) <= (modalAbono.value?.saldo ?? 0) + 0.01)

async function cargar() {
  cargando.value = true; error.value = ''
  try {
    const { data } = await http.get('/creditos/deudas-clientes')
    deudas.value = data || []
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudieron cargar las deudas.'
  } finally { cargando.value = false }
}

function abrirAbono(d) {
  modalAbono.value = d
  montoAbono.value = d.saldo
  notaAbono.value = ''
  modalError.value = ''
}
function cerrarAbono() { modalAbono.value = null }

async function guardarAbono() {
  procesando.value = true; modalError.value = ''
  try {
    await http.post('/creditos/abonos-cliente', {
      clienteId: modalAbono.value.clienteId,
      monto: Number(montoAbono.value),
      nota: notaAbono.value.trim() || null
    })
    cerrarAbono()
    await cargar()
  } catch (e) {
    modalError.value = e.response?.data?.mensaje || 'No se pudo registrar el abono.'
  } finally { procesando.value = false }
}

async function abrirKardex(d) {
  modalKardex.value = d
  kardexData.value = null
  cargandoKardex.value = true
  kardexTab.value = 'compras'
  compraAbierta.value = null
  try {
    const { data } = await http.get(`/creditos/kardex-cliente/${d.clienteId}`)
    kardexData.value = data
  } catch (e) {
    alert(e.response?.data?.mensaje || 'No se pudo obtener el Kardex del cliente.')
    cerrarKardex()
  } finally {
    cargandoKardex.value = false
  }
}

function cerrarKardex() {
  modalKardex.value = null
  kardexData.value = null
}

function toggleCompra(id) {
  compraAbierta.value = compraAbierta.value === id ? null : id
}

function compartirKardexWhatsApp() {
  if (!kardexData.value) return
  const kd = kardexData.value
  const tel = (kd.clienteTelefono || '').replace(/\D/g, '')
  const num = tel.length === 10 ? '52' + tel : tel

  let msg = `*ESTADO DE CUENTA - DISTRIBUIDORA*\n`
  msg += `Cliente: ${kd.clienteNombre}\n`
  msg += `Fecha: ${new Date().toLocaleDateString('es-MX')}\n\n`
  msg += `• Total comprado a crédito: ${money(kd.totalCargado)}\n`
  msg += `• Total abonado: ${money(kd.totalAbonado)}\n`
  msg += `*• SALDO PENDIENTE ACTUAL: ${money(kd.saldoActual)}*\n\n`

  if (kd.compras?.length) {
    msg += `*Compras a crédito pendientes / recientes:*\n`
    kd.compras.slice(0, 5).forEach(c => {
      msg += `▪ Pedido #${c.pedidoId} (${fecha(c.fecha)}): ${money(c.monto)} [${c.estado}]\n`
    })
    msg += `\n`
  }

  if (kd.abonos?.length) {
    msg += `*Últimos abonos registrados:*\n`
    kd.abonos.slice(0, 4).forEach(a => {
      msg += `✔ ${fecha(a.fecha)}: ${money(a.monto)} - ${a.nota || 'Abono general'}\n`
    })
    msg += `\n`
  }

  msg += `Agradecemos su preferencia y quedamos a sus órdenes.`

  const url = `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
  window.open(url, '_blank')
}

onMounted(() => {
  emit('ctx', { titulo: 'Deudas de clientes', sub: 'Cartera de crédito, abonos y estados de cuenta', back: null })
  cargar()
})
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; }
.muted2 { color: var(--muted); font-size: 13px; padding: 8px 4px; }
.err { color: var(--clay); font-weight: 600; margin-top: 24px; }

/* Resumen */
.resumen { background: linear-gradient(155deg,var(--clay),#9A4730); border-radius: 20px; padding: 20px; color: #fff; margin-bottom: 16px; box-shadow: 0 18px 36px -20px rgba(192,87,59,.9); display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
.rz-k { font-size: 13px; color: #F0D5CB; font-weight: 600; }
.rz-v { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 34px; letter-spacing: -.02em; margin-top: 4px; font-variant-numeric: tabular-nums; }
.rz-v .mxn { font-size: 14px; color: #F0D5CB; font-weight: 600; margin-left: 7px; }
.rz-stats { display: flex; gap: 18px; }
.stat { display: flex; flex-direction: column; }
.sk { font-size: 11px; color: #F0D5CB; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
.sv { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; margin-top: 2px; }

/* Barra de búsqueda */
.search-bar { margin-bottom: 16px; }
.search-wrap { display: flex; align-items: center; gap: 8px; background: var(--surface); border: 1px solid var(--line); border-radius: 13px; padding: 9px 13px; max-width: 420px; box-shadow: var(--shadow); }
.search-wrap svg { width: 17px; height: 17px; stroke: var(--muted); fill: none; stroke-width: 2; flex: 0 0 auto; }
.search-wrap input { border: none; background: transparent; outline: none; font-size: 14px; font-weight: 500; color: var(--ink); width: 100%; }

/* Grid de clientes */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 13px; }
.card { background: var(--surface); border: 1px solid var(--clay-soft); border-radius: 18px; padding: 15px; box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 12px; }
.c-top { display: flex; align-items: center; gap: 12px; }
.av { width: 42px; height: 42px; border-radius: 12px; background: var(--clay-soft); display: grid; place-items: center; color: var(--clay); font-weight: 700; font-size: 14px; flex: 0 0 auto; font-family: "Bricolage Grotesque"; }
.info { flex: 1; min-width: 0; }
.nm { font-weight: 700; font-size: 15px; }
.meta { font-size: 11.5px; color: var(--muted); margin-top: 2px; }
.saldo { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 19px; color: var(--clay); font-variant-numeric: tabular-nums; flex: 0 0 auto; }

.card-acts { display: flex; gap: 8px; }
.btn-kardex, .btn-abonar { display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: 11px; padding: 10px 12px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12.5px; cursor: pointer; transition: .15s; }
.btn-kardex { flex: 1.3; background: var(--paper); border: 1px solid var(--line); color: var(--ink-soft); }
.btn-kardex ion-icon { font-size: 16px; color: var(--sky); }
.btn-abonar { flex: 1; background: var(--pine); border: none; color: #fff; }
.btn-abonar ion-icon { font-size: 16px; }

/* Clientes limpios */
.limpios { margin-top: 26px; }
.lm-t { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; }
.lm-list { display: flex; gap: 8px; flex-wrap: wrap; }
.lm-item { background: var(--pine-tint); border: 1px solid #BFD8CD; border-radius: 999px; padding: 6px 14px; font-size: 12.5px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; }
.lm-nm { color: var(--pine-deep); }
.lm-tag { font-size: 11px; color: var(--pine); font-weight: 700; }

/* Modales */
.modal-bg { position: fixed; inset: 0; background: rgba(21,42,36,.45); backdrop-filter: blur(3px); display: grid; place-items: center; z-index: 3000; padding: 20px; }
.modal { background: var(--surface); border-radius: 22px; width: 100%; max-width: 440px; box-shadow: 0 30px 60px -20px rgba(0,0,0,.5); overflow: hidden; max-height: 90vh; display: flex; flex-direction: column; }
.modal.modal-lg { max-width: 580px; }
.m-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 18px 20px 14px; border-bottom: 1px solid var(--line); flex: 0 0 auto; }
.m-title { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 19px; }
.m-sub { font-size: 13px; color: var(--muted); font-weight: 600; margin-top: 2px; }
.m-x { width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--line); background: var(--paper); display: grid; place-items: center; cursor: pointer; flex: 0 0 auto; }
.m-x svg { width: 16px; height: 16px; stroke: var(--muted); fill: none; stroke-width: 2.4; stroke-linecap: round; }
.m-body { padding: 16px 20px; overflow-y: auto; flex: 1; }

.falta { display: flex; align-items: center; justify-content: space-between; background: var(--clay-soft); border: 1px solid #EAC9BC; border-radius: 14px; padding: 14px; margin-bottom: 16px; }
.falta .fl { font-size: 12.5px; font-weight: 700; color: #8A3D28; }
.falta .fv { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 22px; color: var(--clay); font-variant-numeric: tabular-nums; }
.campo { margin-bottom: 14px; }
.fl2 { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 9px; }
.inp { width: 100%; border: 1.5px solid var(--line); background: var(--paper); border-radius: 12px; padding: 12px 14px; font-family: "Hanken Grotesk"; font-size: 14.5px; font-weight: 600; color: var(--ink); }
.inp:focus { outline: none; border-color: var(--pine); }
.mwrap { display: flex; align-items: center; background: var(--paper); border: 1.5px solid var(--line); border-radius: 12px; padding: 0 14px; }
.mwrap:focus-within { border-color: var(--pine); }
.mwrap .pfx { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; color: var(--ink-soft); }
.inp.mono { border: none; background: transparent; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 18px; font-variant-numeric: tabular-nums; padding-left: 6px; }
.quick-abonos { display: flex; gap: 6px; margin-top: 8px; }
.quick-abonos button { background: var(--paper-2); border: 1px solid var(--line); color: var(--ink-soft); font-size: 11px; font-weight: 700; border-radius: 8px; padding: 5px 9px; cursor: pointer; }
.m-err { color: var(--clay); font-size: 13px; font-weight: 600; margin-top: 10px; }
.m-foot { display: flex; gap: 10px; padding: 12px 20px 18px; border-top: 1px solid var(--line); flex: 0 0 auto; flex-wrap: wrap; }
.m-cancel { flex: 1; border: 1px solid var(--line); background: var(--surface); color: var(--ink-soft); border-radius: 13px; padding: 12px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; cursor: pointer; }
.m-ok { flex: 1.6; border: none; background: var(--pine); color: #fff; border-radius: 13px; padding: 12px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; cursor: pointer; }
.m-ok:disabled { opacity: .5; }
.m-wa { flex: 2; display: flex; align-items: center; justify-content: center; gap: 6px; border: none; background: #128C7E; color: #fff; border-radius: 13px; padding: 12px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13px; cursor: pointer; }
.m-wa ion-icon { font-size: 17px; }

/* Kardex styles */
.kardex-banner { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 12px; margin-bottom: 14px; }
.kb-col { display: flex; flex-direction: column; }
.kbl { font-size: 10.5px; font-weight: 700; color: var(--muted); text-transform: uppercase; }
.kbv { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 16px; margin-top: 2px; font-variant-numeric: tabular-nums; }
.kbv.verde { color: var(--pine); }
.kbv.rojo { color: var(--clay); }

.kardex-tabs { display: flex; gap: 6px; margin-bottom: 12px; border-bottom: 1px solid var(--line); padding-bottom: 8px; }
.kardex-tabs button { border: none; background: transparent; color: var(--muted); font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13px; padding: 6px 12px; border-radius: 8px; cursor: pointer; }
.kardex-tabs button.on { background: var(--pine-tint); color: var(--pine); }

.compra-item { background: var(--paper); border: 1px solid var(--line); border-radius: 12px; margin-bottom: 8px; overflow: hidden; }
.ci-head { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; cursor: pointer; }
.ci-tit { font-size: 13px; }
.ci-sub { font-size: 11px; color: var(--muted); margin-top: 2px; }
.tag-est { font-size: 9.5px; font-weight: 700; text-transform: uppercase; padding: 1px 6px; border-radius: 4px; margin-left: 6px; }
.tag-est.pendiente { background: var(--amber-soft); color: #B9781F; }
.tag-est.vencida { background: var(--clay-soft); color: var(--clay); }
.tag-est.pagada { background: var(--pine-tint); color: var(--pine); }
.ci-tot { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14.5px; font-variant-numeric: tabular-nums; display: flex; align-items: center; gap: 6px; }
.ci-det { border-top: 1px solid var(--line); background: var(--surface); padding: 8px 12px; display: flex; flex-direction: column; gap: 5px; }
.ci-linea { display: flex; justify-content: space-between; font-size: 11.5px; color: var(--ink-soft); }
.cl-n { font-weight: 600; flex: 1; min-width: 0; }
.cl-q { color: var(--muted); margin: 0 8px; }
.cl-s { font-weight: 700; font-variant-numeric: tabular-nums; }

.abono-item { display: flex; justify-content: space-between; align-items: center; background: var(--paper); border: 1px solid var(--line); border-radius: 11px; padding: 10px 12px; margin-bottom: 6px; }
.ai-m { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; color: var(--pine); font-variant-numeric: tabular-nums; }
.ai-n { font-size: 11.5px; color: var(--muted); margin-top: 2px; }
.ai-date { font-size: 11px; color: var(--muted); font-weight: 600; }

/* Guía interactiva */
.guia-card { margin-top: 26px; background: var(--surface); border: 1px solid var(--line); border-radius: 18px; overflow: hidden; box-shadow: var(--shadow); }
.guia-header { display: flex; align-items: center; gap: 10px; padding: 14px 18px; cursor: pointer; user-select: none; background: var(--paper); }
.guia-icon { font-size: 19px; }
.guia-tit { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; color: var(--ink); flex: 1; }
.guia-badge { font-size: 11.5px; font-weight: 700; color: var(--pine); background: var(--pine-tint); padding: 4px 10px; border-radius: 999px; }
.guia-content { padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; border-top: 1px solid var(--line); }
.guia-item { display: flex; gap: 12px; align-items: flex-start; }
.gi-num { width: 22px; height: 22px; border-radius: 50%; background: var(--pine-tint); color: var(--pine); display: grid; place-items: center; font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 11.5px; flex: 0 0 auto; margin-top: 2px; }
.gi-text { font-size: 12.5px; color: var(--ink-soft); line-height: 1.45; }
.gi-text b { color: var(--ink); font-weight: 700; }
.gi-text code { font-family: monospace; background: var(--paper-2); padding: 2px 5px; border-radius: 4px; font-size: 11.5px; }
</style>
