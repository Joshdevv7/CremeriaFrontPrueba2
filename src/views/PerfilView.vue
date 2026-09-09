<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Mi Perfil</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="perfil-content">
      <div class="wrap">
        <!-- Tarjeta de usuario -->
        <div class="user-card">
          <div class="av">{{ iniciales }}</div>
          <div class="user-info">
            <div class="n">{{ auth.usuario?.nombre }}</div>
            <div class="role-badge">{{ auth.usuario?.rol }}</div>
            <div class="email" v-if="auth.usuario?.email">{{ auth.usuario?.email }}</div>
          </div>
        </div>

        <!-- Sección de Repartidor: Balance con almacén y ruta -->
        <template v-if="esRepartidor">
          <div class="sec-ttl">Estado con almacén</div>
          <div class="deuda-card" :class="{ alCorriente: deudaRepartidor && deudaRepartidor.saldo <= 0, conDeuda: deudaRepartidor && deudaRepartidor.saldo > 0 }">
            <div class="dc-top">
              <div class="dc-ic">
                <svg v-if="deudaRepartidor && deudaRepartidor.saldo > 0" viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>
                <svg v-else viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <div class="dc-info">
                <div class="dc-lbl">Saldo deudor / faltantes</div>
                <div class="dc-val" v-if="cargandoDeuda">Consultando…</div>
                <div class="dc-val" v-else-if="deudaRepartidor">{{ money(deudaRepartidor.saldo) }} <small>MXN</small></div>
                <div class="dc-val" v-else>$0.00 <small>MXN</small></div>
              </div>
            </div>
            <div class="dc-sub" v-if="!cargandoDeuda">
              <template v-if="deudaRepartidor && deudaRepartidor.saldo > 0">
                <span>Tienes un saldo pendiente por liquidar con almacén.</span>
                <div class="dc-breakdown">
                  <span>Cargos: <b>{{ money(deudaRepartidor.totalCargado) }}</b></span>
                  <span>Abonos: <b>{{ money(deudaRepartidor.totalAbonado) }}</b></span>
                </div>
              </template>
              <template v-else>
                <span>Estás al corriente. No tienes adeudos ni faltantes pendientes.</span>
              </template>
            </div>
          </div>
        </template>

        <!-- Herramientas y dispositivos -->
        <div class="sec-ttl">Dispositivos y herramientas</div>
        
        <!-- Impresora Térmica Bluetooth -->
        <div class="tool-card" @click="$router.push('/app/impresora')">
          <div class="tc-ic print">
            <svg viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5h20v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>
          </div>
          <div class="tc-info">
            <div class="tc-title">Impresora Bluetooth</div>
            <div class="tc-sub" v-if="impresoraActual">
              <span class="dot on"></span> {{ impresoraActual.nombre }}
            </div>
            <div class="tc-sub muted" v-else>
              <span class="dot off"></span> Sin impresora configurada
            </div>
          </div>
          <div class="tc-arrow">
            <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </div>

        <!-- Botón de cierre de sesión -->
        <button class="btn-logout" @click="salir">
          <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          Cerrar sesión
        </button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, onIonViewWillEnter } from '@ionic/vue'
import { useAuthStore } from '@/stores/auth'
import { impresoraGuardada } from '@/services/printer'
import http from '@/api/http'

const auth = useAuthStore()
const router = useRouter()

const iniciales = computed(() => (auth.usuario?.nombre || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase())
const esRepartidor = computed(() => auth.usuario?.rol === 'Repartidor')

const impresoraActual = ref(null)
const deudaRepartidor = ref(null)
const cargandoDeuda = ref(false)

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

async function consultarDeuda() {
  if (!esRepartidor.value) return
  cargandoDeuda.value = true
  try {
    const { data } = await http.get('/cortes/deudas')
    const miDeuda = (data || []).find(d => d.repartidorId === auth.usuarioId)
    deudaRepartidor.value = miDeuda || { saldo: 0, totalCargado: 0, totalAbonado: 0 }
  } catch (e) {
    deudaRepartidor.value = { saldo: 0, totalCargado: 0, totalAbonado: 0 }
  } finally {
    cargandoDeuda.value = false
  }
}

function refrescarImpresora() {
  impresoraActual.value = impresoraGuardada()
}

function salir() {
  auth.logout()
  router.replace('/login')
}

onMounted(() => {
  refrescarImpresora()
  consultarDeuda()
})

onIonViewWillEnter(() => {
  refrescarImpresora()
  consultarDeuda()
})
</script>

<style scoped>
ion-toolbar { --background: var(--paper); }
ion-title { font-family: "Bricolage Grotesque"; font-weight: 700; color: var(--ink); }
.perfil-content { --background: var(--paper); }
.wrap { padding: 20px 18px 40px; max-width: 480px; margin: 0 auto; }

/* Tarjeta de usuario */
.user-card { display: flex; align-items: center; gap: 16px; background: var(--surface); border: 1px solid var(--line); border-radius: 20px; padding: 20px; box-shadow: var(--shadow); }
.av { width: 58px; height: 58px; border-radius: 16px; display: grid; place-items: center; background: var(--amber-soft); color: #B9781F; font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 22px; flex-shrink: 0; }
.user-info { flex: 1; min-width: 0; }
.n { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 19px; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.role-badge { display: inline-block; background: var(--pine-tint); color: var(--pine); font-size: 11.5px; font-weight: 700; padding: 3px 9px; border-radius: 7px; margin-top: 4px; text-transform: uppercase; letter-spacing: .04em; }
.email { font-size: 12.5px; color: var(--muted); margin-top: 3px; }

/* Título de sección */
.sec-ttl { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); margin: 24px 4px 10px; }

/* Tarjeta de deuda */
.deuda-card { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 16px; box-shadow: var(--shadow); transition: .2s; }
.deuda-card.alCorriente { border-color: #A7F3D0; background: linear-gradient(145deg, #F0FDF4, var(--surface)); }
.deuda-card.conDeuda { border-color: #FECACA; background: linear-gradient(145deg, #FEF2F2, var(--surface)); }

.dc-top { display: flex; align-items: center; gap: 14px; }
.dc-ic { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; flex-shrink: 0; }
.deuda-card.alCorriente .dc-ic { background: #ECFDF5; }
.deuda-card.alCorriente .dc-ic svg { width: 22px; height: 22px; stroke: #059669; fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
.deuda-card.conDeuda .dc-ic { background: #FEF2F2; }
.deuda-card.conDeuda .dc-ic svg { width: 22px; height: 22px; stroke: #DC2626; fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }

.dc-info { flex: 1; }
.dc-lbl { font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
.dc-val { font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 24px; color: var(--ink); margin-top: 2px; font-variant-numeric: tabular-nums; }
.dc-val small { font-size: 13px; font-weight: 600; color: var(--muted); }
.deuda-card.conDeuda .dc-val { color: var(--clay); }

.dc-sub { font-size: 12.5px; color: var(--ink-soft); margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--line); line-height: 1.4; }
.dc-breakdown { display: flex; gap: 16px; margin-top: 6px; font-size: 12px; color: var(--muted); }
.dc-breakdown b { color: var(--ink); font-variant-numeric: tabular-nums; }

/* Herramientas */
.tool-card { display: flex; align-items: center; gap: 14px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px 16px; cursor: pointer; box-shadow: var(--shadow); transition: transform .12s, border-color .15s; }
.tool-card:active { transform: scale(.98); }
.tool-card:hover { border-color: var(--pine); }
.tc-ic { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; flex-shrink: 0; }
.tc-ic.print { background: var(--pine-tint); }
.tc-ic.print svg { width: 20px; height: 20px; stroke: var(--pine); fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.tc-info { flex: 1; min-width: 0; }
.tc-title { font-weight: 700; font-size: 14.5px; color: var(--ink); }
.tc-sub { font-size: 12.5px; color: var(--ink-soft); display: flex; align-items: center; gap: 6px; margin-top: 2px; }
.tc-sub.muted { color: var(--muted); }
.dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
.dot.on { background: #10B981; }
.dot.off { background: #9CA3AF; }
.tc-arrow svg { width: 18px; height: 18px; stroke: var(--muted); fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }

/* Cerrar sesión */
.btn-logout { width: 100%; margin-top: 32px; border: none; border-radius: 15px; padding: 15px; background: #FEF2F2; color: #DC2626; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 9px; transition: transform .12s, background .15s; }
.btn-logout:active { transform: scale(.98); }
.btn-logout svg { width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
</style>
