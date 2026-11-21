import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse, compileScript } from '@vue/compiler-sfc'
import * as vue from 'vue'
import * as busqueda from '../src/composables/useBusqueda.js'
import * as compra from '../src/utils/compra.js'

// Execute the real SFC setup with Vue reactivity; only app routing and network
// boundaries are replaced. This catches UI state transitions and posted costs.
const source = readFileSync(new URL('../src/views/admin/CompraEditorView.vue', import.meta.url), 'utf8')
const compiled = compileScript(parse(source).descriptor, { id: 'compra-regression' }).content

function editor(t, overrides = {}) {
  const posts = []
  const imports = {
    '@/composables/useBusqueda': busqueda,
    '@/utils/compra': compra,
    vue: { ...vue, onMounted() {} },
    'vue-router': { useRoute: () => ({ query: {} }), useRouter: () => ({ replace() {} }) },
    '@/api/http': { default: { async post(url, payload) { posts.push({ url, payload }) } } },
    '@/api/listarPaginas': { listarPaginas: async () => [] },
    '@/components/ExitoOverlay.vue': { default: {} },
    '@/components/BarcodeScanner.vue': { default: {} }
  }
  const bindings = {}
  const code = compiled.replace(/^import (.+) from ['"](.+)['"]$/gm, (_, names, path) => {
    if (names.startsWith('{')) {
      for (const name of names.slice(1, -1).split(',').map(x => x.trim())) bindings[name] = imports[path][name]
    } else bindings[names] = imports[path].default
    return ''
  }).replace('export default', 'return')
  const component = new Function(...Object.keys(bindings), 'setTimeout', code)(...Object.values(bindings), () => 0)
  const scope = vue.effectScope()
  const state = scope.run(() => component.setup({}, { expose() {}, emit() {} }))
  t.after(() => scope.stop())
  state.productos.value = [{ id: 1, nombre: 'AZÚCAR', unidad: 'Pieza', costoPromedio: 200, stockAlmacen: 30, vendePorCaja: true, piezasPorCaja: 10, codigoBarras: '7501234567890', precioCajaVenta: 9999, ...overrides }]
  state.proveedores.value = [{ id: 1, nombre: 'Proveedor' }]
  state.proveedorId.value = 1
  return { state, posts }
}

test('siete cajas de diez unidades a costo base 200 totalizan 14000 y envían costo por caja 2000', async t => {
  const { state: s, posts } = editor(t)
  s.setCant(1, 7)
  assert.equal(s.total.value, 1400)
  s.setUnidad(1, 'caja')
  assert.equal(s.costo[1], 2000)
  assert.equal(s.total.value, 14000)
  assert.equal(s.piezasLinea(s.productos.value[0]), 70)
  assert.equal(s.calcNuevoCpp(s.productos.value[0]), 200)
  await s.registrar()
  assert.deepEqual(posts[0].payload.lineas, [{ productoId: 1, cantidad: 7, costoUnitario: 2000, esCaja: true }])
})

test('seleccionar caja antes de capturar cantidad o escanear usa el mismo costo por presentación', async t => {
  const { state: s } = editor(t)
  s.setUnidad(1, 'caja')
  await s.onScan('7501234567890')
  assert.equal(s.costo[1], 2000)
  assert.equal(s.total.value, 2000)
  s.costo[1] = 1875.125
  s.dec(1)
  await s.onScan('7501234567890')
  assert.equal(s.costo[1], 1875.125)
})

test('cambiar presentación convierte costo manual sin perderlo al pulsar el botón activo', t => {
  const { state: s } = editor(t)
  s.inc(1)
  s.costo[1] = 123.45678901
  s.setUnidad(1, 'pza')
  assert.equal(s.costo[1], 123.45678901)
  s.setUnidad(1, 'caja')
  assert.equal(s.costo[1], 1234.5678901)
  s.setUnidad(1, 'pza')
  assert.equal(s.costo[1], 123.45678901)
})

test('un costo manual por caja conserva sus ocho decimales al alternar una presentación de tres unidades', t => {
  const { state: s } = editor(t, { piezasPorCaja: 3 })
  s.inc(1)
  s.setUnidad(1, 'caja')
  s.costo[1] = 100.12345678
  s.setUnidad(1, 'pza')
  assert.equal(s.costo[1], 33.37448559)
  s.setUnidad(1, 'caja')
  assert.equal(s.costo[1], 100.12345678)
})

test('costos faltantes, cero, negativos o inválidos impiden registrar la compra', async t => {
  const { state: s, posts } = editor(t, { costoPromedio: 0 })
  s.inc(1)
  for (const value of [s.costo[1], '', 0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.123456789]) {
    s.costo[1] = value
    assert.equal(Boolean(s.puede.value), false, `costo ${value}`)
    await s.registrar()
  }
  assert.equal(posts.length, 0)
  s.costo[1] = 12.34567891
  assert.equal(Boolean(s.puede.value), true)
})

test('producto sin costo no toma precio de venta ni revive costo borrado al cambiar presentación', t => {
  const { state: s } = editor(t, { costoPromedio: 0, precio: 300, precioCajaVenta: 2500 })
  s.inc(1)
  assert.equal(s.costo[1], '')
  s.costo[1] = ''
  s.setUnidad(1, 'caja')
  assert.equal(s.costo[1], '')
  assert.equal(Boolean(s.puede.value), false)
})

test('las etiquetas expresan la unidad base del catálogo incluso para cajas con factor diez', () => {
  assert.deepEqual(compra.unidadBaseCompra({ unidad: 'Pieza' }), { singular: 'pieza', plural: 'piezas' })
  assert.deepEqual(compra.unidadBaseCompra({ unidad: 'Peso' }), { singular: 'kg', plural: 'kg' })
  assert.deepEqual(compra.unidadBaseCompra({ unidad: 'Caja' }), { singular: 'caja', plural: 'cajas' })
})

test('la presentación solo multiplica el factor de cajas válidas', () => {
  assert.equal(compra.factorCompra({ vendePorCaja: true, piezasPorCaja: 10 }, 'caja'), 10)
  assert.equal(compra.factorCompra({ vendePorCaja: true, piezasPorCaja: 10 }, 'pza'), 1)
  assert.equal(compra.factorCompra({ vendePorCaja: false, piezasPorCaja: 10 }, 'caja'), 1)
  assert.equal(compra.factorCompra({ vendePorCaja: true, piezasPorCaja: 0 }, 'caja'), 1)
})

test('base Caja y presentación factor diez conservan stock base y resumen en cajas', t => {
  const { state: s } = editor(t, { unidad: 'Caja' })
  s.setCant(1, 7)
  s.setUnidad(1, 'caja')
  assert.equal(s.piezasLinea(s.productos.value[0]), 70)
  assert.equal(s.resumenUnidadesIngresadas.value, '70 cajas')
  assert.equal(s.total.value, 14000)
})

test('AZUCAR configurada Caja cuesta 200 por caja completa: siete cajas base cuestan 1400', async t => {
  const { state: s, posts } = editor(t, { unidad: 'Caja', stockAlmacen: 0 })
  s.setCant(1, 7)
  assert.equal(s.costo[1], 200)
  assert.equal(s.total.value, 1400)
  assert.equal(s.resumenUnidadesIngresadas.value, '7 cajas')
  await s.registrar()
  assert.deepEqual(posts[0].payload.lineas, [{ productoId: 1, cantidad: 7, costoUnitario: 200, esCaja: false }])
})

test('compra por peso conserva cantidad decimal, costo base y CPP ponderado', async t => {
  const { state: s, posts } = editor(t, { unidad: 'Peso', vendePorCaja: false, costoPromedio: 20, stockAlmacen: 3 })
  s.setCant(1, '1.125')
  s.costo[1] = 30
  assert.equal(s.total.value, 33.75)
  assert.equal(s.resumenUnidadesIngresadas.value, '1.125 kg')
  assert.equal(s.calcNuevoCpp(s.productos.value[0]), 22.7273)
  await s.registrar()
  assert.deepEqual(posts[0].payload.lineas, [{ productoId: 1, cantidad: 1.125, costoUnitario: 30, esCaja: false }])
})

test('la multiplicación por tres envía ocho decimales sin residuos binarios', async t => {
  const { state: s, posts } = editor(t, { piezasPorCaja: 3, costoPromedio: 1.23456789 })
  s.inc(1)
  s.setUnidad(1, 'caja')
  assert.equal(s.costo[1], 3.70370367)
  assert.equal(s.total.value, 3.70)
  assert.equal(s.calcNuevoCpp(s.productos.value[0]), 1.2345)
  assert.equal(Boolean(s.puede.value), true)
  await s.registrar()
  assert.equal(posts[0].payload.lineas[0].costoUnitario, 3.70370367)
})

test('totaliza dos líneas de peso con redondeo bancario por línea igual que el servidor', async t => {
  const { state: s } = editor(t, { unidad: 'Peso', vendePorCaja: false, costoPromedio: 15.5, stockAlmacen: 0 })
  s.productos.value.push({ ...s.productos.value[0], id: 2, nombre: 'Segundo producto' })
  s.setCant(1, 1.25)
  s.setCant(2, 1.25)
  assert.equal(s.total.value, 38.76)
  assert.equal(s.calcNuevoCpp(s.productos.value[0]), 15.504)
  await s.registrar()
  assert.equal(s.exitoDet.value.find(x => x.k === 'Total factura').v, '$38.76')
})

test('los empates de medio centavo redondean al centavo par sin residuos binarios', t => {
  const { state: s } = editor(t, { stockAlmacen: 0 })
  s.setCant(1, 1)
  for (const [costo, total] of [[0.005, 0], [0.015, 0.02], [1.005, 1], [1.015, 1.02], [1.025, 1.02]]) {
    s.costo[1] = costo
    assert.equal(s.total.value, total, `costo ${costo}`)
    assert.equal(s.calcNuevoCpp(s.productos.value[0]), total, `CPP costo ${costo}`)
  }
})

test('CPP ponderado usa subtotal redondeado y cuatro decimales con empate al par', t => {
  const { state: s } = editor(t, { unidad: 'Peso', stockAlmacen: 2, costoPromedio: 10 })
  s.setCant(1, 1.25)
  s.costo[1] = 15.5
  assert.equal(s.calcNuevoCpp(s.productos.value[0]), 12.1169)
  s.productos.value[0].stockAlmacen = 0
  s.setCant(1, 200)
  s.costo[1] = 0.01225
  assert.equal(s.total.value, 2.45)
  assert.equal(s.calcNuevoCpp(s.productos.value[0]), 0.0122)
})
