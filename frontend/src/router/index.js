import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/Home.vue'
import Demande from '../views/Demande.vue'
import SuiviDemandes from '../views/SuiviDemandes.vue'
import Admin from '../views/Admin.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/demande',
      name: 'demande',
      component: Demande
    },
    {
      path: '/suivi',
      name: 'suivi',
      component: SuiviDemandes
    },
    {
      path: '/admin',
      name: 'admin',
      component: Admin
    }
  ]
})

export default router 