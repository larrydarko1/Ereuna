import { createRouter, createWebHistory } from 'vue-router'

const routes = [
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
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/user',
    name: 'User',
    component: () => import('../views/User.vue')
  },
  {
    path: '/signup',
    name: 'SignUp',
    component: () => import('../views/SignUp.vue')
  },
  {
    path: '/upload',
    name: 'Upload',
    component: () => import('../views/Upload.vue')
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
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router