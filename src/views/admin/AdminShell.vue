<template>
  <ion-page>
    <ion-content class="shell" :scroll-y="false">
      <div class="app">
        <!-- SIDEBAR -->
        <aside id="admin-navigation" ref="navPanel" class="side" :class="{ open: navAbierto }" :role="navAbierto ? 'dialog' : undefined" :aria-modal="navAbierto ? 'true' : undefined" aria-label="Navegación de operaciones" @keydown.esc.stop="cerrarNav" @keydown.tab="mantenerFoco">
          <div class="logo"><BrandLogo :size="40" /><div class="nm">Productos Osuna<small>CRM de cremería</small></div><button ref="navClose" class="nav-close" aria-label="Cerrar menú" @click="cerrarNav">×</button></div>
          <nav aria-label="Menú principal" class="navigation-groups">
            <div class="navlbl">Espacio de trabajo</div>
            <template v-for="g in gruposVisibles" :key="g.titulo">
              <template v-if="g.titulo === 'Inicio'"><router-link v-for="n in g.items" :key="n.path" :to="n.path" class="nav-a" :class="{ on: activo(n) }" :aria-current="activo(n) ? 'page' : undefined" @click="cerrarNav"><span aria-hidden="true" v-html="n.icon"></span><span class="nav-txt">{{ n.label }}</span></router-link></template>
              <details v-else class="nav-group" :open="abiertos[g.titulo]" @toggle="abiertos[g.titulo] = $event.target.open"><summary><span aria-hidden="true" v-html="g.items[0].icon"></span>{{ g.titulo }}<span class="group-count" v-if="g.titulo === 'Rutas y equipo' && cargasPendientes">{{ cargasPendientes }}</span><svg class="group-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></summary><div class="nav-children"><router-link v-for="n in g.items" :key="n.path" :to="n.path" class="nav-a" :class="{ on: activo(n) }" :aria-current="activo(n) ? 'page' : undefined" @click="cerrarNav"><span class="nav-txt">{{ n.label }}</span><span v-if="n.badge === 'cargasPendientes' && cargasPendientes > 0" class="nav-badge">{{ cargasPendientes }}</span></router-link></div></details>
            </template>
          </nav>
          <div class="spacer"></div>
          <button class="profile" @click="salir()" aria-label="Cerrar sesión">
            <div class="av">{{ iniciales }}</div>
            <div class="who"><div class="n">{{ auth.usuario?.nombre }}</div><div class="r">{{ auth.esVendedor ? 'Vendedor' : 'Administrador' }}</div></div>
          </button>
        </aside>
        <div class="scrim" :class="{ show: navAbierto }" @click="cerrarNav" aria-hidden="true"></div>

        <!-- MAIN -->
        <main class="main" :inert="navAbierto ? true : undefined">
          <div class="top">
            <div class="top-l">
              <button ref="navTrigger" class="hamb" aria-label="Abrir menú" aria-controls="admin-navigation" :aria-expanded="navAbierto" @click="abrirNav"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button>
              <div>
                <button v-if="ctx.back" class="back" aria-label="Volver a la lista" @click="router.replace(ctx.back)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></button>
                <h1>{{ ctx.titulo || 'Panel' }}</h1>
                <div class="sub" v-if="ctx.sub">{{ ctx.sub }}</div>
              </div>
            </div>
            <div class="top-r">
              <CampanaNotif />
              <div v-if="ctx.acciones?.seg" class="seg">
                <button v-for="o in ctx.acciones.seg.opciones" :key="o.k" :class="{ on: ctx.acciones.seg.valor === o.k }" @click="ctx.acciones.seg.onSelect(o.k)">{{ o.t }}</button>
              </div>
              <button v-if="ctx.acciones?.boton" class="btn-primary" @click="router.push(ctx.acciones.boton.to)">
                <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>{{ ctx.acciones.boton.texto }}
              </button>
            </div>
          </div>

          <router-view v-slot="{ Component }">
            <component :is="Component" @ctx="setCtx" />
          </router-view>
        </main>
      </div>

      <!-- bottom nav (móvil) -->
      <nav class="botnav" v-if="!navAbierto">
        <router-link v-for="n in navMovil" :key="n.path" :to="n.path" :class="{ on: activo(n) }" :aria-current="activo(n) ? 'page' : undefined">
          <span v-html="n.icon"></span>{{ n.label }}
        </router-link>
      </nav>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonPage, IonContent } from '@ionic/vue'
import { useAuthStore } from '@/stores/auth'
import BrandLogo from '@/components/BrandLogo.vue'
import CampanaNotif from '@/components/CampanaNotif.vue'
import http from '@/api/http'
import { confirmar } from '@/composables/useConfirm'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const navAbierto = ref(false)
const navPanel = ref(null), navTrigger = ref(null), navClose = ref(null)
const abiertos = reactive({})
const mobileMenu = window.matchMedia('(max-width: 720px)')
async function abrirNav() { navAbierto.value = true; await nextTick(); navClose.value?.focus() }
function cerrarNav() { if (!navAbierto.value) return; navAbierto.value = false; nextTick(() => navTrigger.value?.focus()) }
function mantenerFoco(event) {
  if (!navAbierto.value) return
  const controls = [...navPanel.value.querySelectorAll('a[href],button,summary')].filter(el => el.getClientRects().length && !el.disabled)
  const first = controls[0], last = controls.at(-1)
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
}
function ajustarMenu(event) { if (!event.matches) cerrarNav() }
onMounted(() => mobileMenu.addEventListener('change', ajustarMenu))
onBeforeUnmount(() => mobileMenu.removeEventListener('change', ajustarMenu))
const cargasPendientes = ref(0)
async function contarCargasPendientes() {
  if (!auth.esAdmin) return
  try {
    const [cargas, reabs] = await Promise.all([
      http.get('/cargas', { params: { estado: 'PendienteAutorizacion', tamano: 1 } }),
      http.get('/cargas/reabastecimientos', { params: { estado: 'Pendiente', tamano: 1 } })
    ])
    const a = cargas.data.total ?? (cargas.data.items?.length || 0)
    const b = reabs.data.total ?? (reabs.data.items?.length || 0)
    cargasPendientes.value = a + b
  } catch { cargasPendientes.value = 0 }
}

const ICN = {
  resumen: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  pedidos: '<svg viewBox="0 0 24 24"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>',
  inv: '<svg viewBox="0 0 24 24"><path d="M21 8l-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/></svg>',
  clientes: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6"/></svg>',
  mapa: '<svg viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  prov: '<svg viewBox="0 0 24 24"><path d="M3 7h13l3 4v6h-3M3 7v10h3M3 12h13"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/></svg>',
  merma: '<svg viewBox="0 0 24 24"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>',
  reps: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><path d="M16 7.5a3 3 0 0 1 0 5.5M18 20c0-2.2-1-3.7-2.5-4.6"/></svg>',
  cred: '<svg viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19"/></svg>',
  gastos: '<svg viewBox="0 0 24 24"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  transferencias: '<svg viewBox="0 0 24 24"><path d="M4 9h16M4 15h16M8 5l-4 4 4 4M16 11l4 4-4 4"/></svg>',
  cargas: '<svg viewBox="0 0 24 24"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="18.5" cy="18.5" r="2"/></svg>',
  cortes: '<svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></svg>',
  deudas: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6"/><path d="M17 3l4 2-4 2"/></svg>',
  compras: '<svg viewBox="0 0 24 24"><path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L22 7H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>',
  proyecciones: '<svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>',
  ventas: '<svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>',
  misVentas: '<svg viewBox="0 0 24 24"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>',
  miCorte: '<svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></svg>'
}
// Cada item puede traer `rol` (lista de roles que lo ven); sin `rol` = visible para todos
// los que entran al shell (hoy Admin y Vendedor).
const grupos = [
  { titulo: 'Inicio', items: [
    { path: '/panel/resumen', label: 'Resumen', icon: ICN.resumen, match: ['/panel/resumen'], rol: ['Admin'] }
  ] },
  { titulo: 'Ventas', items: [
    { path: '/panel/ventas', label: 'Ventas', icon: ICN.ventas, match: ['/panel/ventas'] },
    { path: '/panel/mis-ventas', label: 'Mis ventas', icon: ICN.misVentas, match: ['/panel/mis-ventas'], rol: ['Vendedor', 'Admin'] },
    { path: '/panel/mi-corte', label: 'Mi corte', icon: ICN.miCorte, match: ['/panel/mi-corte'], rol: ['Vendedor', 'Admin'] },
    { path: '/panel/pedidos', label: 'Pedidos', icon: ICN.pedidos, match: ['/panel/pedidos', '/panel/pedido'], rol: ['Admin'] },
    { path: '/panel/clientes', label: 'Clientes', icon: ICN.clientes, match: ['/panel/clientes', '/panel/cliente'] },
    { path: '/panel/creditos', label: 'Créditos', icon: ICN.cred, match: ['/panel/creditos'] },
    { path: '/panel/deudas-clientes', label: 'Deudas de clientes', icon: ICN.deudas, match: ['/panel/deudas-clientes'] }
  ] },
  { titulo: 'Inventario y compras', items: [
    { path: '/panel/productos', label: 'Inventario', icon: ICN.inv, match: ['/panel/productos'], rol: ['Admin'] },
    { path: '/panel/compras', label: 'Compras', icon: ICN.compras, match: ['/panel/compras', '/panel/compra'] },
    { path: '/panel/proveedores', label: 'Proveedores', icon: ICN.prov, match: ['/panel/proveedores', '/panel/proveedor'] },
    { path: '/panel/mermas', label: 'Mermas', icon: ICN.merma, match: ['/panel/mermas'], rol: ['Admin'] }
  ] },
  { titulo: 'Equipo y ruta', items: [
    { path: '/panel/cargas', label: 'Cargas por autorizar', icon: ICN.cargas, match: ['/panel/cargas'], badge: 'cargasPendientes', rol: ['Admin'] },
    { path: '/panel/repartidores', label: 'Repartidores', icon: ICN.reps, match: ['/panel/repartidores', '/panel/repartidor'], rol: ['Admin'] },
    { path: '/panel/vendedores', label: 'Vendedores', icon: ICN.reps, match: ['/panel/vendedores', '/panel/vendedor'], rol: ['Admin'] },
    { path: '/panel/historial', label: 'Recorridos', icon: ICN.mapa, match: ['/panel/historial'], rol: ['Admin'] }
  ] },
  { titulo: 'Finanzas', items: [
    { path: '/panel/cortes', label: 'Cortes de caja', icon: ICN.cortes, match: ['/panel/cortes'], rol: ['Admin'] },
    { path: '/panel/deudas', label: 'Deudas repartidores', icon: ICN.deudas, match: ['/panel/deudas', '/panel/deudas-repartidores'], rol: ['Admin'] },
    { path: '/panel/gastos', label: 'Gastos', icon: ICN.gastos, match: ['/panel/gastos', '/panel/gasto'], rol: ['Admin'] },
    { path: '/panel/transferencias', label: 'Transferencias', icon: ICN.transferencias, match: ['/panel/transferencias'], rol: ['Admin'] },
    { path: '/panel/proyecciones', label: 'Proyecciones', icon: ICN.proyecciones, match: ['/panel/proyecciones'], rol: ['Admin'] }
  ] }
]
const gruposNavegacion = grupos.flatMap((g) => {
  if (g.titulo === 'Ventas') {
    const clientes = ['/panel/clientes', '/panel/creditos', '/panel/deudas-clientes']
    const orden = ['/panel/ventas', '/panel/pedidos', '/panel/mis-ventas', '/panel/mi-corte']
    return [
      { ...g, items: g.items.filter(i => !clientes.includes(i.path)).sort((a,b) => orden.indexOf(a.path) - orden.indexOf(b.path)) },
      { titulo: 'Clientes', items: g.items.filter(i => clientes.includes(i.path)) }
    ]
  }
  return [{ ...g, titulo: g.titulo === 'Equipo y ruta' ? 'Rutas y equipo' : g.titulo }]
})
const gruposVisibles = computed(() =>
  gruposNavegacion
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.rol || i.rol.includes(auth.rol)) }))
    .filter((g) => g.items.length > 0)
)
watch(() => route.path, () => {
  gruposVisibles.value.forEach(g => { if (g.items.some(activo)) abiertos[g.titulo] = true })
  if (navAbierto.value) cerrarNav()
}, { immediate: true })
const itemsPlanos = grupos.flatMap((g) => g.items)
const navMovil = computed(() => {
  const base = auth.esVendedor
    ? ['/panel/ventas', '/panel/mis-ventas', '/panel/mi-corte', '/panel/compras']
    : ['/panel/resumen', '/panel/pedidos', '/panel/productos', '/panel/creditos']
  return base.map((p) => itemsPlanos.find((i) => i.path === p)).filter(Boolean)
})

const ctx = reactive({ titulo: 'Resumen', sub: '', back: null, acciones: null })
function setCtx(c) { ctx.titulo = c.titulo ?? ''; ctx.sub = c.sub ?? ''; ctx.back = c.back ?? null; ctx.acciones = c.acciones ?? null }

const iniciales = computed(() => (auth.usuario?.nombre || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase())
function activo(n) { return n.match.some((m) => route.path === m || route.path.startsWith(m + '/')) }
onMounted(contarCargasPendientes)
async function salir() { if (await confirmar({ titulo: 'Cerrar sesión', mensaje: '¿Quieres salir de tu sesión?', textoConfirmar: 'Cerrar sesión' })) { auth.logout(); router.replace('/login') } }
</script>

<style scoped>
.shell { --background: radial-gradient(1100px 600px at 90% -10%, #EAE2D1, transparent 55%), var(--paper); }
.app { display: flex; height: 100%; }

.side { width: 248px; flex: 0 0 auto; padding: 22px 16px; display: flex; flex-direction: column; gap: 6px; border-right: 1px solid var(--line); background: rgba(255,253,248,.5); height: 100%; transition: width .2s; overflow-y: auto; }
.logo { display: flex; align-items: center; gap: 11px; padding: 6px 8px 20px; }
.logo .mk { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(150deg,var(--pine),var(--pine-deep)); display: grid; place-items: center; color: #fff; font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 21px; box-shadow: 0 6px 14px -6px rgba(14,92,74,.7); flex: 0 0 auto; }
.logo .nm { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 16px; letter-spacing: -.01em; line-height: 1.1; }
.logo .nm small { display: block; font-size: 11px; color: var(--muted); font-weight: 600; font-family: "Hanken Grotesk"; }
.navlbl { font-size: 10.5px; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; color: var(--muted); padding: 14px 10px 6px; }
.nav-a { display: flex; align-items: center; gap: 12px; padding: 11px 12px; border-radius: 12px; color: var(--ink-soft); font-weight: 600; font-size: 14px; cursor: pointer; transition: .15s; white-space: nowrap; }
.nav-a :deep(svg) { width: 20px; height: 20px; stroke: currentColor; fill: none; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; flex: 0 0 auto; }
.nav-a:hover { background: var(--paper-2); }
.nav-a.on { background: var(--pine); color: #fff; box-shadow: 0 8px 16px -8px rgba(14,92,74,.6); }
.spacer { flex: 1; min-height: 10px; }
.profile { display: flex; align-items: center; gap: 11px; padding: 10px; border-radius: 13px; border: 1px solid var(--line); background: var(--surface); cursor: pointer; }
.profile .av { width: 36px; height: 36px; border-radius: 10px; background: var(--amber-soft); display: grid; place-items: center; color: #B9781F; font-weight: 700; font-size: 14px; flex: 0 0 auto; }
.profile .who { min-width: 0; }
.profile .who .n { font-weight: 700; font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.profile .who .r { font-size: 11.5px; color: var(--muted); font-weight: 600; }

.main { flex: 1; min-width: 0; padding: 26px 30px 40px; overflow: auto; }
.top { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
.top-l { display: flex; align-items: center; gap: 12px; }
.top h1 { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 27px; letter-spacing: -.02em; display: inline; }
.top .sub { font-size: 13.5px; color: var(--muted); font-weight: 600; margin-top: 3px; }
.top .back { background: none; border: none; cursor: pointer; padding: 0 8px 0 0; vertical-align: middle; }
.top .back svg { width: 22px; height: 22px; stroke: var(--ink); fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.top-r { display: flex; align-items: center; gap: 12px; }
.seg { display: flex; background: var(--paper-2); border: 1px solid var(--line); border-radius: 12px; padding: 4px; }
.seg button { border: none; background: transparent; font-family: "Hanken Grotesk"; font-weight: 700; font-size: 13px; color: var(--muted); padding: 8px 15px; border-radius: 9px; cursor: pointer; transition: .15s; }
.seg button.on { background: var(--surface); color: var(--ink); box-shadow: 0 2px 6px rgba(0,0,0,.08); }
.btn-primary { display: flex; align-items: center; gap: 8px; background: var(--ink); color: #fff; border: none; border-radius: 12px; padding: 11px 16px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 13.5px; cursor: pointer; box-shadow: 0 10px 20px -12px rgba(21,42,36,.7); white-space: nowrap; }
.btn-primary svg { width: 17px; height: 17px; stroke: #fff; fill: none; stroke-width: 2.4; stroke-linecap: round; }
.hamb { display: none; width: 42px; height: 42px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); place-items: center; cursor: pointer; }
.hamb svg { width: 22px; height: 22px; stroke: var(--ink); fill: none; stroke-width: 2.2; stroke-linecap: round; }

.botnav { display: none; position: fixed; left: 12px; right: 12px; bottom: 12px; height: 64px; background: rgba(255,253,248,.92); backdrop-filter: blur(16px); border: 1px solid var(--line); border-radius: 20px; align-items: center; justify-content: space-around; box-shadow: 0 14px 30px -14px rgba(21,42,36,.4); z-index: 60; }
.botnav a { display: flex; flex-direction: column; align-items: center; gap: 3px; color: var(--muted); font-size: 10px; font-weight: 600; cursor: pointer; }
.botnav a :deep(svg) { width: 22px; height: 22px; stroke: currentColor; fill: none; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
.botnav a.on { color: var(--pine); }
.botnav.oculta { display: none !important; }
.scrim { display: none; position: fixed; inset: 0; background: rgba(21,42,36,.4); z-index: 40; }

@media (max-width: 1024px) {
  .side { width: 74px; padding: 22px 12px; }
  .side .logo .nm, .side .navlbl, .side .nav-a span:last-child, .side .profile .who { display: none; }
  .side .nav-a { justify-content: center; padding: 12px; }
  .side .profile { justify-content: center; padding: 8px; }
}
@media (max-width: 720px) {
  .side { display: none; }
  .main { padding: 18px 16px 96px; }
  .hamb { display: grid; }
  .top h1 { font-size: 22px; }
  .botnav { display: flex; }
  .side.open { display: flex; position: fixed; left: 0; top: 0; z-index: 50; width: 248px; padding: 22px 16px; background: var(--surface); }
  .side.open .logo .nm, .side.open .navlbl, .side.open .nav-a span:last-child, .side.open .profile .who { display: block; }
  .side.open .nav-a { justify-content: flex-start; padding: 11px 12px; }
  .scrim.show { display: block; }
}
.nav-a { position: relative; }
.nav-txt { flex: 1; }
.nav-badge { background: var(--clay); color: #fff; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 11px; min-width: 20px; height: 20px; border-radius: 999px; display: grid; place-items: center; padding: 0 6px; flex: 0 0 auto; }
.nav-a.on .nav-badge { background: #fff; color: var(--pine); }
.side{width:238px;padding:25px 17px;background:var(--surface);gap:22px}.logo{padding-bottom:4px}.logo .nm small{font-size:11px;color:var(--ink-soft)}.logo .mk{background:var(--pine);box-shadow:none}.navigation-groups{display:flex;flex-direction:column;gap:7px}.navigation-groups .navlbl{font-size:10px;color:var(--ink-soft);padding-bottom:8px}.nav-a{text-decoration:none;font-size:13px;min-height:44px}.nav-group summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;border-radius:10px;min-height:46px;padding:11px 12px;color:var(--ink-soft);font-weight:700;font-size:13px}.nav-group summary::-webkit-details-marker{display:none}.nav-group summary :deep(svg){width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.nav-group summary .group-chevron{width:14px;height:14px;margin-left:auto;fill:none;stroke:currentColor;stroke-width:2}.nav-group[open]>summary{background:var(--pine-tint);color:var(--pine)}.nav-children{border-left:1px solid #CADDD3;margin:7px 0 9px 22px;padding-left:10px;display:flex;flex-direction:column;gap:3px}.nav-children .nav-a{padding:9px 11px;font-size:12px;min-height:38px}.group-count{font-size:10px;padding:2px 5px;background:var(--amber-soft);border-radius:5px;color:#754C0F}.profile{width:100%;font:inherit;text-align:left}.profile .who .r{color:var(--ink-soft)}.nav-close{display:none;background:none;border:0;color:var(--pine);font-size:25px;width:44px;height:44px;flex:none;margin-left:auto;cursor:pointer}.main{padding:30px 32px 40px}.top h1{font-size:32px}.top .sub{color:var(--ink-soft);font-weight:500;font-size:13px;margin-top:6px}.btn-primary{background:var(--pine);min-height:44px;box-shadow:none}.side :focus-visible,.top :focus-visible,.botnav :focus-visible{outline:3px solid var(--sky);outline-offset:3px}
@media(max-width:1024px){.side{width:214px;padding:20px 13px}.side .logo .nm,.side .navlbl,.side .nav-a .nav-txt,.side .profile .who{display:block}.side .nav-a{justify-content:flex-start}.side .profile{justify-content:flex-start}.main{padding-inline:22px}.nav-badge{display:grid!important}}
@media(max-width:720px){.side{display:none}.side.open{width:min(290px,calc(100vw - 30px));padding:20px 17px}.side.open .nav-close{display:block}.side.open .nav-a{min-height:44px}.main{padding:20px 16px 100px}.top h1{font-size:27px}.top .sub{max-width:245px;font-size:12px}.botnav a{min-height:44px;min-width:50px;color:var(--ink-soft)}.profile{min-height:50px}.hamb{flex:none}}
.side,.main{font-family:"Hanken Grotesk",system-ui,sans-serif}.logo .mk,.logo .nm,.top h1,.btn-primary{font-family:"Bricolage Grotesque",system-ui,sans-serif}
.hamb{width:44px;height:44px}.top-r :deep(.bell){width:44px;height:44px}
</style>
