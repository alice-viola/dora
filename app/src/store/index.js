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
			cb(null, res)
		}).catch((err) => {
			if (err.code == 'ECONNREFUSED') {
				cb(true, 'Error connecting to API server')
			} else {
				if (err.response !== undefined && err.response.statusText !== undefined) {
					cb(true, 'Error in response from API server: ' + err.response.statusText)
				} else {
					cb(true, 'Error in response from API server: Unknown') 	
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
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7InVzZXIiOiJhbWVkZW8uc2V0dGkifSwiaWF0IjoxNjAxOTg3MDk2fQ.6EN-G-gl8bcW8Lg2HwbdsOMfztD9gRGbYkvI-M-wLV8
export default new Vuex.Store({
  	state: {
  		apiServer: 'https://pwmapi.promfacility.eu', //'http://localhost:3000',
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
  				{kind: args.name, apiVersion: 'v1', metadata: {group: 'pwm.all'}},
  				'get',
  				(err, response) => {
  					context.commit('resource', {name: args.name, data: response.data})
  					args.cb(response.data)
  				})
  		},
  		stop (context, args) {
  			resourceApiRequest(context.state.apiServer, 
  				'post', 
  				context.state.user.token,
  				{kind: args.kind, apiVersion: 'v1', metadata: {name: args.name, group: args.group}},
  				'cancel',
  				(err, response) => {
  					if (err) {
  						context.commit('apiResponse', {
  							dialog: true,
  							type: 'Error',
  							text: response
  						})  						
  					} else {
  						context.commit('apiResponse', {
  							dialog: true,
  							type: 'Done',
  							text: response.data
  						})  
  					}
  			})
  		},
  		delete (context, args) {
  			resourceApiRequest(context.state.apiServer, 
  				'post', 
  				context.state.user.token,
  				{kind: args.kind, apiVersion: 'v1', metadata: {name: args.name, group: args.group}},
  				'delete',
  				(err, response) => {
  					if (err) {
  						context.commit('apiResponse', {
  							dialog: true,
  							type: 'Error',
  							text: response
  						})  						
  					} else {
  						context.commit('apiResponse', {
  							dialog: true,
  							type: 'Done',
  							text: response.data
  						})  
  					}
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
