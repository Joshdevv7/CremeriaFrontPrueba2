# Frontend — Distribuidora (Ionic + Vue + Capacitor)

App móvil/PWA conectada a la API .NET. Sistema de diseño en `src/theme/tokens.css`.

## Requisitos
- Node.js 18+ y npm

## Arrancar en desarrollo
```bash
npm install
cp .env.example .env     # ajusta VITE_API_URL si tu API no está en :54003
npm run dev              # abre http://localhost:5173
```
Asegúrate de tener la **API corriendo** (en http://localhost:54003) y que sus CORS
permitan http://localhost:5173 (ya está configurado en appsettings.json).

Entra con los usuarios sembrados:
- admin@distribuidora.mx / Admin123*  (ve el Resumen)
- repartidor@distribuidora.mx / Ruta123*

## Estructura
```
src/
  api/http.js          Axios + token JWT automático + manejo de 401
  stores/auth.js       Sesión (Pinia): login, rol, logout
  composables/         useCurrency (formato $ MXN)
  router/index.js      Rutas + guard por autenticación y rol
  theme/               tokens.css (diseño) + variables.css (Ionic)
  views/
    LoginView.vue      Login conectado a /api/auth/login
    TabsPage.vue       Shell de tabs (tabs según rol)
    ProductosView.vue  Lista conectada a /api/productos (con reorden)
    PerfilView.vue     Datos de sesión + cerrar sesión
    admin/DashboardView.vue  KPIs conectados a /api/dashboard
```

## Empaquetar para Android (después)
```bash
npm run build
npx cap add android
npm run cap:sync
npm run cap:android     # abre Android Studio
```

## Siguiente
Portar el resto de pantallas de los mockups (ruta, entrega con firma, carga,
corte) reutilizando los tokens y consumiendo los endpoints ya disponibles.
