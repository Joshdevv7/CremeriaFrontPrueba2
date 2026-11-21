import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const source = (await readFile(new URL('../src/api/listarPaginas.js', import.meta.url), 'utf8'))
  .replace(/^import http[^\n]*\n/, '').replace('export async function', 'async function')

function cargar(get) {
  return vm.runInNewContext(`${source}\nlistarPaginas`, { http: { get } })
}

test('recorre páginas conservando filtros sin permitir tamaños inválidos', async () => {
  const llamadas = []
  const listar = cargar(async (ruta, { params }) => {
    llamadas.push({ ruta, params: { ...params } })
    return { data: { items: params.pagina === 1 ? [1, 2] : [3], total: 3, tamanoPagina: 2, pagina: params.pagina } }
  })
  const result = await listar('/proveedores', { incluirInactivos: true, buscar: 'Proveedor', tamano: 200, pagina: 99 })
  assert.deepEqual(Array.from(result), [1, 2, 3])
  assert.deepEqual(llamadas, [1, 2].map(pagina => ({ ruta: '/proveedores', params: { incluirInactivos: true, buscar: 'Proveedor', pagina, tamano: 100 } })))
})

test('mantiene llamadas existentes sin filtros', async () => {
  const listar = cargar(async (ruta, { params }) => {
    assert.equal(ruta, '/productos')
    assert.equal(params.pagina, 1)
    assert.equal(params.tamano, 100)
    return { data: { items: [], total: 0, tamanoPagina: 100, pagina: 1 } }
  })
  assert.equal((await listar('/productos')).length, 0)
})

test('mantiene la señal de cancelación en todas las páginas', async () => {
  const controller = new AbortController()
  const listar = cargar(async (ruta, { params, signal }) => {
    assert.equal(signal, controller.signal)
    return { data: { items: [params.pagina], total: 2, tamanoPagina: 1, pagina: params.pagina } }
  })
  assert.deepEqual(Array.from(await listar('/pedidos', {}, { signal: controller.signal })), [1, 2])
})

test('no presenta catálogo parcial si falla una página posterior', async () => {
  const listar = cargar(async (ruta, { params }) => {
    if (params.pagina === 2) throw new Error('Sin conexión')
    return { data: { items: [1], total: 2, tamanoPagina: 1, pagina: 1 } }
  })
  await assert.rejects(listar('/productos'), /Sin conexión/)
})
