import { defineStore } from 'pinia'
import http from '@/api/http'

function parseJwt(token) {
  try {
    const base = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch { return {} }
}
function idDesdeToken(token) {
  const p = parseJwt(token)
  return Number(p.sub || p.nameid || p.nameidentifier || 0) || null
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    usuario: JSON.parse(localStorage.getItem('usuario') || 'null')
  }),
  getters: {
    autenticado: (s) => !!s.token,
    rol: (s) => s.usuario?.rol || null,
    usuarioId: (s) => s.usuario?.id || idDesdeToken(s.token),
    esAdmin: (s) => s.usuario?.rol === 'Admin',
    esRepartidor: (s) => s.usuario?.rol === 'Repartidor',
    esVendedor: (s) => s.usuario?.rol === 'Vendedor'
  },
  actions: {
    async login(email, password) {
      const { data } = await http.post('/auth/login', { email, password })
      this.token = data.token
      this.usuario = { id: idDesdeToken(data.token), nombre: data.nombre, rol: data.rol }
      localStorage.setItem('token', data.token)
      localStorage.setItem('usuario', JSON.stringify(this.usuario))
      return this.usuario
    },
    logout() {
      this.token = null
      this.usuario = null
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
    },
    rutaInicial() {
      if (this.esAdmin) return '/panel/resumen'
      if (this.esVendedor) return '/panel/ventas'
      return '/app/entregas'
    }
  }
})
