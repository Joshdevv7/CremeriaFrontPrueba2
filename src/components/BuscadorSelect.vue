<template>
  <div class="ss" ref="root">
    <button type="button" class="ss-btn" :class="{ open }" @click="toggle">
      <span :class="{ ph: !seleccionado }">{{ seleccionado ? seleccionado[labelKey] : placeholder }}</span>
      <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
    </button>
    <button v-if="seleccionado && limpiable" type="button" class="ss-clear" @click.stop="limpiar" title="Quitar filtro">
      <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>

    <div v-if="open" class="ss-pop">
      <div class="ss-search">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <input ref="inp" v-model="q" :placeholder="'Buscar ' + (nombre || '') + '…'" @keydown.esc="cerrar">
      </div>
      <div class="ss-list">
        <button v-if="incluirTodos" type="button" class="ss-item all" @click="elegir(null)">Todos</button>
        <button v-for="op in filtradas" :key="op[valueKey]" type="button" class="ss-item" :class="{ on: modelValue === op[valueKey] }" @click="elegir(op)">
          {{ op[labelKey] }}
        </button>
        <div v-if="!filtradas.length" class="ss-empty">Sin resultados</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  modelValue: { default: null },
  opciones: { type: Array, default: () => [] },
  labelKey: { type: String, default: 'nombre' },
  valueKey: { type: String, default: 'id' },
  placeholder: { type: String, default: 'Seleccionar' },
  nombre: { type: String, default: '' },       // "cliente", "repartidor"… para el placeholder de búsqueda
  incluirTodos: { type: Boolean, default: true },
  limpiable: { type: Boolean, default: true }
})
const emit = defineEmits(['update:modelValue'])

const root = ref(null), inp = ref(null)
const open = ref(false)
const q = ref('')

const seleccionado = computed(() => props.opciones.find((o) => o[props.valueKey] === props.modelValue) || null)
const filtradas = computed(() => {
  const t = q.value.trim().toLowerCase()
  if (!t) return props.opciones
  return props.opciones.filter((o) => String(o[props.labelKey] || '').toLowerCase().includes(t))
})

async function toggle() { open.value = !open.value; if (open.value) { await nextTick(); inp.value?.focus() } }
function cerrar() { open.value = false; q.value = '' }
function elegir(op) { emit('update:modelValue', op ? op[props.valueKey] : null); cerrar() }
function limpiar() { emit('update:modelValue', null) }

function fuera(e) { if (root.value && !root.value.contains(e.target)) cerrar() }
onMounted(() => document.addEventListener('click', fuera))
onBeforeUnmount(() => document.removeEventListener('click', fuera))
</script>

<style scoped>
.ss { position: relative; display: inline-flex; align-items: center; }
.ss-btn { display: flex; align-items: center; gap: 8px; min-width: 150px; border: 1px solid var(--line); background: var(--surface); border-radius: 11px; padding: 9px 12px; font-family: "Hanken Grotesk"; font-size: 13.5px; font-weight: 600; color: var(--ink); cursor: pointer; }
.ss-btn .ph { color: var(--muted); font-weight: 500; }
.ss-btn svg { width: 15px; height: 15px; stroke: var(--muted); fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; margin-left: auto; transition: transform .2s; }
.ss-btn.open svg { transform: rotate(180deg); }
.ss-clear { margin-left: 4px; width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--line); background: var(--paper); display: grid; place-items: center; cursor: pointer; flex: 0 0 auto; }
.ss-clear svg { width: 13px; height: 13px; stroke: var(--muted); fill: none; stroke-width: 2.4; stroke-linecap: round; }

.ss-pop { position: absolute; top: calc(100% + 6px); left: 0; z-index: 60; width: 240px; background: var(--surface); border: 1px solid var(--line); border-radius: 13px; box-shadow: 0 18px 40px -14px rgba(0,0,0,.28); overflow: hidden; }
.ss-search { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--line); }
.ss-search svg { width: 15px; height: 15px; stroke: var(--muted); fill: none; stroke-width: 2.2; stroke-linecap: round; flex: 0 0 auto; }
.ss-search input { border: none; background: transparent; outline: none; width: 100%; font-family: "Hanken Grotesk"; font-size: 13.5px; color: var(--ink); }
.ss-list { max-height: 240px; overflow-y: auto; padding: 5px; }
.ss-item { display: block; width: 100%; text-align: left; border: none; background: transparent; border-radius: 8px; padding: 9px 10px; font-family: "Hanken Grotesk"; font-size: 13.5px; font-weight: 600; color: var(--ink); cursor: pointer; }
.ss-item:hover { background: var(--paper); }
.ss-item.on { background: var(--pine-tint); color: var(--pine-deep); }
.ss-item.all { color: var(--muted); border-bottom: 1px solid var(--line); border-radius: 0; margin-bottom: 4px; }
.ss-empty { padding: 12px; text-align: center; color: var(--muted); font-size: 12.5px; }
</style>
