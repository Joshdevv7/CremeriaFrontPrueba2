<template><svg viewBox="0 0 24 24" class="crm-icon" aria-hidden="true" focusable="false" v-html="paths[name] || paths.box"></svg></template>
<script setup>
defineProps({ name: { type: String, default: 'box' } })
const paths = {
  box: '<path d="m3 7 9-4 9 4v10l-9 4-9-4V7Z"/><path d="m3 7 9 5 9-5M12 12v9"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  filter: '<path d="M4 7h16M7 12h10M10 17h4"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  'arrow-up': '<path d="M12 20V4m-6 6 6-6 6 6"/>',
  'arrow-down': '<path d="M12 4v16m-6-6 6 6 6-6"/>',
  'chevron-up': '<path d="m6 15 6-6 6 6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 14 6M18 18a8 8 0 0 1-14-6"/>',
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
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  bulb: '<path d="M9 18h6M10 21h4M8.6 14.7a6 6 0 1 1 6.8 0c-.9.6-1.4 1.5-1.4 2.3h-4c0-.8-.5-1.7-1.4-2.3Z"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M17 15a5 5 0 0 1 4 4v2"/>',
  store: '<path d="M3 10h18l-2-7H5l-2 7ZM4 10v11h16V10M9 21v-7h6v7M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/>',
  cart: '<path d="M2 3h3l3 12h11l3-9H6M9 19h.01M18 19h.01"/><circle cx="9" cy="19" r="1"/><circle cx="18" cy="19" r="1"/>',
  smartphone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 5h4M12 18h.01"/>',
  success: '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
  celebrate: '<path d="m3 21 4-13 9 9-13 4ZM10 3l2 2M18 2l-1 4M22 10l-4 1M16 7l3-3M7 15l3 3"/>',
  alert: '<path d="m12 3 10 18H2L12 3ZM12 9v5M12 17h.01"/>',
  bag: '<path d="M5 7h14l1 14H4L5 7Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'
}
</script>
<style scoped>.crm-icon{display:inline-block;width:20px;height:20px;vertical-align:middle;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0}</style>
