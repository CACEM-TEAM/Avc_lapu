import { createRouter, createWebHistory } from 'vue-router';
import Home from './views/Home.vue';
import About from './views/About.vue';
import Demande from './views/Demande.vue';
import SuiviDemandes from './views/SuiviDemandes.vue';
import Admin from './views/Admin.vue';

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/about', component: About },
  { path: '/demande', name: 'Demande', component: Demande },
  { path: '/suivi', name: 'SuiviDemandes', component: SuiviDemandes },
  { path: '/admin', name: 'Admin', component: Admin }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
