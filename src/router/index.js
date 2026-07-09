import { createRouter, createWebHistory } from '@ionic/vue-router'
import { useAuthStore } from '@/stores/auth'

import LoginView from '@/views/LoginView.vue'
import TabsPage from '@/views/TabsPage.vue'
import PerfilView from '@/views/PerfilView.vue'

// Repartidor
import EntregasView from '@/views/repartidor/EntregasView.vue'
import EntregaView from '@/views/repartidor/EntregaView.vue'
import CargaView from '@/views/repartidor/CargaView.vue'
import CorteView from '@/views/repartidor/CorteView.vue'
import ReportarMermaView from '@/views/repartidor/ReportarMermaView.vue'
import AgregarCargaView from '@/views/repartidor/AgregarCargaView.vue'
import AutoventaView from '@/views/repartidor/AutoventaView.vue'

// Admin (shell + contenido)
import AdminShell from '@/views/admin/AdminShell.vue'
import ResumenView from '@/views/admin/ResumenView.vue'
import PedidosView from '@/views/admin/PedidosView.vue'
import PedidoEditorView from '@/views/admin/PedidoEditorView.vue'
import ProductosView from '@/views/admin/ProductosView.vue'
import ClientesView from '@/views/admin/ClientesView.vue'
import ClienteEditorView from '@/views/admin/ClienteEditorView.vue'
import HistorialView from '@/views/admin/HistorialView.vue'
import MermasView from '@/views/admin/MermasView.vue'
import RepartidoresView from '@/views/admin/RepartidoresView.vue'
import RepartidorEditorView from '@/views/admin/RepartidorEditorView.vue'
import CreditosView from '@/views/admin/CreditosView.vue'
import ProductoEditorView from '@/views/admin/ProductoEditorView.vue'
import ProveedoresView from '@/views/admin/ProveedoresView.vue'
import ProveedorEditorView from '@/views/admin/ProveedorEditorView.vue'
import GastosView from '@/views/admin/GastosView.vue'
import GastoEditorView from '@/views/admin/GastoEditorView.vue'
import ComprasView from '@/views/admin/ComprasView.vue'
import CompraEditorView from '@/views/admin/CompraEditorView.vue'
import ProyeccionesView from '@/views/admin/ProyeccionesView.vue'
import TransferenciasView from '@/views/admin/TransferenciasView.vue'
import CargasAutorizarView from '@/views/admin/CargasAutorizarView.vue'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: LoginView },

  // Repartidor: entrega a pantalla completa
  { path: '/entrega/:id', component: EntregaView, meta: { requiresAuth: true } },
  { path: '/merma', component: ReportarMermaView, meta: { requiresAuth: true } },
  { path: '/reabastecer', component: AgregarCargaView, meta: { requiresAuth: true } },
  { path: '/autoventa', component: AutoventaView, meta: { requiresAuth: true } },

  // Admin: todo bajo el shell con sidebar
  {
    path: '/panel',
    component: AdminShell,
    meta: { requiresAuth: true, rol: 'Admin' },
    children: [
      { path: '', redirect: '/panel/resumen' },
      { path: 'resumen', component: ResumenView },
      { path: 'pedidos', component: PedidosView },
      { path: 'pedido/:id', component: PedidoEditorView },
      { path: 'productos', component: ProductosView },
      { path: 'producto/:id', component: ProductoEditorView },
      { path: 'proveedores', component: ProveedoresView },
      { path: 'proveedor/:id', component: ProveedorEditorView },
      { path: 'clientes', component: ClientesView },
      { path: 'cliente/:id', component: ClienteEditorView },
      { path: 'historial', component: HistorialView },
      { path: 'mermas', component: MermasView },
      { path: 'creditos', component: CreditosView },
      { path: 'gastos', component: GastosView },
      { path: 'gasto/:id', component: GastoEditorView },
      { path: 'transferencias', component: TransferenciasView },
      { path: 'compras', component: ComprasView },
      { path: 'compra/:id', component: CompraEditorView },
      { path: 'proyecciones', component: ProyeccionesView },
      { path: 'cargas', component: CargasAutorizarView },
      { path: 'repartidores', component: RepartidoresView },
      { path: 'repartidor/:id', component: RepartidorEditorView }
    ]
  },

  // Repartidor: tabs
  {
    path: '/app',
    component: TabsPage,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/app/entregas' },
      { path: 'entregas', component: EntregasView },
      { path: 'inventario', component: CargaView },
      { path: 'corte', component: CorteView },
      { path: 'perfil', component: PerfilView }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.autenticado) return '/login'
  if (to.meta.rol && auth.rol !== to.meta.rol) return auth.rutaInicial()
  if (to.path === '/login' && auth.autenticado) return auth.rutaInicial()
  return true
})

export default router
