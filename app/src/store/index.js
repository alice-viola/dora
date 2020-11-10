import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios'
import cookie from 'vue-cookies'
import router from '../router'

Vue.prototype.$cookie = cookie
Vue.use(Vuex)

function resourceApiRequest (apiServer, type, token, resource, verb, cb) {
	let body, query = null
	if (type == 'get') {
		query = resource
	} else {
		body = resource
	}
	try {
		axios.defaults.headers.common = {'Authorization': `Bearer ${token}`}
		axios[type](`${apiServer}/v1/${resource.kind}/${verb}`, 
			{data: body,
			}, query, {timeout: 1000}).then((res) => {
			cb(res)
		}).catch((err) => {
			if (err.code == 'ECONNREFUSED') {
				cb('Error connecting to API server')
			} else {
				if (err.response !== undefined && err.response.statusText !== undefined) {
					cb('Error in response from API server: ' + err.response.statusText)
				} else {
					cb('Error in response from API server: Unknown') 	
				}
			}
		}) 	  		
	} catch (err) {
		console.log('err', err)
	}
}

function apiRequest (apiServer, type, token, path, cb) {
	try {
		axios.defaults.headers.common = {'Authorization': `Bearer ${token}`}
		axios[type](`${apiServer}/v1${path}`, 
			null, '', {timeout: 1000}).then((res) => {
			cb(res)
		}).catch((err) => {
			if (err.code == 'ECONNREFUSED') {
				cb('Error connecting to API server')
			} else {
				if (err.response !== undefined && err.response.statusText !== undefined) {
					cb('Error in response from API server: ' + err.response.statusText)
				} else {
					console.log(err)
					cb('Error in response from API server: Unknown') 	
				}
			}
		}) 	  		
	} catch (err) {
		console.log(err)
	}
}

export default new Vuex.Store({
  	state: {
  		apiServer: 'http://localhost:3000',
  		user: {
  			auth: false,
  			token: null,
  			name: null,
  			wrongAuth: false
  		},
  		apiResponse: {
  			dialog: false,
  			type: null,
  			text: null
  		},
  		sidebar: {
  			resources: []
  		},
  		resource: {}
  	},
  	mutations: {
  		resource (state, data) {
  			state.resource[data.name] = data.data
  		},
  		user (state, data) {
  			state.user = data
  		},
  		apiResponse (state, data) {
  			state.apiResponse = data
  		},
  		sidebarResources (state, data) {
  			state.sidebar.resources = data
  		}
  	},
  	actions: {
  		resource (context, args) {
  			resourceApiRequest(context.state.apiServer, 
  				'post', 
  				context.state.user.token,
  				{kind: args.name, apiVersion: 'v1', metadata: {group: 'amedeo.setti'}},
  				'get',
  				(response) => {
  					context.commit('resource', {name: args.name, data: response.data})
  					args.cb(response.data)
  				})
  		},
  		logout (context) {
  			context.commit('user', {
  				auth: false,
  				token: null,
  				name: null,
  				wrongAuth: true
  			})
  			context.commit('apiResponse', {
  				dialog: true,
  				type: 'Done',
  				text: 'Logout'
  			})
  			Vue.prototype.$cookie.remove('pwmtoken')
  			Vue.prototype.$cookie.set('auth', false)
  			router.push('/login')
  		},
  		login (context, token) {
  			apiRequest(context.state.apiServer, 'post', token, '/user/validate', (response) => {
  				if (response.data.status == 200) {
  					context.commit('user', {
  						auth: true,
  						token: token,
  						name: response.data.name,
  						wrongAuth: false
  					})
  					Vue.prototype.$cookie.set('name', response.data.name)
  					Vue.prototype.$cookie.set('auth', true)
  					Vue.prototype.$cookie.set('pwmtoken', token)
  					router.push('/')
  				} else {
  					context.commit('user', {
  						auth: false,
  						token: null,
  						name: null,
  						wrongAuth: true
  					})
  					context.commit('apiResponse', {
  						dialog: true,
  						type: 'Error',
  						text: 'Unathorized'
  					})
  					Vue.prototype.$cookie.remove('pwmtoken')
  					Vue.prototype.$cookie.set('auth', false)
  				}
  			})
  		},
  		groups (context) {
  			apiRequest(context.state.apiServer, 'post', context.state.user.token, '/user/groups', (response) => {
  				let sr = {}
  				response.data.spec.groups.forEach((group) => {
  					if (typeof group.policy !== 'string') {
  						Object.keys(group.policy).forEach((policyName) => {
  							if (sr[policyName] == undefined) {
  								sr[policyName] = {policyName: policyName, verbs: group.policy.policyName, groups: [group.name]}
  							} else {
  								sr[policyName].groups.push(group.name)
  								group.policy.policyName.forEach ((verb) => {
  									if (!sr[policyName].verbs.includes(verb)) {
  										sr[policyName].verbs.push(verb)
  									}
  								})
  							}
  						})
  					}
  				})
  				context.commit('sidebarResources', Object.values(sr))
  			})
  		}
  	},
  	modules: {
  	}
})
