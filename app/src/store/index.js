import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios'
import cookie from 'vue-cookies'
import router from '../router'

Vue.prototype.$cookie = cookie
Vue.use(Vuex)

let DEFAULT_API_VERSION = 'v1'

/**
*	Args:
*
*	type: get, post
*	resource: api,Workload...
*	verb: apply,delete...
*	group: groupOverride OPT
*	token: tokenOverride OPT
*	body: body OPT
*	query: query OPT
*	server: server OPT
*/
function apiRequest (args, cb) {
	try {
		let apiVersion = args.body !== undefined ? (args.resource == 'batch' ? DEFAULT_API_VERSION : args.body.apiVersion) : DEFAULT_API_VERSION
		let bodyData = args.body == undefined ? null : {data: args.body}
		axios.defaults.headers.common = {'Authorization': `Bearer ${args.token}`}
		axios[args.type](`${args.server}/${apiVersion}/${args.group || '-'}/${args.resource}/${args.verb}`, 
			bodyData, args.query, {timeout: 1000}).then((res) => {
			cb(null, res)
		}).catch((err) => {
			console.log(err)
			if (err.code == 'ECONNREFUSED') {
				cb(true, 'Error connecting to API server ' + args.server)
			} else {
				if (err.response !== undefined && err.response.statusText !== undefined) {
					cb(true, 'Error in response from API server: ' + err.response.statusText) 	
				} else {
					cb(true, 'Error in response from API server: Unknown', err) 	
				}
			}
		}) 	
	} catch (err) {
		cb(true, 'App internal error: ' +  err)
	}
}

export default new Vuex.Store({
  	state: {
  		apiServer: process.env.NODE_ENV !=  'production' ? 'http://localhost:3000' : '',
  		//apiServer: 'http://localhost:3000',
  		user: {
  			auth: false,
  			token: null,
  			name: null,
  			wrongAuth: false,
  			groups: [],
  			selectedGroup: null
  		},
  		apiResponse: {
  			dialog: false,
  			type: null,
  			text: null
  		},
  		resource: {},
  		ui: {
  			fetchingNewData: false
  		}
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
  		selectedGroup (state, data) {
  			state.ui.fetchingNewData = true
  			state.user.selectedGroup = data
  		}
  	},
  	actions: {
  		apply (context, args) {
			apiRequest({
				server: context.state.apiServer,
				token: context.state.user.token,
				type: 'post',
				resource: args.kind,
				group: context.state.user.selectedGroup,
				verb: 'apply',
				body: args
			}, (err, response) => {
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
  		resource (context, args) {
  			if (!context.state.user.auth) {
  				return
  			}
  			context.state.ui.fetchingNewData = false
  			apiRequest({
  				server: context.state.apiServer,
  				token: context.state.user.token,
  				type: 'post',
  				group: context.state.user.selectedGroup,
  				resource: args.name,
  				verb: 'get',
  			}, (err, response) => {
  				if (err) {
  					context.commit('apiResponse', {
  						dialog: true,
  						type: 'Error',
  						text: response
  					})  						
  				} else {
  					context.commit('resource', {name: args.name, data: response.data})
  					args.cb(response.data)  					
  				}
  			})
  		},
  		userStatus (context, args) {
  			if (!context.state.user.auth) {
  				return
  			}
  			context.state.ui.fetchingNewData = false
  			apiRequest({
  				server: context.state.apiServer,
  				token: context.state.user.token,
  				type: 'post',
  				group: context.state.user.selectedGroup,
  				resource: 'User',
  				verb: 'status',
  			}, (err, response) => {
  				if (err) {
  					context.commit('apiResponse', {
  						dialog: true,
  						type: 'Error',
  						text: response
  					})  						
  				} else {
  					console.log(response.data)
  					args.cb(response.data)  					
  				}
  			})
  		},
  		describe (context, args) {
  			if (!context.state.user.auth) {
  				return
  			}
  			context.state.ui.fetchingNewData = false
  			apiRequest({
  				server: context.state.apiServer,
  				token: context.state.user.token,
  				type: 'post',
  				group: context.state.user.selectedGroup,
  				resource: args.kind,
  				verb: 'describe',
  				body: {kind: args.kind, apiVersion: 'v1', metadata: {name: args.name, group: args.group}},
  			}, (err, response) => {
  				if (err) {
  					context.commit('apiResponse', {
  						dialog: true,
  						type: 'Error',
  						text: response
  					})  						
  				} else {
  					context.commit('resource', {name: args.name, data: response.data})
  					args.cb(response.data)  					
  				}
  			})
  		},
  		shell (context, args) {
  			apiRequest({
  				server: context.state.apiServer,
  				token: context.state.user.token,
  				type: 'post',
  				group: context.state.user.selectedGroup,
  				resource: 'Workload',
  				verb: 'token',
  			}, (err, response, error) => {
  				if (err) {
  					context.commit('apiResponse', {
  						dialog: true,
  						type: 'Error',
  						text: response + ' ' + error
  					})  						
  				} else {
  					context.commit('resource', {name: args.name, data: response.data})
  					args.cb(err, response.data)  					
  				}
  			})
  		},
  		stop (context, args) {
  			apiRequest({
  				server: context.state.apiServer,
  				token: context.state.user.token,
  				type: 'post',
  				resource: args.kind,
  				verb: 'cancel',
  				group: context.state.user.selectedGroup,
  				body: {kind: args.kind, apiVersion: 'v1', metadata: {name: args.name, group: args.group}},
  			}, (err, response) => {
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
  			apiRequest({
  				server: context.state.apiServer,
  				token: context.state.user.token,
  				type: 'post',
  				resource: args.kind,
  				verb: 'delete',
  				body: {kind: args.kind, apiVersion: 'v1', metadata: {name: args.name, group: args.group}},
  			}, (err, response) => {
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
  				wrongAuth: true,
  				groups: [],
  				selectedGroup: null
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
  			apiRequest({
  				server: context.state.apiServer,
  				token: token,
  				type: 'post',
  				resource: 'User',
  				verb: 'validate',
  			}, (err, response) => {
  				if (err) {
  					context.commit('apiResponse', {
  						dialog: true,
  						type: 'Error',
  						text: response
  					})  	
  				}
  				if (response.data.status == 200 && err == null) {
  					context.commit('user', {
  						auth: true,
  						token: token,
  						name: response.data.name,
  						wrongAuth: false,
  						groups: [],
  						selectedGroup: null
  					})
  					Vue.prototype.$cookie.set('name', response.data.name)
  					Vue.prototype.$cookie.set('auth', true)
  					Vue.prototype.$cookie.set('pwmtoken', token)
  					router.push('/resources')
  				} else {
  					context.commit('user', {
  						auth: false,
  						token: null,
  						name: null,
  						wrongAuth: true,
  						groups: [],
  						selectedGroup: null
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
  		groups (context, args) {
  			apiRequest({
  				server: context.state.apiServer,
  				token: context.state.user.token,
  				type: 'post',
  				resource: 'User',
  				verb: 'groups',
  			}, (err, response) => {
  				if (err) {
  					context.commit('apiResponse', {
  						dialog: true,
  						type: 'Error',
  						text: response
  					})  						
  				} else {
  					let sr = {}
  					response.data.spec.groups.forEach((group) => {
  						if (typeof group.policy !== 'string') {
  							Object.keys(group.policy).forEach((policyName) => {
  								if (sr[policyName] == undefined) {
  									sr[policyName] = {policyName: policyName, verbs: group.policy[policyName], groups: [group.name]}
  								} else {
  									sr[policyName].groups.push(group.name)
  									group.policy[policyName].forEach ((verb) => {
  										if (!sr[policyName].verbs.includes(verb)) {
  											
  											sr[policyName].verbs.push(verb)
  										}
  									})
  								}
  							})
  						}
  					})
  					let user = context.state.user
  					user.groups = response.data.spec.groups
  					user.selectedGroup = response.data.spec.groups[0].name
  					context.commit('user', user)
  					if (args !== undefined && args.cb !== undefined) {
  						args.cb()
  					}
  				}
  			})
  		}
  	},
  	modules: {}
})
