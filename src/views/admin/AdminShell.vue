<template>
  <ion-page>
    <ion-content class="shell" :scroll-y="false">
      <div class="app">
        <!-- SIDEBAR -->
        <aside class="side" :class="{ open: navAbierto }">
          <div class="logo"><div class="mk">D</div><div class="nm">Distribuidora<small>Panel admin</small></div></div>
          <template v-for="g in grupos" :key="g.titulo">
            <div class="navlbl">{{ g.titulo }}</div>
            <a v-for="n in g.items" :key="n.path" class="nav-a" :class="{ on: activo(n) }" @click="ir(n.path)">
              <span v-html="n.icon"></span><span class="nav-txt">{{ n.label }}</span>
              <span v-if="n.badge === 'cargasPendientes' && cargasPendientes > 0" class="nav-badge">{{ cargasPendientes }}</span>
            </a>
          </template>
          <div class="spacer"></div>
          <div class="profile" @click="salir()" title="Cerrar sesión">
            <div class="av">{{ iniciales }}</div>
            <div class="who"><div class="n">{{ auth.usuario?.nombre }}</div><div class="r">Dueño</div></div>
          </div>
        </aside>
        <div class="scrim" :class="{ show: navAbierto }" @click="navAbierto = false"></div>

        <!-- MAIN -->
        <main class="main">
          <div class="top">
            <div class="top-l">
              <div class="hamb" @click="navAbierto = true"><svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg></div>
              <div>
                <button v-if="ctx.back" class="back" @click="router.replace(ctx.back)"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>
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
        <a v-for="n in navMovil" :key="n.path" :class="{ on: activo(n) }" @click="ir(n.path)">
          <span v-html="n.icon"></span>{{ n.label }}
        </a>
      </nav>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonPage, IonContent } from '@ionic/vue'
import { useAuthStore } from '@/stores/auth'
import CampanaNotif from '@/components/CampanaNotif.vue'
import http from '@/api/http'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const navAbierto = ref(false)
const cargasPendientes = ref(0)
async function contarCargasPendientes() {
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
  proyecciones: '<svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>'
}
const grupos = [
  { titulo: 'Inicio', items: [
    { path: '/panel/resumen', label: 'Resumen', icon: ICN.resumen, match: ['/panel/resumen'] }
  ] },
  { titulo: 'Ventas', items: [
    { path: '/panel/pedidos', label: 'Pedidos', icon: ICN.pedidos, match: ['/panel/pedidos', '/panel/pedido'] },
    { path: '/panel/clientes', label: 'Clientes', icon: ICN.clientes, match: ['/panel/clientes', '/panel/cliente'] },
    { path: '/panel/creditos', label: 'Créditos', icon: ICN.cred, match: ['/panel/creditos'] }
  ] },
  { titulo: 'Inventario y compras', items: [
    { path: '/panel/productos', label: 'Inventario', icon: ICN.inv, match: ['/panel/productos'] },
    { path: '/panel/compras', label: 'Compras', icon: ICN.compras, match: ['/panel/compras', '/panel/compra'] },
    { path: '/panel/proveedores', label: 'Proveedores', icon: ICN.prov, match: ['/panel/proveedores', '/panel/proveedor'] },
    { path: '/panel/mermas', label: 'Mermas', icon: ICN.merma, match: ['/panel/mermas'] }
  ] },
  { titulo: 'Equipo y ruta', items: [
    { path: '/panel/cargas', label: 'Cargas por autorizar', icon: ICN.cargas, match: ['/panel/cargas'], badge: 'cargasPendientes' },
    { path: '/panel/repartidores', label: 'Repartidores', icon: ICN.reps, match: ['/panel/repartidores', '/panel/repartidor'] },
    { path: '/panel/historial', label: 'Recorridos', icon: ICN.mapa, match: ['/panel/historial'] }
  ] },
  { titulo: 'Finanzas', items: [
    { path: '/panel/cortes', label: 'Cortes de caja', icon: ICN.cortes, match: ['/panel/cortes'] },
    { path: '/panel/deudas', label: 'Deudas repartidores', icon: ICN.deudas, match: ['/panel/deudas'] },
    { path: '/panel/gastos', label: 'Gastos', icon: ICN.gastos, match: ['/panel/gastos', '/panel/gasto'] },
    { path: '/panel/transferencias', label: 'Transferencias', icon: ICN.transferencias, match: ['/panel/transferencias'] },
    { path: '/panel/proyecciones', label: 'Proyecciones', icon: ICN.proyecciones, match: ['/panel/proyecciones'] }
  ] }
]
const itemsPlanos = grupos.flatMap((g) => g.items)
const navMovil = computed(() =>
  ['/panel/resumen', '/panel/pedidos', '/panel/productos', '/panel/creditos']
    .map((p) => itemsPlanos.find((i) => i.path === p))
    .filter(Boolean)
)

const ctx = reactive({ titulo: 'Resumen', sub: '', back: null, acciones: null })
function setCtx(c) { ctx.titulo = c.titulo ?? ''; ctx.sub = c.sub ?? ''; ctx.back = c.back ?? null; ctx.acciones = c.acciones ?? null }

const iniciales = computed(() => (auth.usuario?.nombre || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase())
function activo(n) { return n.match.some((m) => route.path.startsWith(m)) }
function ir(path) { navAbierto.value = false; if (route.path !== path) router.push(path) }
onMounted(contarCargasPendientes)
function salir() { if (confirm('¿Cerrar sesión?')) { auth.logout(); router.replace('/login') } }
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
</style>
