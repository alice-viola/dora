import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import router from './router'
import store from './store'
import axios from 'axios'
import vuetify from './plugins/vuetify'

Vue.config.productionTip = false

new Vue({
	axios,
  	router,
  	store,
  	vuetify,
  	render: h => h(App)
}).$mount('#app')
