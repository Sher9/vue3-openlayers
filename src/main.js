import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

// 导入OpenLayers样式
import 'ol/ol.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app') 