<template>
  <ion-page>
    <ion-content :fullscreen="true" class="cb-content">
      <ion-refresher slot="fixed" @ionRefresh="recargar($event)"><ion-refresher-content /></ion-refresher>

      <div class="scroll">
        <!-- HEADER -->
        <div class="head">
          <div class="brand">
            <div class="logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
            </div>
            <div class="title-wrap">
              <div class="s">Cobranza en ruta</div>
              <div class="h">Deudas y Abonos</div>
            </div>
          </div>
          <div class="badge-total" v-if="!cargando">
            <span class="bt-lbl">Por cobrar</span>
            <span class="bt-val">{{ money(totalSaldoMostrado) }}</span>
          </div>
        </div>

        <!-- SEGMENTO DE FILTRO -->
        <div class="seg-wrap">
          <button class="seg-btn" :class="{ on: filtroRuta === 'ruta' }" @click="filtroRuta = 'ruta'">
            En mi ruta hoy ({{ deudoresRuta.length }})
          </button>
          <button class="seg-btn" :class="{ on: filtroRuta === 'todos' }" @click="filtroRuta = 'todos'">
            Todos los clientes ({{ deudoresTodos.length }})
          </button>
        </div>

        <!-- BUSCADOR -->
        <div class="search-wrap">
          <svg class="s-ic" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
          <input v-model="buscar" placeholder="Buscar cliente por nombre o teléfono…" />
          <button v-if="buscar" class="clear-b" @click="buscar = ''">✕</button>
        </div>

        <!-- LISTADO -->
        <div v-if="cargando" class="loading-state">
          <div class="spinner"></div>
          <p>Cargando cartera de clientes…</p>
        </div>

        <div v-else-if="error" class="error-box">
          <p>{{ error }}</p>
          <button @click="cargar()">Reintentar</button>
        </div>

        <div v-else-if="!listaFiltrada.length" class="empty-state">
          <div class="empty-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="empty-t">
            {{ filtroRuta === 'ruta' ? 'Ningún cliente de tu ruta tiene saldo pendiente' : 'No se encontraron clientes deudores' }}
          </div>
          <div class="empty-s">
            {{ filtroRuta === 'ruta' ? 'Todos los clientes con pedidos en tu ruta de hoy están al corriente.' : 'Revisa el término de búsqueda.' }}
          </div>
          <button v-if="filtroRuta === 'ruta' && deudoresTodos.length > 0" class="btn-sec" @click="filtroRuta = 'todos'">
            Ver todos los clientes con saldo
          </button>
        </div>

        <div v-else class="client-grid">
          <div v-for="d in listaFiltrada" :key="d.clienteId" class="client-card" :class="{ enRuta: estaEnRuta(d.clienteId) }">
            <div class="cc-top">
              <div class="cc-avatar">{{ ini(d.clienteNombre) }}</div>
              <div class="cc-info">
                <div class="cc-name-row">
                  <span class="cc-name">{{ d.clienteNombre }}</span>
                  <span v-if="estaEnRuta(d.clienteId)" class="tag-ruta">En ruta hoy</span>
                </div>
                <div class="cc-meta">
                  Cargado {{ money(d.totalCargado) }} · Abonado {{ money(d.totalAbonado) }}
                </div>
              </div>
              <div class="cc-saldo-wrap">
                <div class="cc-saldo-lbl">Saldo deudor</div>
                <div class="cc-saldo-val">{{ money(d.saldo) }}</div>
              </div>
            </div>

            <!-- Botones directos de teléfono -->
            <div class="cc-contact" v-if="d.telefono || d.clienteTelefono">
              <a :href="'tel:' + (d.telefono || d.clienteTelefono)" class="contact-btn tel" title="Llamar al cliente">
                <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                <span>Llamar</span>
              </a>
              <button type="button" class="contact-btn wa" @click="enviarWhatsappRapido(d)" title="Enviar WhatsApp">
                <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                <span>WhatsApp</span>
              </button>
            </div>

            <!-- Acciones de cobro -->
            <div class="cc-acts">
              <button class="btn-kardex" @click="abrirKardex(d)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                <span>Estado de cuenta</span>
              </button>
              <button class="btn-abonar" @click="abrirAbono(d)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>
                <span>Cobrar abono</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL DE CAPTURA DE ABONO -->
      <div v-if="modalAbono" class="modal-backdrop" @click.self="cerrarAbono()">
        <div class="modal-sheet">
          <div class="ms-handle"></div>
          <div class="ms-head">
            <div>
              <div class="ms-title">Cobrar abono</div>
              <div class="ms-sub">{{ modalAbono.clienteNombre }}</div>
            </div>
            <button class="ms-close" @click="cerrarAbono()">✕</button>
          </div>

          <div class="ms-body">
            <!-- Saldo actual badge -->
            <div class="saldo-card">
              <span class="sc-l">Saldo pendiente actual</span>
              <span class="sc-v">{{ money(modalAbono.saldo) }}</span>
            </div>

            <!-- Atajos de monto -->
            <div class="presets-row">
              <button type="button" class="preset-btn" @click="montoAbono = modalAbono.saldo">
                Total ({{ money(modalAbono.saldo) }})
              </button>
              <button type="button" class="preset-btn" v-if="modalAbono.saldo > 50" @click="montoAbono = Math.round(modalAbono.saldo / 2)">
                50% ({{ money(Math.round(modalAbono.saldo / 2)) }})
              </button>
              <button type="button" class="preset-btn" v-if="modalAbono.saldo >= 500" @click="montoAbono = 500">
                $500
              </button>
              <button type="button" class="preset-btn" v-if="modalAbono.saldo >= 200" @click="montoAbono = 200">
                $200
              </button>
            </div>

            <!-- Campo Monto -->
            <div class="input-field">
              <label>Monto a abonar (MXN)</label>
              <div class="money-input-wrap">
                <span class="sym">$</span>
                <input type="number" step="any" min="1" :max="modalAbono.saldo" v-model.number="montoAbono" placeholder="0.00" />
              </div>
            </div>

            <!-- Selector de Método de Pago -->
            <div class="input-field">
              <label>Método de cobro</label>
              <div class="pay-method-grid">
                <button type="button" class="pm-btn" :class="{ on: metodoAbono === 0 }" @click="metodoAbono = 0">
                  <svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>
                  <span>Efectivo</span>
                </button>
                <button type="button" class="pm-btn" :class="{ on: metodoAbono === 1 }" @click="metodoAbono = 1">
                  <svg viewBox="0 0 24 24"><path d="M4 9h16M4 15h16M8 5l-4 4 4 4M16 11l4 4-4 4"/></svg>
                  <span>Transferencia</span>
                </button>
              </div>
              <div class="pm-tip" v-if="metodoAbono === 0">
                ⚠️ El efectivo cobrado se sumará a tu entrega de caja en el Corte del turno.
              </div>
              <div class="pm-tip" v-else>
                ℹ️ Transferencia directa a cuenta. No se exige efectivo físico en tu corte.
              </div>
            </div>

            <!-- Nota o referencia -->
            <div class="input-field">
              <label>Nota o referencia (opcional)</label>
              <input type="text" v-model="notaAbono" :placeholder="metodoAbono === 1 ? 'Folio de rastreo / Banco' : 'Ej. Pago en tienda'" />
            </div>

            <p v-if="modalError" class="field-error">{{ modalError }}</p>
          </div>

          <div class="ms-foot">
            <button class="btn-cancel" @click="cerrarAbono()">Cancelar</button>
            <button class="btn-submit" :disabled="procesando || !puedeGuardarAbono" @click="guardarAbono()">
              {{ procesando ? 'Guardando…' : `Cobrar ${money(montoAbono || 0)}` }}
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL DE ÉXITO DE ABONO (RECIBO Y COMPROBANTES) -->
      <div v-if="abonoExito" class="modal-backdrop" @click.self="abonoExito = null">
        <div class="modal-sheet exito-sheet">
          <div class="exito-icon">✓</div>
          <div class="exito-title">¡Abono registrado!</div>
          <div class="exito-sub">{{ abonoExito.clienteNombre }}</div>

          <div class="receipt-card">
            <div class="rc-row">
              <span class="rc-k">Folio abono</span>
              <span class="rc-v">#{{ abonoExito.id }}</span>
            </div>
            <div class="rc-row">
              <span class="rc-k">Monto abonado</span>
              <span class="rc-v bold">{{ money(abonoExito.monto) }}</span>
            </div>
            <div class="rc-row">
              <span class="rc-k">Método</span>
              <span class="rc-v">{{ abonoExito.metodoPagoTexto || 'Efectivo' }}</span>
            </div>
            <div class="rc-row">
              <span class="rc-k">Nuevo saldo cliente</span>
              <span class="rc-v green">{{ money(abonoExito.saldoRestante) }}</span>
            </div>
          </div>

          <div class="exito-acts">
            <button class="btn-ticket" :disabled="imprimiendoTicket" @click="imprimirTicketAbonoActual()">
              <svg class="btn-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
              </svg>
              <span>{{ imprimiendoTicket ? 'Imprimiendo…' : 'Imprimir ticket Bluetooth' }}</span>
            </button>
            <button class="btn-wa" @click="compartirWhatsappAbono()">
              <svg class="btn-ic" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
              <span>Enviar comprobante por WhatsApp</span>
            </button>
          </div>
          <p v-if="ticketMsg" class="ticket-status" :class="{ ok: ticketMsg.includes('correctamente') }">{{ ticketMsg }}</p>

          <button class="btn-close-exito" @click="abonoExito = null">Continuar en ruta</button>
        </div>
      </div>

      <!-- MODAL DE KARDEX / ESTADO DE CUENTA -->
      <div v-if="modalKardex" class="modal-backdrop" @click.self="cerrarKardex()">
        <div class="modal-sheet kardex-sheet">
          <div class="ms-handle"></div>
          <div class="ms-head">
            <div>
              <div class="ms-title">Estado de cuenta</div>
              <div class="ms-sub">{{ kardexData?.clienteNombre || modalKardex.clienteNombre }}</div>
            </div>
            <button class="ms-close" @click="cerrarKardex()">✕</button>
          </div>

          <div class="ms-body" v-if="cargandoKardex">
            <div class="loading-state"><div class="spinner"></div><p>Cargando movimientos…</p></div>
          </div>

          <div class="ms-body" v-else-if="kardexData">
            <!-- Balance banner -->
            <div class="kardex-summary">
              <div class="ks-col">
                <span class="ks-l">Total crédito</span>
                <span class="ks-v">{{ money(kardexData.totalCargado) }}</span>
              </div>
              <div class="ks-col">
                <span class="ks-l">Total abonado</span>
                <span class="ks-v">{{ money(kardexData.totalAbonado) }}</span>
              </div>
              <div class="ks-col primary">
                <span class="ks-l">Saldo actual</span>
                <span class="ks-v bold">{{ money(kardexData.saldo) }}</span>
              </div>
            </div>

            <!-- Botón WhatsApp del Estado de Cuenta -->
            <button class="wa-statement-btn" @click="enviarEstadoCuentaWhatsapp()">
              <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
              <span>Enviar estado de cuenta por WhatsApp</span>
            </button>

            <!-- Pestañas internas: Compras vs Abonos -->
            <div class="ktabs">
              <button :class="{ on: ktab === 'compras' }" @click="ktab = 'compras'">
                Compras y adeudos ({{ kardexData.compras?.length || 0 }})
              </button>
              <button :class="{ on: ktab === 'abonos' }" @click="ktab = 'abonos'">
                Abonos realizados ({{ kardexData.abonos?.length || 0 }})
              </button>
            </div>

            <!-- Compras -->
            <div v-show="ktab === 'compras'" class="klist">
              <div v-if="!kardexData.compras?.length" class="kempty">Sin compras ni adeudos registrados.</div>
              <div v-for="c in kardexData.compras" :key="c.cuentaId" class="kitem-card" :class="c.estado.toLowerCase()">
                <div class="kitem-top">
                  <div>
                    <div class="kitem-title">
                      Pedido #{{ c.pedidoId }}
                      <span v-if="c.esPagoPendiente" class="kbadge pend-pago">Pendiente ({{ c.metodoPago || 'Pago' }})</span>
                    </div>
                    <div class="kitem-date">Compra: {{ fecha(c.fecha) }} · Vence: {{ fecha(c.fechaLimite) }}</div>
                  </div>
                  <span class="kbadge" :class="c.estado.toLowerCase()">{{ c.estado }}</span>
                </div>
                <div class="kitem-bottom">
                  <div>Monto: <b>{{ money(c.monto) }}</b></div>
                  <div>Abonado: <b>{{ money(c.abonado) }}</b></div>
                  <div class="saldo-res">Resta: <b>{{ money(c.saldo) }}</b></div>
                </div>
              </div>
            </div>

            <!-- Abonos -->
            <div v-show="ktab === 'abonos'" class="klist">
              <div v-if="!kardexData.abonos?.length" class="kempty">Sin abonos registrados aún.</div>
              <div v-for="a in kardexData.abonos" :key="a.id" class="kitem-card abono-card">
                <div class="kitem-top">
                  <div>
                    <div class="kitem-title">Abono #{{ a.id }}</div>
                    <div class="kitem-date">{{ fechaHora(a.fecha) }} · {{ a.metodo || 'Efectivo' }}</div>
                  </div>
                  <span class="abono-amount">+{{ money(a.monto) }}</span>
                </div>
                <div class="abono-meta" v-if="a.nota || a.registradoPorNombre">
                  <span v-if="a.registradoPorNombre" class="abono-recibio">Recibió: {{ a.registradoPorNombre }}</span>
                  <span v-if="a.nota" class="abono-nota">"{{ a.nota }}"</span>
                </div>
              </div>
            </div>
          </div>

          <div class="ms-foot">
            <button class="btn-cancel" @click="cerrarKardex()">Cerrar</button>
            <button class="btn-submit" @click="cerrarKardex(); abrirAbono(modalKardex)">Cobrar abono a este cliente</button>
          </div>
        </div>
      </div>

    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { IonPage, IonContent, IonRefresher, IonRefresherContent } from '@ionic/vue'
import { useAuthStore } from '@/stores/auth'
import http from '@/api/http'
import { imprimirTicketAbono } from '@/services/printer'

const auth = useAuthStore()

const cargando = ref(true)
const error = ref('')
const deudas = ref([])
const pedidosRuta = ref([])
const buscar = ref('')
const filtroRuta = ref('ruta') // 'ruta' | 'todos'

// Modales
const modalAbono = ref(null)
const montoAbono = ref(null)
const metodoAbono = ref(0) // 0: Efectivo, 1: Transferencia
const notaAbono = ref('')
const modalError = ref('')
const procesando = ref(false)

const abonoExito = ref(null)
const imprimiendoTicket = ref(false)
const ticketMsg = ref('')

const modalKardex = ref(null)
const kardexData = ref(null)
const cargandoKardex = ref(false)
const ktab = ref('compras')

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fecha = (f) => f ? new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const fechaHora = (f) => f ? new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
const ini = (n) => (n || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

// IDs de clientes en ruta hoy
const idsClientesRuta = computed(() => new Set(pedidosRuta.value.map(p => p.clienteId).filter(Boolean)))
function estaEnRuta(clienteId) { return idsClientesRuta.value.has(clienteId) }

// Clientes con deuda
const deudoresTodos = computed(() => deudas.value.filter(d => d.saldo > 0))
const deudoresRuta = computed(() => deudoresTodos.value.filter(d => estaEnRuta(d.clienteId)))

const listaFiltrada = computed(() => {
  const base = filtroRuta.value === 'ruta' ? deudoresRuta.value : deudoresTodos.value
  const q = buscar.value.trim().toLowerCase()
  if (!q) return base
  return base.filter(d => (d.clienteNombre || '').toLowerCase().includes(q) || (d.telefono || '').includes(q))
})

const totalSaldoMostrado = computed(() => listaFiltrada.value.reduce((s, d) => s + d.saldo, 0))

const puedeGuardarAbono = computed(() => {
  const m = Number(montoAbono.value)
  return m > 0 && m <= (modalAbono.value?.saldo ?? 0) + 0.01
})

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const [dRes, pRes] = await Promise.all([
      http.get('/creditos/deudas-clientes'),
      http.get('/pedidos', { params: { repartidorId: auth.usuarioId, estado: 'Abierto', tamano: 100 } })
    ])
    deudas.value = dRes.data || []
    pedidosRuta.value = pRes.data?.items || []

    // Si en ruta no hay clientes con saldo deudor, cambiar automáticamente a 'todos' para que el chofer no vea pantalla vacía
    if (deudoresRuta.value.length === 0 && deudoresTodos.value.length > 0) {
      filtroRuta.value = 'todos'
    }
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudieron cargar las deudas.'
  } finally {
    cargando.value = false
  }
}

async function recargar(event) {
  await cargar()
  event?.target?.complete()
}

// ABONO
function abrirAbono(d) {
  modalAbono.value = d
  montoAbono.value = d.saldo
  metodoAbono.value = 0
  notaAbono.value = ''
  modalError.value = ''
}
function cerrarAbono() { modalAbono.value = null }

async function guardarAbono() {
  if (!puedeGuardarAbono.value) return
  procesando.value = true
  modalError.value = ''
  const cli = modalAbono.value
  const monto = Number(montoAbono.value)
  try {
    const { data } = await http.post('/creditos/abonos-cliente', {
      clienteId: cli.clienteId,
      monto: monto,
      metodoPago: metodoAbono.value,
      nota: notaAbono.value.trim() || null
    })

    abonoExito.value = {
      ...data,
      clienteNombre: cli.clienteNombre,
      clienteTelefono: cli.telefono || cli.clienteTelefono,
      saldoAnterior: cli.saldo,
      saldoRestante: Math.max(0, cli.saldo - monto)
    }

    cerrarAbono()
    await cargar()
  } catch (e) {
    modalError.value = e.response?.data?.mensaje || 'Error al registrar el abono.'
  } finally {
    procesando.value = false
  }
}

async function imprimirTicketAbonoActual() {
  if (!abonoExito.value) return
  imprimiendoTicket.value = true
  ticketMsg.value = ''
  try {
    await imprimirTicketAbono({
      abonoId: abonoExito.value.id,
      fecha: abonoExito.value.fecha || new Date(),
      cliente: abonoExito.value.clienteNombre,
      repartidor: auth.usuario?.nombre || 'Repartidor',
      monto: abonoExito.value.monto,
      metodo: abonoExito.value.metodoPagoTexto || (abonoExito.value.metodoPago === 1 ? 'Transferencia' : 'Efectivo'),
      saldoAnterior: abonoExito.value.saldoAnterior,
      saldoRestante: abonoExito.value.saldoRestante,
      nota: abonoExito.value.nota
    })
    ticketMsg.value = 'Ticket impreso correctamente.'
  } catch (e) {
    ticketMsg.value = 'Error de impresión: ' + (e.message || 'Verifique impresora Bluetooth.')
  } finally {
    imprimiendoTicket.value = false
  }
}

function compartirWhatsappAbono() {
  if (!abonoExito.value) return
  const a = abonoExito.value
  const tel = a.clienteTelefono ? a.clienteTelefono.replace(/\D/g, '') : ''
  const fechaStr = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  let msg = `*COMPROBANTE DE ABONO - DISTRIBUIDORA*\n`
  msg += `Folio de abono: #${a.id}\n`
  msg += `Cliente: ${a.clienteNombre}\n`
  msg += `Fecha: ${fechaStr}\n`
  msg += `Recibió: ${auth.usuario?.nombre || 'Repartidor'}\n\n`
  msg += `• Monto abonado: *${money(a.monto)}*\n`
  msg += `• Método: ${a.metodoPagoTexto || 'Efectivo'}\n`
  if (a.nota) msg += `• Referencia: ${a.nota}\n`
  msg += `• Saldo restante: *${money(a.saldoRestante)}*\n\n`
  msg += `Agradecemos su pago puntual.`

  const url = tel ? `https://wa.me/52${tel}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`
  window.open(url, '_blank')
}

// KARDEX
async function abrirKardex(d) {
  modalKardex.value = d
  kardexData.value = null
  cargandoKardex.value = true
  ktab.value = 'compras'
  try {
    const { data } = await http.get(`/creditos/kardex-cliente/${d.clienteId}`)
    kardexData.value = data
  } catch (e) {
    alert(e.response?.data?.mensaje || 'No se pudo cargar el estado de cuenta.')
    cerrarKardex()
  } finally {
    cargandoKardex.value = false
  }
}
function cerrarKardex() { modalKardex.value = null; kardexData.value = null }

function enviarEstadoCuentaWhatsapp() {
  if (!kardexData.value) return
  const kd = kardexData.value
  const tel = (kd.telefono || kd.clienteTelefono || modalKardex.value?.telefono || '').replace(/\D/g, '')
  const fechaHoy = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })

  let msg = `*ESTADO DE CUENTA - DISTRIBUIDORA*\n`
  msg += `Cliente: ${kd.clienteNombre}\n`
  msg += `Fecha: ${fechaHoy}\n\n`
  msg += `*RESUMEN GENERAL:*\n`
  msg += `• Total comprado a crédito: ${money(kd.totalCargado)}\n`
  msg += `• Total abonado histórico: ${money(kd.totalAbonado)}\n`
  msg += `*• SALDO PENDIENTE ACTUAL: ${money(kd.saldo)}*\n\n`

  if (kd.compras?.length) {
    const pendientes = kd.compras.filter(c => c.estado !== 'Pagada' && (c.saldo == null || c.saldo > 0))
    const paraMostrar = pendientes.length ? pendientes.slice(0, 5) : kd.compras.slice(0, 4)
    msg += `*Compras y adeudos ${pendientes.length ? 'pendientes' : 'recientes'}:*\n`
    paraMostrar.forEach(c => {
      const estadoTag = c.esPagoPendiente ? `[Pendiente - ${c.metodoPago || 'Pago'}]` : `[${c.estado}]`
      msg += `• Pedido #${c.pedidoId} (${fecha(c.fecha)}): ${money(c.monto)} ${estadoTag}\n`
    })
    msg += `\n`
  }

  if (kd.abonos?.length) {
    msg += `*Últimos abonos registrados:*\n`
    kd.abonos.slice(0, 3).forEach(a => {
      msg += `• ${fecha(a.fecha)}: ${money(a.monto)} - ${a.nota || 'Abono general'}\n`
    })
    msg += `\n`
  }
  msg += `Agradecemos su preferencia.`

  const url = tel ? `https://wa.me/52${tel}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`
  window.open(url, '_blank')
}

function enviarWhatsappRapido(d) {
  const tel = (d.telefono || d.clienteTelefono || '').replace(/\D/g, '')
  const msg = `Hola ${d.clienteNombre}, le saluda su repartidor de Distribuidora. Me encuentro en ruta y estoy a sus órdenes.`
  const url = tel ? `https://wa.me/52${tel}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`
  window.open(url, '_blank')
}

onMounted(() => {
  cargar()
})
</script>

<style scoped>
.cb-content {
  --background: var(--paper);
}
.scroll {
  padding: 16px 14px 90px;
  max-width: 650px;
  margin: 0 auto;
}

/* HEADER */
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: var(--pine);
  color: #fff;
  display: grid;
  place-items: center;
}
.logo svg {
  width: 20px;
  height: 20px;
}
.title-wrap .s {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: .06em;
  font-weight: 800;
  color: var(--pine);
}
.title-wrap .h {
  font-family: "Bricolage Grotesque";
  font-weight: 800;
  font-size: 19px;
  color: var(--ink);
  line-height: 1.15;
}
.badge-total {
  text-align: right;
  background: var(--surface);
  border: 1px solid var(--line);
  padding: 6px 10px;
  border-radius: 12px;
}
.bt-lbl {
  display: block;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
}
.bt-val {
  font-family: "Bricolage Grotesque";
  font-weight: 800;
  font-size: 15px;
  color: var(--clay);
}

/* SEGMENTO */
.seg-wrap {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  background: var(--surface);
  padding: 4px;
  border-radius: 14px;
  border: 1px solid var(--line);
  margin-bottom: 12px;
}
.seg-btn {
  background: transparent;
  border: none;
  padding: 8px 6px;
  border-radius: 10px;
  font-family: "Bricolage Grotesque";
  font-weight: 700;
  font-size: 12.5px;
  color: var(--muted);
  cursor: pointer;
  transition: all .15s ease;
}
.seg-btn.on {
  background: var(--pine);
  color: #fff;
}

/* BUSCADOR */
.search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 0 12px;
  height: 42px;
  margin-bottom: 14px;
}
.s-ic {
  width: 17px;
  height: 17px;
  stroke: var(--muted);
  fill: none;
  stroke-width: 2.2;
}
.search-wrap input {
  border: none;
  background: transparent;
  width: 100%;
  font-size: 13.5px;
  color: var(--ink);
  outline: none;
}
.clear-b {
  border: none;
  background: none;
  color: var(--muted);
  font-size: 13px;
  cursor: pointer;
}

/* LISTA Y TARJETAS */
.client-grid {
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.client-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 13px;
  box-shadow: 0 2px 6px rgba(0,0,0,.03);
  transition: border .15s;
}
.client-card.enRuta {
  border-left: 4px solid var(--pine);
}
.cc-top {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.cc-avatar {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: var(--paper-2);
  color: var(--ink);
  font-family: "Bricolage Grotesque";
  font-weight: 800;
  font-size: 13px;
  display: grid;
  place-items: center;
  flex: 0 0 38px;
}
.cc-info {
  flex: 1;
  min-width: 0;
}
.cc-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.cc-name {
  font-family: "Bricolage Grotesque";
  font-weight: 800;
  font-size: 14px;
  color: var(--ink);
}
.tag-ruta {
  font-size: 10px;
  font-weight: 800;
  color: var(--pine);
  background: var(--pine-tint);
  padding: 2px 6px;
  border-radius: 6px;
  text-transform: uppercase;
}
.cc-meta {
  font-size: 11.5px;
  color: var(--muted);
  margin-top: 2px;
}
.cc-saldo-wrap {
  text-align: right;
  flex: 0 0 auto;
}
.cc-saldo-lbl {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
}
.cc-saldo-val {
  font-family: "Bricolage Grotesque";
  font-weight: 800;
  font-size: 15px;
  color: var(--clay);
}

.cc-contact {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--line);
}
.contact-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--paper);
  border: 1px solid var(--line);
  color: var(--ink-soft);
  font-size: 11.5px;
  font-weight: 700;
  padding: 4px 9px;
  border-radius: 8px;
  text-decoration: none;
  cursor: pointer;
}
.contact-btn svg {
  width: 13px;
  height: 13px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
}
.contact-btn.wa svg {
  fill: #25D366;
  stroke: none;
}

.cc-acts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 10px;
}
.btn-kardex, .btn-abonar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 8px;
  border-radius: 11px;
  font-family: "Bricolage Grotesque";
  font-weight: 700;
  font-size: 12.5px;
  cursor: pointer;
  transition: all .15s;
}
.btn-kardex {
  background: var(--paper-2);
  border: 1px solid var(--line);
  color: var(--ink);
}
.btn-kardex svg {
  width: 15px;
  height: 15px;
}
.btn-abonar {
  background: var(--amber);
  border: none;
  color: #3b2808;
}
.btn-abonar svg {
  width: 15px;
  height: 15px;
  stroke: currentColor;
}

/* ESTADOS VACÍO Y CARGA */
.loading-state, .empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--muted);
}
.empty-ic {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: var(--pine-tint);
  color: var(--pine);
  display: grid;
  place-items: center;
  margin: 0 auto 12px;
}
.empty-ic svg {
  width: 24px;
  height: 24px;
}
.empty-t {
  font-family: "Bricolage Grotesque";
  font-weight: 800;
  font-size: 15px;
  color: var(--ink);
  margin-bottom: 4px;
}
.empty-s {
  font-size: 13px;
  margin-bottom: 14px;
}
.btn-sec {
  background: var(--surface);
  border: 1.5px solid var(--pine);
  color: var(--pine);
  font-family: "Bricolage Grotesque";
  font-weight: 700;
  font-size: 13px;
  padding: 8px 16px;
  border-radius: 12px;
  cursor: pointer;
}
.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--line);
  border-top-color: var(--pine);
  border-radius: 50%;
  animation: spin .8s linear infinite;
  margin: 0 auto 10px;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* MODALES */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.5);
  backdrop-filter: blur(4px);
  z-index: 2500;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.modal-sheet {
  background: var(--surface);
  width: 100%;
  max-width: 520px;
  border-radius: 22px 22px 0 0;
  padding: 16px 18px 24px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -10px 40px rgba(0,0,0,.2);
  animation: slideUp .22s ease;
}
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

.ms-handle {
  width: 36px;
  height: 4px;
  background: var(--line);
  border-radius: 99px;
  margin: 0 auto 12px;
}
.ms-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.ms-title {
  font-family: "Bricolage Grotesque";
  font-weight: 800;
  font-size: 18px;
  color: var(--ink);
}
.ms-sub {
  font-size: 12.5px;
  color: var(--muted);
}
.ms-close {
  background: var(--paper-2);
  border: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  font-size: 14px;
  color: var(--muted);
  cursor: pointer;
}

.ms-body {
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.saldo-card {
  background: #FDF2E9;
  border: 1px solid #F5C6A5;
  border-radius: 12px;
  padding: 10px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.sc-l {
  font-size: 12px;
  font-weight: 700;
  color: #92400E;
}
.sc-v {
  font-family: "Bricolage Grotesque";
  font-weight: 800;
  font-size: 17px;
  color: #C0573B;
}

.presets-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.preset-btn {
  background: var(--paper-2);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 11.5px;
  font-family: "Bricolage Grotesque";
  font-weight: 700;
  color: var(--ink);
  cursor: pointer;
}

.input-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.input-field label {
  font-size: 12px;
  font-weight: 700;
  color: var(--ink-soft);
}
.money-input-wrap {
  display: flex;
  align-items: center;
  background: var(--paper);
  border: 2px solid var(--line);
  border-radius: 14px;
  padding: 0 14px;
  height: 48px;
}
.money-input-wrap .sym {
  font-family: "Bricolage Grotesque";
  font-weight: 800;
  font-size: 20px;
  color: var(--pine);
  margin-right: 6px;
}
.money-input-wrap input {
  border: none;
  background: transparent;
  font-family: "Bricolage Grotesque";
  font-weight: 800;
  font-size: 20px;
  color: var(--ink);
  width: 100%;
  outline: none;
}

.pay-method-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.pm-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--paper);
  border: 1.5px solid var(--line);
  border-radius: 12px;
  padding: 10px;
  font-family: "Bricolage Grotesque";
  font-weight: 700;
  font-size: 13px;
  color: var(--ink);
  cursor: pointer;
}
.pm-btn svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
}
.pm-btn.on {
  border-color: var(--pine);
  background: var(--pine-tint);
  color: var(--pine);
}
.pm-tip {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.35;
  margin-top: 3px;
}

.input-field input[type="text"] {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 13.5px;
  outline: none;
}

.field-error {
  font-size: 12px;
  color: #DC2626;
  font-weight: 600;
}

.ms-foot {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 10px;
  margin-top: 14px;
}
.btn-cancel {
  background: var(--paper-2);
  border: 1px solid var(--line);
  padding: 12px;
  border-radius: 14px;
  font-family: "Bricolage Grotesque";
  font-weight: 700;
  font-size: 13.5px;
  color: var(--ink-soft);
  cursor: pointer;
}
.btn-submit {
  background: var(--amber);
  border: none;
  padding: 12px;
  border-radius: 14px;
  font-family: "Bricolage Grotesque";
  font-weight: 700;
  font-size: 14px;
  color: #3b2808;
  cursor: pointer;
}
.btn-submit:disabled {
  opacity: .5;
  cursor: not-allowed;
}

/* ÉXITO DE ABONO */
.exito-sheet {
  text-align: center;
  align-items: center;
}
.exito-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--pine-tint);
  color: var(--pine);
  display: grid;
  place-items: center;
  font-size: 26px;
  font-weight: 900;
  margin-bottom: 10px;
}
.exito-title {
  font-family: "Bricolage Grotesque";
  font-weight: 800;
  font-size: 20px;
  color: var(--ink);
}
.exito-sub {
  font-size: 13.5px;
  color: var(--muted);
  margin-bottom: 14px;
}
.receipt-card {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px 16px;
  width: 100%;
  max-width: 380px;
  margin-bottom: 14px;
  text-align: left;
}
.rc-row {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  font-size: 13px;
}
.rc-k { color: var(--muted); font-weight: 600; }
.rc-v { font-family: "Bricolage Grotesque"; font-weight: 700; color: var(--ink); }
.rc-v.bold { font-size: 15px; color: var(--amber); }
.rc-v.green { color: var(--pine); }

.exito-acts {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 380px;
  margin-bottom: 12px;
}
.btn-ticket, .btn-wa {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: 13px;
  font-family: "Bricolage Grotesque";
  font-weight: 700;
  font-size: 13.5px;
  cursor: pointer;
}
.btn-ticket {
  background: var(--surface);
  border: 1.5px solid var(--line);
  color: var(--ink);
}
.btn-ticket svg { width: 18px; height: 18px; }
.btn-wa {
  background: #25D366;
  border: none;
  color: #fff;
}
.btn-wa svg { width: 18px; height: 18px; fill: #fff; }
.ticket-status { font-size: 12px; font-weight: 600; color: var(--amber); margin-bottom: 8px; }
.ticket-status.ok { color: var(--pine); }
.btn-close-exito {
  background: var(--pine);
  border: none;
  color: #fff;
  padding: 13px;
  border-radius: 14px;
  width: 100%;
  max-width: 380px;
  font-family: "Bricolage Grotesque";
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
}

/* KARDEX */
.kardex-summary {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 10px;
  text-align: center;
}
.ks-col { display: flex; flex-direction: column; gap: 2px; }
.ks-l { font-size: 10.5px; font-weight: 700; color: var(--muted); text-transform: uppercase; }
.ks-v { font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 13px; color: var(--ink); }
.ks-col.primary .ks-v { color: var(--clay); font-size: 14.5px; }

.wa-statement-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #DCF8C6;
  border: 1px solid #B8E89D;
  color: #128C7E;
  padding: 10px;
  border-radius: 12px;
  font-family: "Bricolage Grotesque";
  font-weight: 700;
  font-size: 12.5px;
  cursor: pointer;
}
.wa-statement-btn svg { width: 17px; height: 17px; fill: currentColor; }

.ktabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  border-bottom: 1px solid var(--line);
  padding-bottom: 6px;
}
.ktabs button {
  background: none;
  border: none;
  padding: 7px;
  font-family: "Bricolage Grotesque";
  font-weight: 700;
  font-size: 12.5px;
  color: var(--muted);
  cursor: pointer;
  border-radius: 8px;
}
.ktabs button.on {
  background: var(--paper-2);
  color: var(--pine);
}

.klist {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.kitem-card {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px 12px;
}
.kitem-card.vencida { border-left: 3px solid #EF4444; }
.kitem-card.pendiente { border-left: 3px solid #F59E0B; }
.kitem-card.pagada { border-left: 3px solid #10B981; }

.kitem-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.kitem-title {
  font-family: "Bricolage Grotesque";
  font-weight: 800;
  font-size: 13.5px;
  color: var(--ink);
}
.kitem-date {
  font-size: 11px;
  color: var(--muted);
}
.kbadge {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 6px;
  text-transform: uppercase;
}
.kbadge.vencida { background: #FEE2E2; color: #DC2626; }
.kbadge.pendiente { background: #FEF3C7; color: #D97706; }
.kbadge.pagada { background: #D1FAE5; color: #059669; }
.kbadge.pend-pago { background: #FFF7ED; color: #C2410C; border: 1px solid #FDBA74; }

.kitem-bottom {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px dashed var(--line);
  font-size: 12px;
  color: var(--ink-soft);
}
.kitem-bottom .saldo-res b { color: var(--clay); }

.abono-card { border-left: 3px solid #10B981; }
.abono-amount { font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 15px; color: #059669; }
.abono-meta { font-size: 11px; color: var(--muted); margin-top: 4px; display: flex; flex-direction: column; gap: 2px; }
.abono-recibio { font-weight: 600; color: var(--ink-soft); }
.kempty { text-align: center; color: var(--muted); font-size: 12.5px; padding: 20px; }
</style>
