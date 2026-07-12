<template>
  <div>
    <p v-if="cargando" class="muted">Cargando deudas…</p>
    <p v-else-if="error" class="err">{{ error }}</p>

    <template v-else>
      <div class="resumen">
        <div class="rz-k">Total por cobrar a repartidores</div>
        <div class="rz-v">{{ money(totalDeuda) }}<span class="mxn">MXN</span></div>
      </div>

      <p v-if="!conDeuda.length" class="muted">Ningún repartidor tiene saldo pendiente.</p>

      <div class="grid" v-if="conDeuda.length">
        <div v-for="d in conDeuda" :key="d.repartidorId" class="card">
          <div class="c-top">
            <div class="av">{{ ini(d.repartidorNombre) }}</div>
            <div class="info">
              <div class="nm">{{ d.repartidorNombre }}</div>
              <div class="meta">Cargado {{ money(d.totalCargado) }} · Abonado {{ money(d.totalAbonado) }}</div>
            </div>
            <div class="saldo">{{ money(d.saldo) }}</div>
          </div>
          <button class="abonar" @click="abrir(d)">Registrar abono</button>
        </div>
      </div>

      <!-- Repartidores sin deuda -->
      <div v-if="sinDeuda.length" class="limpios">
        <div class="lm-t">Sin saldo pendiente</div>
        <div class="lm-list">
          <span v-for="d in sinDeuda" :key="d.repartidorId" class="lm">{{ d.repartidorNombre }}</span>
        </div>
      </div>
    </template>

    <!-- Modal de abono -->
    <div v-if="modal" class="modal-bg" @click.self="cerrar()">
      <div class="modal">
        <div class="m-head">
          <div>
            <div class="m-title">Registrar abono</div>
            <div class="m-sub">{{ modal.repartidorNombre }}</div>
          </div>
          <button class="m-x" @click="cerrar()"><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div class="m-body">
          <div class="falta">
            <span class="fl">Saldo pendiente</span>
            <span class="fv">{{ money(modal.saldo) }}</span>
          </div>
          <div class="campo">
            <div class="fl2">Monto que abona</div>
            <div class="mwrap">
              <span class="pfx">$</span>
              <input class="inp mono" type="number" step="0.01" v-model.number="monto">
            </div>
          </div>
          <div class="campo">
            <div class="fl2">Nota (opcional)</div>
            <input class="inp" v-model="nota" placeholder="Ej. Descuento de nómina">
          </div>
          <p v-if="modalError" class="m-err">{{ modalError }}</p>
        </div>
        <div class="m-foot">
          <button class="m-cancel" @click="cerrar()">Cancelar</button>
          <button class="m-ok" :disabled="procesando || !puedeGuardar" @click="guardar()">
            {{ procesando ? 'Guardando…' : 'Registrar abono' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import http from '@/api/http'

const emit = defineEmits(['ctx'])
const deudas = ref([])
const cargando = ref(true)
const error = ref('')

const modal = ref(null)
const monto = ref(null)
const nota = ref('')
const modalError = ref('')
const procesando = ref(false)

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const ini = (n) => (n || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

const conDeuda = computed(() => deudas.value.filter((d) => d.saldo > 0))
const sinDeuda = computed(() => deudas.value.filter((d) => d.saldo <= 0))
const totalDeuda = computed(() => conDeuda.value.reduce((s, d) => s + d.saldo, 0))
const puedeGuardar = computed(() => Number(monto.value) > 0 && Number(monto.value) <= (modal.value?.saldo ?? 0))

async function cargar() {
  cargando.value = true; error.value = ''
  try {
    const { data } = await http.get('/cortes/deudas')
    deudas.value = data
  } catch (e) {
    error.value = e.response?.data?.mensaje || 'No se pudieron cargar las deudas.'
  } finally { cargando.value = false }
}

function abrir(d) { modal.value = d; monto.value = d.saldo; nota.value = ''; modalError.value = '' }
function cerrar() { modal.value = null }

async function guardar() {
  procesando.value = true; modalError.value = ''
  try {
    await http.post('/cortes/abonos', {
      repartidorId: modal.value.repartidorId,
      monto: Number(monto.value),
      nota: nota.value.trim() || null
    })
    cerrar()
    await cargar()
  } catch (e) {
    modalError.value = e.response?.data?.mensaje || 'No se pudo registrar el abono.'
  } finally { procesando.value = false }
}

onMounted(() => {
  emit('ctx', { titulo: 'Deudas de repartidores', sub: 'Faltantes a su cargo y abonos', back: null })
  cargar()
})
</script>

<style scoped>
.muted { color: var(--muted); margin-top: 24px; }
.err { color: var(--clay); font-weight: 600; margin-top: 24px; }

.resumen { background: linear-gradient(155deg,var(--clay),#9A4730); border-radius: 20px; padding: 20px; color: #fff; margin-bottom: 20px; box-shadow: 0 18px 36px -20px rgba(192,87,59,.9); }
.rz-k { font-size: 13px; color: #F0D5CB; font-weight: 600; }
.rz-v { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 34px; letter-spacing: -.02em; margin-top: 4px; font-variant-numeric: tabular-nums; }
.rz-v .mxn { font-size: 14px; color: #F0D5CB; font-weight: 600; margin-left: 7px; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 13px; }
.card { background: var(--surface); border: 1px solid var(--clay-soft); border-radius: 18px; padding: 15px; box-shadow: var(--shadow); }
.c-top { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.av { width: 42px; height: 42px; border-radius: 12px; background: var(--clay-soft); display: grid; place-items: center; color: var(--clay); font-weight: 700; font-size: 14px; flex: 0 0 auto; }
.info { flex: 1; min-width: 0; }
.nm { font-weight: 700; font-size: 15px; }
.meta { font-size: 11.5px; color: var(--muted); margin-top: 2px; }
.saldo { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 19px; color: var(--clay); font-variant-numeric: tabular-nums; flex: 0 0 auto; }
.abonar { width: 100%; background: var(--pine); color: #fff; border: none; border-radius: 12px; padding: 12px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; cursor: pointer; }

.limpios { margin-top: 26px; }
.lm-t { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; }
.lm-list { display: flex; gap: 8px; flex-wrap: wrap; }
.lm { background: var(--pine-tint); color: var(--pine-deep); border-radius: 999px; padding: 7px 14px; font-size: 13px; font-weight: 600; }

.modal-bg { position: fixed; inset: 0; background: rgba(21,42,36,.45); backdrop-filter: blur(3px); display: grid; place-items: center; z-index: 3000; padding: 20px; }
.modal { background: var(--surface); border-radius: 22px; width: 100%; max-width: 420px; box-shadow: 0 30px 60px -20px rgba(0,0,0,.5); overflow: hidden; }
.m-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 20px 14px; border-bottom: 1px solid var(--line); }
.m-title { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 19px; }
.m-sub { font-size: 13px; color: var(--muted); font-weight: 600; margin-top: 2px; }
.m-x { width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--line); background: var(--paper); display: grid; place-items: center; cursor: pointer; flex: 0 0 auto; }
.m-x svg { width: 16px; height: 16px; stroke: var(--muted); fill: none; stroke-width: 2.4; stroke-linecap: round; }
.m-body { padding: 16px 20px; }
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
.m-err { color: var(--clay); font-size: 13px; font-weight: 600; margin-top: 10px; }
.m-foot { display: flex; gap: 10px; padding: 4px 20px 20px; }
.m-cancel { flex: 1; border: 1px solid var(--line); background: var(--surface); color: var(--ink-soft); border-radius: 13px; padding: 13px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; }
.m-ok { flex: 1.6; border: none; background: var(--pine); color: #fff; border-radius: 13px; padding: 13px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; }
.m-ok:disabled { opacity: .5; }
</style>
