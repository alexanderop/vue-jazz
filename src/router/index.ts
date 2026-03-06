import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'Home', component: HomeView },
    {
      path: '/chat/:chatId',
      name: 'Chat',
      component: () => import('../views/ChatView.vue'),
      props: true,
    },
  ],
})

export default router
