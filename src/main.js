import { createApp } from 'vue'
import { IonicVue } from '@ionic/vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

/* CSS base de Ionic */
import '@ionic/vue/css/core.css'
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'
import '@ionic/vue/css/padding.css'
import '@ionic/vue/css/flex-utils.css'

/* Tema propio */
import './theme/variables.css'

const app = createApp(App)
  .use(IonicVue)
  .use(createPinia())
  .use(router)

router.isReady().then(() => app.mount('#app'))
