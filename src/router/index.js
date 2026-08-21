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
import VendedoresView from '@/views/admin/VendedoresView.vue'
import VendedorEditorView from '@/views/admin/VendedorEditorView.vue'
import VentasView from '@/views/admin/VentasView.vue'
import MisVentasView from '@/views/admin/MisVentasView.vue'
import MiCorteView from '@/views/admin/MiCorteView.vue'
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
import CortesView from '@/views/admin/CortesView.vue'
import DeudasView from '@/views/admin/DeudasView.vue'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: LoginView },

  // Repartidor: entrega a pantalla completa
  { path: '/entrega/:id', component: EntregaView, meta: { requiresAuth: true } },
  { path: '/merma', component: ReportarMermaView, meta: { requiresAuth: true } },
  { path: '/reabastecer', component: AgregarCargaView, meta: { requiresAuth: true } },
  { path: '/autoventa', component: AutoventaView, meta: { requiresAuth: true } },

  // Admin: todo bajo el shell con sidebar. El vendedor entra al mismo shell pero con un
  // menú y rutas restringidas (mostrador: ventas, clientes, proveedores, compras).
  {
    path: '/panel',
    component: AdminShell,
    meta: { requiresAuth: true, rol: ['Admin', 'Vendedor'] },
    children: [
      { path: '', redirect: '/panel/resumen' },
      { path: 'resumen', component: ResumenView, meta: { rol: 'Admin' } },
      { path: 'ventas', component: VentasView }, // Admin y Vendedor
      { path: 'mis-ventas', component: MisVentasView, meta: { rol: 'Vendedor' } },
      { path: 'mi-corte', component: MiCorteView, meta: { rol: 'Vendedor' } },
      { path: 'pedidos', component: PedidosView, meta: { rol: 'Admin' } },
      { path: 'pedido/:id', component: PedidoEditorView, meta: { rol: 'Admin' } },
      { path: 'productos', component: ProductosView, meta: { rol: 'Admin' } },
      { path: 'producto/:id', component: ProductoEditorView, meta: { rol: 'Admin' } },
      { path: 'proveedores', component: ProveedoresView }, // Admin y Vendedor
      { path: 'proveedor/:id', component: ProveedorEditorView }, // Admin y Vendedor
      { path: 'clientes', component: ClientesView }, // Admin y Vendedor
      { path: 'cliente/:id', component: ClienteEditorView }, // Admin y Vendedor
      { path: 'historial', component: HistorialView, meta: { rol: 'Admin' } },
      { path: 'mermas', component: MermasView, meta: { rol: 'Admin' } },
      { path: 'creditos', component: CreditosView }, // Admin y Vendedor
      { path: 'gastos', component: GastosView, meta: { rol: 'Admin' } },
      { path: 'gasto/:id', component: GastoEditorView, meta: { rol: 'Admin' } },
      { path: 'transferencias', component: TransferenciasView, meta: { rol: 'Admin' } },
      { path: 'cortes', component: CortesView, meta: { rol: 'Admin' } },
      { path: 'deudas', component: DeudasView, meta: { rol: 'Admin' } },
      { path: 'compras', component: ComprasView }, // Admin y Vendedor
      { path: 'compra/:id', component: CompraEditorView }, // Admin y Vendedor
      { path: 'proyecciones', component: ProyeccionesView, meta: { rol: 'Admin' } },
      { path: 'cargas', component: CargasAutorizarView, meta: { rol: 'Admin' } },
      { path: 'repartidores', component: RepartidoresView, meta: { rol: 'Admin' } },
      { path: 'repartidor/:id', component: RepartidorEditorView, meta: { rol: 'Admin' } },
      { path: 'vendedores', component: VendedoresView, meta: { rol: 'Admin' } },
      { path: 'vendedor/:id', component: VendedorEditorView, meta: { rol: 'Admin' } }
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
      { path: 'perfil', component: PerfilView },
      { path: 'impresora', component: () => import('@/views/repartidor/ImpresoraView.vue') }
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
  if (to.meta.rol) {
    const permitidos = Array.isArray(to.meta.rol) ? to.meta.rol : [to.meta.rol]
    if (!permitidos.includes(auth.rol)) return auth.rutaInicial()
  }
  if (to.path === '/login' && auth.autenticado) return auth.rutaInicial()
  return true
})

export default router
