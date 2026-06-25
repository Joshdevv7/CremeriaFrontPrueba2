<template>
  <transition name="exito-fade">
    <div v-if="show" class="exito">
      <div class="card">
        <div class="check"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></div>
        <h2>{{ titulo }}</h2>
        <p v-if="subtitulo">{{ subtitulo }}</p>

        <div class="panel" v-if="chips?.length || detalle?.length">
          <div class="chips" v-if="chips?.length">
            <span v-for="(c, i) in chips" :key="i" class="chip">{{ c }}</span>
          </div>
          <div class="rows" v-if="detalle?.length">
            <div v-for="(r, i) in detalle" :key="i" class="row">
              <span class="k">{{ r.k }}</span><span class="v">{{ r.v }}</span>
            </div>
          </div>
        </div>

        <button class="cta" @click="$emit('done')">{{ ctaTexto || 'Listo' }}</button>
      </div>
    </div>
  </transition>
</template>

<script setup>
defineProps({
  show: Boolean,
  titulo: String,
  subtitulo: String,
  chips: { type: Array, default: () => [] },
  detalle: { type: Array, default: () => [] },
  ctaTexto: String
})
defineEmits(['done'])
</script>

<style scoped>
.exito { position: fixed; inset: 0; z-index: 3000; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(160deg,var(--pine),var(--pine-deep)); padding: 40px 24px; overflow: auto; }
.card { width: 100%; max-width: 100%; display: flex; flex-direction: column; align-items: center; text-align: center; }

.check { width: 80px; height: 80px; border-radius: 50%; background: rgba(255,255,255,.14); display: grid; place-items: center; margin-bottom: 18px; position: relative; }
.check::before { content: ""; position: absolute; inset: -8px; border-radius: 50%; border: 2px solid rgba(255,255,255,.22); animation: ring 1.6s ease-out infinite; }
@keyframes ring { 0% { transform: scale(.85); opacity: .8; } 100% { transform: scale(1.4); opacity: 0; } }
.check svg { width: 42px; height: 42px; stroke: #fff; fill: none; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 40; stroke-dashoffset: 40; animation: draw .5s ease .2s forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }

h2 { color: #fff; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 25px; letter-spacing: -.01em; }
p { color: #A9D2C6; font-size: 14px; font-weight: 500; margin-top: 6px; }

.panel { background: #fff; border-radius: 16px; width: 100%; max-width: 340px; margin-top: 24px; padding: 16px; box-shadow: 0 20px 40px -16px rgba(0,0,0,.45); text-align: left; }
.chips { display: flex; flex-wrap: wrap; gap: 7px; }
.chip { font-size: 12.5px; font-weight: 600; color: var(--ink-soft); background: var(--paper-2); border: 1px solid var(--line); padding: 6px 11px; border-radius: 10px; }
.rows { margin-top: 4px; }
.chips + .rows { margin-top: 12px; border-top: 1px dashed #d8d8d8; padding-top: 10px; }
.row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; font-size: 13.5px; }
.row .k { color: var(--muted); font-weight: 600; }
.row .v { font-family: "Bricolage Grotesque"; font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; }

.cta { margin-top: 26px; width: 100%; max-width: 340px; background: var(--amber); color: #3a2607; border: none; border-radius: 15px; padding: 15px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15.5px; cursor: pointer; }

/* Escritorio: card centrada sobre fondo atenuado */
@media (min-width: 768px) {
  .exito { background: rgba(10,40,33,.55); backdrop-filter: blur(6px); }
  .card { max-width: 440px; background: linear-gradient(160deg,var(--pine),var(--pine-deep)); border-radius: 28px; padding: 44px 32px 32px; box-shadow: 0 40px 80px -30px rgba(0,0,0,.6); }
}

.exito-fade-enter-active, .exito-fade-leave-active { transition: opacity .35s ease; }
.exito-fade-enter-from, .exito-fade-leave-to { opacity: 0; }
</style>
