<template>
  <div class="editor-wrap">
    <p v-if="cargando" class="muted">Cargando datos del proveedor…</p>
    <template v-else>
      <div class="form-cols" v-show="!exito">
        <!-- Columna Datos -->
        <div class="col-form">
          <div class="field">
            <div class="fl">Nombre comercial *</div>
            <input class="inp" v-model="form.nombre" placeholder="Ej. Lácteos del Valle">
          </div>

          <div class="field">
            <div class="fl">WhatsApp <span class="op">(para enviar pedidos de reorden)</span></div>
            <div class="inp-wa-wrap">
              <span class="wa-ico">📱</span>
              <input class="inp inp-wa" v-model="form.whatsapp" placeholder="Ej. 526671234567" inputmode="tel" maxlength="15" @input="filtrarWa">
            </div>
            <small class="hint">Incluye la clave de país (ej. 52 para México). Este número se usará para el reorden en 1 toque.</small>
          </div>

          <div class="field">
            <div class="fl">Teléfono fijo u oficina</div>
            <input class="inp" v-model="form.telefono" placeholder="Ej. 667 123 4567" inputmode="tel" maxlength="15">
          </div>

          <p v-if="error" class="err">{{ error }}</p>

          <div class="guardar-bar">
            <button class="cta" :disabled="enviando || !form.nombre.trim()" @click="guardar()">
              {{ enviando ? 'Guardando…' : (esNuevo ? 'Crear proveedor' : 'Guardar cambios') }}
            </button>
            <button v-if="!esNuevo" class="btn-compra-rapida" type="button" @click="irACompra">
              Nueva compra
            </button>
            <button v-if="!esNuevo" class="trash" type="button" @click="desactivar()">Desactivar</button>
          </div>
        </div>

        <!-- Columna Productos asociados -->
        <div class="col-prods" v-if="!esNuevo">
          <div class="prods-card">
            <div class="prods-head">
              <div class="ph-tit">
                <b>Productos surtidos</b>
                <span class="cnt">{{ productosAsociados.length }}</span>
              </div>
              <router-link to="/panel/producto/nuevo" class="ph-link">+ Nuevo producto</router-link>
            </div>

            <div v-if="!productosAsociados.length" class="prods-vacio">
              Aún no hay productos vinculados a este proveedor.<br>
              Asigna este proveedor al crear o editar un producto en el catálogo.
            </div>

            <div v-else class="prods-list">
              <div v-for="pr in productosAsociados" :key="pr.id" class="p-item" @click="verProducto(pr.id)">
                <div class="p-info">
                  <div class="p-nom">{{ pr.nombre }}</div>
                  <div class="p-sub">
                    Stock: <b>{{ fmt(pr.stockAlmacen) }} {{ pr.unidad || 'pzas' }}</b> · Costo: {{ money(pr.costoPromedio) }}
                  </div>
                </div>
                <div class="p-right">
                  <span v-if="pr.requiereReorden" class="badge-reorden">Reorden</span>
                  <span class="p-prec">{{ money(pr.precioVenta) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <ExitoOverlay :show="exito" :titulo="exitoTit" :subtitulo="form.nombre" :detalle="exitoDet" cta-texto="Ver proveedores" @done="salir" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import http from '@/api/http'
import ExitoOverlay from '@/components/ExitoOverlay.vue'

const emit = defineEmits(['ctx'])
const route = useRoute()
const router = useRouter()
const esNuevo = computed(() => route.params.id === 'nuevo')
const form = reactive({ nombre: '', whatsapp: '', telefono: '' })
const productosAsociados = ref([])
const cargando = ref(true), enviando = ref(false), error = ref('')
const exito = ref(false), exitoTit = ref(''), exitoDet = ref([])

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt = (n) => Number(n || 0).toLocaleString('es-MX')

function salir() { router.replace('/panel/proveedores') }
function filtrarWa() { form.whatsapp = (form.whatsapp || '').replace(/[^\d ]/g, '').slice(0, 15) }
function verProducto(id) { router.push(`/panel/producto/${id}`) }
function irACompra() { router.push(`/panel/compra/nuevo?proveedorId=${route.params.id}`) }

async function guardar() {
  if (!form.nombre.trim()) return
  enviando.value = true; error.value = ''
  const body = { nombre: form.nombre.trim(), whatsapp: form.whatsapp?.trim() || null, telefono: form.telefono?.trim() || null }
  try {
    if (esNuevo.value) await http.post('/proveedores', body)
    else await http.put(`/proveedores/${route.params.id}`, { ...body, activo: true })
    exitoTit.value = esNuevo.value ? 'Proveedor creado' : 'Proveedor actualizado'
    exitoDet.value = [{ k: 'WhatsApp', v: form.whatsapp || '—' }, { k: 'Teléfono', v: form.telefono || '—' }]
    exito.value = true
  } catch (e) { error.value = e.response?.data?.mensaje || 'No se pudo guardar el proveedor.' }
  finally { enviando.value = false }
}

async function desactivar() {
  if (!confirm('¿Desactivar este proveedor?')) return
  try { await http.delete(`/proveedores/${route.params.id}`); salir() }
  catch (e) { error.value = e.response?.data?.mensaje || 'No se pudo desactivar.' }
}

onMounted(async () => {
  emit('ctx', { titulo: esNuevo.value ? 'Nuevo proveedor' : 'Editar proveedor', sub: '', back: '/panel/proveedores' })
  if (!esNuevo.value) {
    try {
      const [provRes, prodRes] = await Promise.all([
        http.get(`/proveedores/${route.params.id}`),
        http.get('/productos', { params: { tamano: 200 } })
      ])
      Object.assign(form, {
        nombre: provRes.data.nombre,
        whatsapp: provRes.data.whatsapp || '',
        telefono: provRes.data.telefono || ''
      })
      const provId = Number(route.params.id)
      productosAsociados.value = (prodRes.data?.items || []).filter(p => p.proveedorId === provId)
    } catch {
      error.value = 'No se pudo cargar la información del proveedor.'
    }
  }
  cargando.value = false
})
</script>

<style scoped>
.editor-wrap { max-width: 960px; }
.muted { color: var(--muted); margin-top: 24px; }
.err { color: var(--clay); font-size: 13px; font-weight: 600; margin: 12px 2px; }

.form-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
@media (max-width: 800px) { .form-cols { grid-template-columns: 1fr; } }

.col-form { display: flex; flex-direction: column; gap: 12px; }
.field { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px; box-shadow: var(--shadow); }
.fl { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 9px; }
.fl .op { color: #AAB3AC; font-weight: 600; text-transform: none; letter-spacing: 0; }
.inp { width: 100%; border: 1px solid var(--line); background: var(--paper); border-radius: 11px; padding: 12px 13px; font-family: "Hanken Grotesk"; font-size: 15px; font-weight: 600; color: var(--ink); }
.inp-wa-wrap { display: flex; align-items: center; background: var(--paper); border: 1px solid var(--line); border-radius: 11px; padding: 0 12px; }
.wa-ico { font-size: 18px; margin-right: 8px; }
.inp-wa { border: none; background: transparent; padding: 12px 0; }
.hint { font-size: 11.5px; color: var(--muted); margin-top: 6px; display: block; line-height: 1.4; }

.guardar-bar { margin-top: 14px; display: flex; gap: 10px; flex-wrap: wrap; }
.guardar-bar .cta { flex: 1; }
.cta { background: var(--pine); color: #fff; border: none; border-radius: 14px; padding: 14px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 15px; cursor: pointer; box-shadow: 0 12px 22px -12px rgba(14,92,74,.8); }
.cta:disabled { opacity: .5; }

.btn-compra-rapida { border: 1px solid var(--sky); background: var(--sky-soft); color: var(--sky); border-radius: 14px; padding: 14px 18px; font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; cursor: pointer; }
.trash { border: 1px solid var(--clay-soft); background: var(--clay-soft); color: var(--clay); border-radius: 14px; padding: 14px 18px; font-family: "Bricolage Grotesque"; font-weight: 700; cursor: pointer; }

/* Columna productos */
.prods-card { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 16px; box-shadow: var(--shadow); }
.prods-head { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--line); padding-bottom: 12px; margin-bottom: 12px; }
.ph-tit { display: flex; align-items: center; gap: 8px; }
.ph-tit b { font-family: "Bricolage Grotesque"; font-size: 15px; font-weight: 700; color: var(--ink); }
.ph-tit .cnt { background: var(--sky-soft); color: var(--sky); font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 8px; }
.ph-link { font-size: 12.5px; font-weight: 700; color: var(--pine); text-decoration: none; }
.prods-vacio { font-size: 12.5px; color: var(--muted); line-height: 1.5; padding: 18px 0; text-align: center; }
.prods-list { display: flex; flex-direction: column; gap: 8px; max-height: 480px; overflow-y: auto; }
.p-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border-radius: 12px; background: var(--paper); border: 1px solid var(--line); cursor: pointer; transition: border-color .12s, transform .12s; }
.p-item:hover { border-color: var(--pine); transform: translateX(2px); }
.p-nom { font-weight: 700; font-size: 13.5px; color: var(--ink); }
.p-sub { font-size: 11.5px; color: var(--muted); margin-top: 2px; }
.p-sub b { color: var(--ink-soft); }
.p-right { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
.badge-reorden { font-size: 9.5px; font-weight: 800; background: var(--amber-soft); color: #B9781F; padding: 2px 6px; border-radius: 6px; text-transform: uppercase; }
.p-prec { font-family: "Bricolage Grotesque"; font-weight: 700; font-size: 14px; color: var(--ink); }
</style>
