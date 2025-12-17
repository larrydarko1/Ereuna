import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeB.vue')
  },
  /* 
  {
    path: '/careers',
    name: 'Careers',
    component: () => import('../views/Careers.vue')
  },
  {
    path: '/blog',
    name: 'Blog',
    component: () => import('../views/Blog.vue')
  },
   */
  {
    path: '/communications',
    name: 'Communications',
    component: () => import('../views/Communications.vue')
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('../views/AboutB.vue')
  },
  {
    path: '/quiz',
    name: 'Quiz',
    component: () => import('../views/Quiz.vue')
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
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue')
  },
  {
    path: '/signup',
    name: 'SignUp',
    component: () => import('../views/SignUpC.vue')
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
    component: () => import('../views/HomeB.vue')
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