import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/charts',
    name: 'Charts',
    component: () => import('../views/Charts.vue')
  },
  {
    path: '/screener',
    name: 'Screener',
    component: () => import('../views/Screener.vue')
  },
  {
    path: '/portfolio',
    name: 'Portfolio',
    component: () => import('../views/Portfolio.vue')
  },
  {
    path: '/archie',
    name: 'Archie',
    component: () => import('../views/archie.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/account',
    name: 'Account',
    component: () => import('../views/User.vue')
  },
  {
    path: '/signup',
    name: 'SignUp',
    component: () => import('../views/conversion.vue')
  },
  {
    path: '/upload',
    name: 'Upload',
    component: () => import('../views/Upload.vue')
  },
  {
    path: '/maintenance',
    name: 'Maintenance',
    component: () => import('../views/maintenance.vue')
  },
  {
    path: '/renew-subscription',
    name: 'PaymentRenew',
    component: () => import('../views/PaymentRenew.vue')
  },
  {
    path: '/:catchAll(.*)', // Catch-all route
    name: 'NotFound',
    component: () => import('../views/404.vue')
  },
  {
    path: '/recovery',
    name: 'Recovery',
    component: () => import('../views/Recovery.vue')
  },
  {
    path: '/documentation',
    name: 'Documentation',
    component: () => import('../views/Documentation.vue')
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router