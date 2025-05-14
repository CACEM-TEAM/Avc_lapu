import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus';
import { FontAwesomeIcon } from './plugins/fontawesome'

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'element-plus/dist/index.css';

// 🔹 Import du fichier CSS global en dernier
import './style.css';

const app = createApp(App);
app.use(createPinia())
app.use(router);
app.use(ElementPlus);
app.component('font-awesome-icon', FontAwesomeIcon)
app.mount('#app');
