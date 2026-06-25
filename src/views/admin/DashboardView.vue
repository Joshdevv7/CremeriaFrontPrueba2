<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar><ion-title>Resumen</ion-title></ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="wrap">
        <p v-if="cargando" class="muted">Cargando…</p>
        <p v-else-if="error" class="err">{{ error }}</p>

        <div v-else class="grid">
          <div class="kpi">
            <div class="k">Ventas del mes</div>
            <div class="v">{{ mxn(d.ventasTotal) }}</div>
          </div>
          <div class="kpi">
            <div class="k">Utilidad neta</div>
            <div class="v">{{ mxn(d.utilidadNeta) }}</div>
            <div class="s">Margen bruto {{ d.margenBrutoPorcentaje }}%</div>
          </div>
          <div class="kpi">
            <div class="k">Por cobrar</div>
            <div class="v">{{ mxn(d.cuentasPorCobrarPendiente) }}</div>
            <div class="s">Vencido {{ mxn(d.cuentasPorCobrarVencido) }}</div>
          </div>
          <div class="kpi">
            <div class="k">Costo de merma</div>
            <div class="v">{{ mxn(d.costoMerma) }}</div>
          </div>
        </div>

        <div v-if="!cargando && !error && d.alertasStock?.length" class="alerts">
          <h3>Alertas de stock</h3>
          <div v-for="a in d.alertasStock" :key="a.productoId" class="arow">
            <div>
              <div class="an">{{ a.nombre }}</div>
              <div class="as">Quedan {{ a.stock }} · mín {{ a.minimo }} · objetivo {{ a.objetivo }} · pedir {{ a.sugerido }}</div>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/vue'
import http from '@/api/http'
import { useCurrency } from '@/composables/useCurrency'

const { mxn } = useCurrency()
const d = ref({})
const cargando = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const { data } = await http.get('/dashboard')
    d.value = data
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudo cargar el resumen.'
  } finally {
    cargando.value = false
  }
})
</script>

<style scoped>
ion-toolbar { --background: var(--paper); }
ion-title { font-family: "Bricolage Grotesque"; font-weight: 700; }
.wrap { padding: 10px 16px 24px; }
.muted { color: var(--muted); text-align: center; margin-top: 30px; }
.err { color: var(--clay); text-align: center; margin-top: 30px; font-weight: 600; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.kpi { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 15px; box-shadow: var(--shadow); }
.kpi .k { font-size: 12.5px; font-weight: 700; color: var(--muted); }
.kpi .v { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 22px; color: var(--ink); margin-top: 8px; }
.kpi .s { font-size: 11.5px; color: var(--muted); margin-top: 3px; }
.alerts { margin-top: 22px; }
.alerts h3 { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 16px; margin: 0 2px 10px; }
.arow { background: var(--clay-soft); border: 1px solid #EAC9BC; border-radius: 14px; padding: 13px; margin-bottom: 9px; }
.an { font-weight: 700; font-size: 14px; }
.as { font-size: 12px; color: #9A4730; font-weight: 600; margin-top: 2px; }
</style>
