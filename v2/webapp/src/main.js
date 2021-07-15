import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import router from './router'
import store from './store'
import axios from 'axios'
import vuetify from './plugins/vuetify'

Vue.config.productionTip = false

router.beforeEach((to, from, next) => {
	// Check if user is auth
  if (store.state.user.auth == false && to.name == 'Doc') {
    next()
    return    
  } else if (store.state.user.auth == false && to.name == 'Login') {
  	next()
  	return
  } else if (store.state.user.auth == false) {
  	// Check if there are some cookie [cookie defined in store]
  	let cookie = Vue.prototype.$cookie
   	if (cookie.get('auth') == 'true') {
   	  	store.commit('user', {
   	  	  auth: true,
   	  	  token: cookie.get('pwmtoken'),
   	  	  name: cookie.get('name'),
   	  	  wrongAuth: true,
   	  	  groups: [],
   	  	  selectedGroup: null
   	  	})
        let cookieApiServer = Vue.prototype.$cookie.get('dora.apiServer')
        if (cookieApiServer !== undefined && cookieApiServer !== null) {
          store.commit('setApiServer', cookieApiServer)
        }           
   	  	store.dispatch('groups', {cb: () => {
   	  		next()
   	  	}})
   	} else {
   		router.push('/login')
   	}
  } else if (store.state.user.auth == true && store.state.selectedWorkspace == null) {
    let cookieApiServer = Vue.prototype.$cookie.get('dora.apiServer')
    if (cookieApiServer !== undefined && cookieApiServer !== null) {
      store.commit('setApiServer', cookieApiServer)
    }    
   	store.dispatch('groups', {cb: () => {
   		next()
   	}})
  } else {
  	next()
  }
})

new Vue({
	axios,
  	router,
  	store,
		vuetify,
  	render: h => h(App),
}).$mount('#app')
