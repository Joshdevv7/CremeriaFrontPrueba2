<template>
  <div class="campana" ref="root">
    <button class="bell" @click="abierto = !abierto" :class="{ act: abierto }">
      <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>
      <span v-if="notif.noLeidas > 0" class="badge">{{ notif.noLeidas > 9 ? '9+' : notif.noLeidas }}</span>
    </button>

    <transition name="drop">
      <div v-if="abierto" class="panel">
        <div class="phead">
          <span>Notificaciones</span>
          <button v-if="notif.noLeidas > 0" class="leer" @click="notif.marcarTodas()">Marcar leídas</button>
        </div>
        <div class="plist">
          <p v-if="!notif.items.length" class="vacio">Sin notificaciones por ahora.</p>
          <div v-for="n in notif.items" :key="n.id" class="item" :class="{ noleida: !n.leida }" @click="notif.marcarLeida(n)">
            <div class="ic">{{ emoji(n.tipo) }}</div>
            <div class="txt"><div class="t">{{ n.titulo }}</div><div class="m">{{ n.mensaje }}</div><div class="f">{{ rel(n.fecha) }}</div></div>
            <span v-if="!n.leida" class="dot"></span>
          </div>
        </div>
        <div class="pfoot" v-if="notif.items.length">
          <button class="lim" @click="notif.limpiarLeidas()">Limpiar leídas</button>
          <button class="lim danger" @click="confirmarTodas()">Limpiar todas</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useNotifStore } from '@/stores/notificaciones'

const notif = useNotifStore()
const abierto = ref(false)
const root = ref(null)

const EMOJIS = { StockBajo: '📦', EntregaTerminada: '✅', MermaReportada: '⚠️', PedidoCreado: '🧾', CorteCerrado: '💵', CargaAbierta: '🚚', CreditoPorVencer: '⏰', VentaLibre: '🛒' }
function emoji(t) { return EMOJIS[t] || '🔔' }
function rel(f) {
  const s = Math.floor((Date.now() - new Date(f)) / 1000)
  if (s < 60) return 'hace un momento'
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`
  return new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}
function confirmarTodas() { if (confirm('¿Borrar todas las notificaciones?')) notif.limpiarTodas() }
function fuera(e) { if (root.value && !root.value.contains(e.target)) abierto.value = false }
onMounted(() => document.addEventListener('click', fuera))
onUnmounted(() => document.removeEventListener('click', fuera))
</script>

<style scoped>
.campana { position: relative; }
.bell { position: relative; width: 42px; height: 42px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); display: grid; place-items: center; cursor: pointer; }
.bell.act { background: var(--paper-2); }
.bell svg { width: 21px; height: 21px; stroke: var(--ink); fill: none; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
.badge { position: absolute; top: -5px; right: -5px; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: var(--clay); color: #fff; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 10.5px; display: grid; place-items: center; border: 2px solid var(--surface); }
.panel { position: absolute; right: 0; top: 50px; width: 340px; max-width: 86vw; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; box-shadow: 0 24px 50px -18px rgba(21,42,36,.45); z-index: 1200; overflow: hidden; }
.phead { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid var(--line); }
.phead span { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; }
.leer { background: none; border: none; color: var(--pine); font-family: "Hanken Grotesk"; font-weight: 700; font-size: 12.5px; cursor: pointer; }
.plist { max-height: 54vh; overflow: auto; }
.vacio { padding: 26px 16px; text-align: center; color: var(--muted); font-size: 13px; font-weight: 500; }
.item { display: flex; align-items: flex-start; gap: 11px; padding: 13px 16px; border-bottom: 1px solid var(--line); cursor: pointer; transition: background .12s; }
.item:last-child { border-bottom: none; }
.item:hover { background: var(--paper); }
.item.noleida { background: var(--pine-tint); }
.item.noleida:hover { background: #DDEBE4; }
.ic { font-size: 19px; flex: 0 0 auto; line-height: 1.3; }
.txt { flex: 1; min-width: 0; }
.txt .t { font-weight: 700; font-size: 13.5px; }
.txt .m { font-size: 12.5px; color: var(--ink-soft); margin-top: 1px; line-height: 1.35; }
.txt .f { font-size: 11px; color: var(--muted); margin-top: 3px; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--clay); flex: 0 0 auto; margin-top: 5px; }
.pfoot { display: flex; gap: 8px; padding: 10px 12px; border-top: 1px solid var(--line); background: var(--paper); }
.lim { flex: 1; border: 1px solid var(--line); background: var(--surface); color: var(--ink-soft); font-family: "Hanken Grotesk"; font-weight: 700; font-size: 12px; padding: 8px; border-radius: 9px; cursor: pointer; }
.lim.danger { color: var(--clay); border-color: #E7C4B8; background: var(--clay-soft); }
.drop-enter-active, .drop-leave-active { transition: opacity .15s, transform .15s; }
.drop-enter-from, .drop-leave-to { opacity: 0; transform: translateY(-6px); }
@media (max-width: 560px) { .panel { position: fixed; right: 10px; left: 10px; top: 64px; width: auto; max-width: none; } }
</style>
