import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import LoginV2 from '../views/LoginV2.vue'
import Stat from '../views/Stat.vue'
import Resource from '../views/Resource.vue'
import KWK from '../views/KWK.vue'
import ResourceCard from '../views/ResourceCard.vue'
import ResourceCardV2 from '../views/ResourceCardV2.vue'
import ResourceCardWk from '../views/ResourceCardWk.vue'
import ResourceDetail from '../views/ResourceDetail.vue'
import Shell from '../views/Shell.vue'
import Cli from '../views/Cli.vue'
import Doc from '../doc/Doc.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/doc/:version/:section',
    name: 'Doc',
    component: Doc
  },

  {
    path: '/',
    name: 'Home',
    component: KWK,
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginV2
  },
  {
    path: '/stat',
    name: 'Stat',
    component: Stat
  },
  {
    path: '/cli',
    name: 'Cli',
    component: Cli
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
    component: ResourceCardV2,
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
