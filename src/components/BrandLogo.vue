<template>
  <img class="brand-logo" :src="logo" alt="Productos Osuna" :width="size" :height="size" decoding="async" />
</template>

<script setup>
import logo from '@/assets/productos-osuna.png'
defineProps({ size: { type: Number, default: 48 } })
</script>

<style scoped>
.brand-logo { display: block; flex: 0 0 auto; object-fit: contain; background: #fff; border-radius: 12px; }
</style>
