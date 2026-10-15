// Android sessions live only in memory: reopening the app requires a new login.
export function createSessionStorage(storage, memoryOnly = false) {
  let session = { token: null, usuario: null }
  if (memoryOnly) {
    storage.removeItem('token')
    storage.removeItem('usuario')
  }
  return {
    read() {
      if (memoryOnly) return { ...session }
      try {
        return { token: storage.getItem('token'), usuario: JSON.parse(storage.getItem('usuario') || 'null') }
      } catch {
        this.clear()
        return { token: null, usuario: null }
      }
    },
    save(token, usuario) {
      if (memoryOnly) session = { token, usuario }
      else {
        storage.setItem('token', token)
        storage.setItem('usuario', JSON.stringify(usuario))
      }
    },
    clear() {
      session = { token: null, usuario: null }
      storage.removeItem('token')
      storage.removeItem('usuario')
    }
  }
}
