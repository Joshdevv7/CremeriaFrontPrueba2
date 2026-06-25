import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as signalR from '@microsoft/signalr'
import http from '@/api/http'

const HUB_URL = (import.meta.env.VITE_API_URL || 'http://localhost:54003/api').replace(/\/api\/?$/, '') + '/hubs/notificaciones'

export const useNotifStore = defineStore('notif', () => {
  const items = ref([])
  const noLeidas = ref(0)
  const toast = ref(null)
  let conn = null
  let toastTimer = null

  async function cargar() {
    try {
      const [lista, cont] = await Promise.all([
        http.get('/notificaciones'),
        http.get('/notificaciones/contador')
      ])
      items.value = lista.data
      noLeidas.value = cont.data
    } catch { /* sin conexión: se reintenta al reconectar */ }
  }

  function mostrarToast(n) {
    toast.value = n
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => { toast.value = null }, 5000)
  }

  async function conectar(token) {
    if (conn || !token) return
    conn = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .build()
    conn.on('notificacion', (n) => {
      items.value.unshift(n)
      noLeidas.value++
      mostrarToast(n)
    })
    try { await conn.start() } catch { /* el REST sigue funcionando aunque el hub falle */ }
    await limpiarViejas()   // autolimpieza de las +30 días al entrar
    await cargar()
  }

  async function desconectar() {
    try { await conn?.stop() } catch { /* noop */ }
    conn = null
    items.value = []
    noLeidas.value = 0
    toast.value = null
  }

  async function marcarLeida(n) {
    if (n.leida) return
    try {
      await http.post(`/notificaciones/${n.id}/leer`)
      n.leida = true
      noLeidas.value = Math.max(0, noLeidas.value - 1)
    } catch { /* noop */ }
  }

  async function marcarTodas() {
    try {
      await http.post('/notificaciones/leer-todas')
      items.value.forEach((n) => { n.leida = true })
      noLeidas.value = 0
    } catch { /* noop */ }
  }

  async function limpiarLeidas() {
    try {
      await http.delete('/notificaciones/leidas')
      items.value = items.value.filter((n) => !n.leida)
    } catch { /* noop */ }
  }

  async function limpiarTodas() {
    try {
      await http.delete('/notificaciones')
      items.value = []
      noLeidas.value = 0
    } catch { /* noop */ }
  }

  async function limpiarViejas() {
    try { await http.post('/notificaciones/limpiar-viejas', null, { params: { dias: 30 } }) } catch { /* noop */ }
  }

  return { items, noLeidas, toast, cargar, conectar, desconectar, marcarLeida, marcarTodas, limpiarLeidas, limpiarTodas, limpiarViejas }
})
