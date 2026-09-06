import axios from 'axios'
import router from '@/router'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://localhost:58226/api'
})

// Agrega el token JWT en cada petición
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Si el token expira o es inválido, limpia y manda a login sin recargar la app
http.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      if (router.currentRoute?.value?.path !== '/login') {
        router.replace('/login')
      }
    }
    return Promise.reject(error)
  }
)

export default http
