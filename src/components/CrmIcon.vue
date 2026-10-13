<template><svg viewBox="0 0 24 24" class="crm-icon" aria-hidden="true" focusable="false" v-html="paths[name] || paths.box"></svg></template>
<script setup>
defineProps({ name: { type: String, default: 'box' } })
const paths = {
  box: '<path d="m3 7 9-4 9 4v10l-9 4-9-4V7Z"/><path d="m3 7 9 5 9-5M12 12v9"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  filter: '<path d="M4 7h16M7 12h10M10 17h4"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  cash: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M5 12h.01M19 12h.01"/>',
  truck: '<path d="M3 5h11v11H3V5ZM14 9h4l3 4v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  nav: '<path d="m21 3-6 18-4-8-8-4L21 3Z"/>',
  phone: '<path d="M5 3h4l2 5-3 2a15 15 0 0 0 6 6l2-3 5 2v4c0 2-3 2-5 1C8 17 3 10 3 6c0-2 0-3 2-3Z"/>',
  message: '<path d="M21 11a9 9 0 0 1-13 8l-5 2 2-5a9 9 0 1 1 16-5Z"/><path d="M8 11h8M8 14h5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 8.5a2.5 2.5 0 1 1 3.8 2.1c-.9.6-1.3 1-1.3 2.4M12 17h.01"/>',
  alert: '<path d="m12 3 10 18H2L12 3ZM12 9v5M12 17h.01"/>',
  bag: '<path d="M5 7h14l1 14H4L5 7Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'
}
</script>
<style scoped>.crm-icon{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0}</style>
