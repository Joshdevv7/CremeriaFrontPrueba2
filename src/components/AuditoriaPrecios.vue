<template>
  <details v-if="eventos?.length" class="auditoria-precios">
    <summary>Historial de precios especiales ({{ eventos.length }})</summary>
    <ol>
      <li v-for="evento in eventos" :key="evento.id">
        <strong>{{ evento.productoNombre }} · {{ evento.esCaja ? 'Caja' : 'Pieza' }}</strong>
        <p>{{ accion(evento) }} · {{ money(evento.precioAnterior) }} → {{ money(evento.precioNuevo) }}</p>
        <p>Precio original {{ money(evento.precioOriginal) }}</p>
        <p>{{ evento.usuarioNombre }} · {{ fecha(evento.fecha) }}</p>
        <p v-if="evento.motivo">{{ evento.motivo }}</p>
      </li>
    </ol>
  </details>
</template>

<script setup>
defineProps({ eventos: { type: Array, default: () => [] } })
const money = value => Number(value || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
const fecha = value => new Date(value).toLocaleString('es-MX')
const accion = evento => {
  if (evento.accion === 'LineaEliminada') return 'Línea retirada'
  return evento.precioEspecial ? 'Precio especial' : 'Precio original restablecido'
}
</script>

<style scoped>
.auditoria-precios { margin-top: 16px; padding: 12px; border: 1px solid var(--line); border-radius: 12px; background: var(--paper); color: var(--ink); font-size: 13px; }
summary { min-height: 44px; cursor: pointer; font-weight: 700; align-content: center; }
ol { margin: 0; padding-left: 20px; }
li { padding: 10px 0; overflow-wrap: anywhere; }
li + li { border-top: 1px solid var(--line); }
p { margin: 5px 0 0; line-height: 1.5; color: var(--ink-soft); }
</style>
