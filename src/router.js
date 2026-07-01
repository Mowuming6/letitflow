import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/',          component: () => import('./pages/Index.vue') },
  { path: '/box',       component: () => import('./pages/Box.vue') },
  { path: '/dice',      component: () => import('./pages/Dice.vue') },
  { path: '/coin',      component: () => import('./pages/Coin.vue') },
  { path: '/wheel',     component: () => import('./pages/Wheel.vue') },
  { path: '/jiao',      component: () => import('./pages/Jiao.vue') },
  { path: '/qian',      component: () => import('./pages/Qian.vue') },
  { path: '/liuyao',    component: () => import('./pages/Liuyao.vue') },
  { path: '/plum',      component: () => import('./pages/Plum.vue') },
  { path: '/tarot',     component: () => import('./pages/Tarot.vue') },
  { path: '/lenormand', component: () => import('./pages/Lenormand.vue') },
  { path: '/book',      component: () => import('./pages/Book.vue') },
  { path: '/history',   component: () => import('./pages/History.vue') },
  { path: '/tech',      component: () => import('./pages/BoxBox.vue') },
  { path: '/tech2',     component: () => import('./pages/BoxBoxBox.vue') },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})
