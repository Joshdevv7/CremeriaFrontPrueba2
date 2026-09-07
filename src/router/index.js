import { createRouter, createWebHistory } from '@ionic/vue-router'
import { useAuthStore } from '@/stores/auth'

// Base
import LoginView from '@/views/LoginView.vue'
import TabsPage from '@/views/TabsPage.vue'
import AdminShell from '@/views/admin/AdminShell.vue'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: LoginView },

  // Repartidor: entrega a pantalla completa
  { path: '/entrega/:id', component: () => import('@/views/repartidor/EntregaView.vue'), meta: { requiresAuth: true } },
  { path: '/merma', component: () => import('@/views/repartidor/ReportarMermaView.vue'), meta: { requiresAuth: true } },
  { path: '/reabastecer', component: () => import('@/views/repartidor/AgregarCargaView.vue'), meta: { requiresAuth: true } },
  { path: '/autoventa', component: () => import('@/views/repartidor/AutoventaView.vue'), meta: { requiresAuth: true } },

  // Admin: todo bajo el shell con sidebar. El vendedor entra al mismo shell pero con un
  // menú y rutas restringidas (mostrador: ventas, clientes, proveedores, compras).
  {
    path: '/panel',
    component: AdminShell,
    meta: { requiresAuth: true, rol: ['Admin', 'Vendedor'] },
    children: [
      { path: '', redirect: '/panel/resumen' },
      { path: 'resumen', component: () => import('@/views/admin/ResumenView.vue'), meta: { rol: 'Admin' } },
      { path: 'ventas', component: () => import('@/views/admin/VentasView.vue') }, // Admin y Vendedor
      { path: 'mis-ventas', component: () => import('@/views/admin/MisVentasView.vue'), meta: { rol: ['Vendedor', 'Admin'] } },
      { path: 'mi-corte', component: () => import('@/views/admin/MiCorteView.vue'), meta: { rol: ['Vendedor', 'Admin'] } },
      { path: 'pedidos', component: () => import('@/views/admin/PedidosView.vue'), meta: { rol: 'Admin' } },
      { path: 'pedido/:id', component: () => import('@/views/admin/PedidoEditorView.vue'), meta: { rol: 'Admin' } },
      { path: 'productos', component: () => import('@/views/admin/ProductosView.vue'), meta: { rol: 'Admin' } },
      { path: 'producto/:id', component: () => import('@/views/admin/ProductoEditorView.vue'), meta: { rol: 'Admin' } },
      { path: 'proveedores', component: () => import('@/views/admin/ProveedoresView.vue') }, // Admin y Vendedor
      { path: 'proveedor/:id', component: () => import('@/views/admin/ProveedorEditorView.vue') }, // Admin y Vendedor
      { path: 'clientes', component: () => import('@/views/admin/ClientesView.vue') }, // Admin y Vendedor
      { path: 'cliente/:id', component: () => import('@/views/admin/ClienteEditorView.vue') }, // Admin y Vendedor
      { path: 'historial', component: () => import('@/views/admin/HistorialView.vue'), meta: { rol: 'Admin' } },
      { path: 'mermas', component: () => import('@/views/admin/MermasView.vue'), meta: { rol: 'Admin' } },
      { path: 'creditos', component: () => import('@/views/admin/CreditosView.vue') }, // Admin y Vendedor
      { path: 'deudas-clientes', component: () => import('@/views/admin/DeudasClientesView.vue') }, // Admin y Vendedor
      { path: 'gastos', component: () => import('@/views/admin/GastosView.vue'), meta: { rol: 'Admin' } },
      { path: 'gasto/:id', component: () => import('@/views/admin/GastoEditorView.vue'), meta: { rol: 'Admin' } },
      { path: 'transferencias', component: () => import('@/views/admin/TransferenciasView.vue'), meta: { rol: 'Admin' } },
      { path: 'cortes', component: () => import('@/views/admin/CortesView.vue'), meta: { rol: 'Admin' } },
      { path: 'deudas', component: () => import('@/views/admin/DeudasView.vue'), meta: { rol: 'Admin' } },
      { path: 'compras', component: () => import('@/views/admin/ComprasView.vue') }, // Admin y Vendedor
      { path: 'compra/:id', component: () => import('@/views/admin/CompraEditorView.vue') }, // Admin y Vendedor
      { path: 'proyecciones', component: () => import('@/views/admin/ProyeccionesView.vue'), meta: { rol: 'Admin' } },
      { path: 'cargas', component: () => import('@/views/admin/CargasAutorizarView.vue'), meta: { rol: 'Admin' } },
      { path: 'repartidores', component: () => import('@/views/admin/RepartidoresView.vue'), meta: { rol: 'Admin' } },
      { path: 'repartidor/:id', component: () => import('@/views/admin/RepartidorEditorView.vue'), meta: { rol: 'Admin' } },
      { path: 'vendedores', component: () => import('@/views/admin/VendedoresView.vue'), meta: { rol: 'Admin' } },
      { path: 'vendedor/:id', component: () => import('@/views/admin/VendedorEditorView.vue'), meta: { rol: 'Admin' } }
    ]
  },

  // Repartidor: tabs
  {
    path: '/app',
    component: TabsPage,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/app/entregas' },
      { path: 'entregas', component: () => import('@/views/repartidor/EntregasView.vue') },
      { path: 'inventario', component: () => import('@/views/repartidor/CargaView.vue') },
      { path: 'corte', component: () => import('@/views/repartidor/CorteView.vue') },
      { path: 'perfil', component: () => import('@/views/PerfilView.vue') },
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
