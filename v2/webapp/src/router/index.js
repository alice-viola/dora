import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import Stat from '../views/Stat.vue'
import Resource from '../views/Resource.vue'
import ResourceCard from '../views/ResourceCard.vue'
import ResourceDetail from '../views/ResourceDetail.vue'
import Shell from '../views/Shell.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/stat',
    name: 'Stat',
    component: Stat
  },
  {
    path: '/resource/:kind/:name',
    name: 'ResourceDetail',
    component: ResourceDetail,
    props: true
  },
  {
    path: '/resource/:name',
    name: 'ResourceCard',
    component: ResourceCard,
  },
  {
    path: '/shell/:name',
    name: 'Shell',
    component: Shell,
    props: true
  },
  {
    path: '/about',
    name: 'About',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/About.vue')
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router
