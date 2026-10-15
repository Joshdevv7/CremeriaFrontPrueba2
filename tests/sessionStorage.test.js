import test from 'node:test'
import assert from 'node:assert/strict'
import { createSessionStorage } from '../src/utils/sessionStorage.js'

function storage() {
  const values = new Map()
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
}

test('Android elimina sesiones antiguas y requiere otro acceso tras reiniciar', () => {
  const disk = storage()
  disk.setItem('token', 'legacy-token')
  disk.setItem('usuario', JSON.stringify({ id: 1 }))
  const session = createSessionStorage(disk, true)
  assert.equal(session.read().token, null)
  const usuario = { id: 2, rol: 'Repartidor' }
  session.save('new-token', usuario)
  assert.deepEqual(session.read(), { token: 'new-token', usuario })
  assert.equal(disk.getItem('token'), null)
  assert.equal(disk.getItem('usuario'), null)
  assert.deepEqual(createSessionStorage(disk, true).read(), { token: null, usuario: null })
  session.clear()
  assert.deepEqual(session.read(), { token: null, usuario: null })
})

test('la web conserva la sesión y cerrar sesión elimina los datos persistidos', () => {
  const disk = storage()
  const session = createSessionStorage(disk)
  session.save('web-token', { id: 3 })
  assert.equal(createSessionStorage(disk).read().token, 'web-token')
  session.clear()
  assert.deepEqual(createSessionStorage(disk).read(), { token: null, usuario: null })
})

test('una sesión web dañada vuelve a login sin impedir el arranque', () => {
  const disk = storage()
  disk.setItem('token', 'token')
  disk.setItem('usuario', '{broken')
  assert.deepEqual(createSessionStorage(disk).read(), { token: null, usuario: null })
  assert.equal(disk.getItem('token'), null)
})
