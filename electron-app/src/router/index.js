import Vue from 'vue'
import VueRouter from 'vue-router'
import Init from '../views/Init.vue'
import Dashboard from '../views/Dashboard.vue'
import Projects from '../views/Projects.vue'
import Settings from '../views/Settings.vue'
import Workloads from '../views/Workloads.vue'


Vue.use(VueRouter)

const routes = [
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/init',
    name: 'Init',
    component: Init
  },
  {
    path: '/projects',
    name: 'Projects',
    component: () => import(/* webpackChunkName: "about" */ '../views/Projects.vue')
  },
  {
    path: '/workloads',
    name: 'Workloads',
    component: () => import(/* webpackChunkName: "about" */ '../views/Workloads.vue'),
    props: true
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import(/* webpackChunkName: "about" */ '../views/Settings.vue')
  },
]

const router = new VueRouter({
  routes
})

export default router
