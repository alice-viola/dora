import Vue from 'vue'
import VueRouter from 'vue-router'
import Init from '../views/Init.vue'
import Dashboard from '../views/Dashboard.vue'
import Projects from '../views/Projects.vue'
import Settings from '../views/Settings.vue'
import Workloads from '../views/Workloads.vue'
import StandaloneShell from '../views/StandaloneShell.vue'


Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Root',
    component: Dashboard
  },
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
    props: true,
    component: () => import(/* webpackChunkName: "about" */ '../views/Projects.vue')
  },
  {
    path: '/project',
    name: 'Project',
    props: true,
    component: () => import(/* webpackChunkName: "about" */ '../views/Project.vue')
  },
  {
    path: '/workloads',
    name: 'Workloads',
    component: () => import(/* webpackChunkName: "about" */ '../views/Workloads.vue'),
    props: true
  },
  {
    path: '/disks',
    name: 'Disks',
    component: () => import(/* webpackChunkName: "about" */ '../views/Disks.vue'),
    props: true
  },
  {
    path: '/gpus',
    name: 'GPUS',
    component: () => import(/* webpackChunkName: "about" */ '../views/GPUS.vue'),
    props: true
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import(/* webpackChunkName: "about" */ '../views/Settings.vue')
  },
  {
    path: '/StandaloneShell',
    name: 'StandaloneShell',
    component: StandaloneShell
  },
]

const router = new VueRouter({
  routes
})

export default router
