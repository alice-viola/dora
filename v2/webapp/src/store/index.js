import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios'
import async from 'async'
import randomstring from 'randomstring'
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
    if (apiVersion == undefined) {
      apiVersion = DEFAULT_API_VERSION
    }
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

/**
* Needs args:
args: {
  token,
  file,
  dstName,
  id, // randomstring.generate(12)
  total,
  index,
  server,
  group: 
}
*/
function apiVolumeUpload (args, cb) {
  console.log('Start uplaod')
  try {
    axios({
      method: 'POST',
      url: `${args.server}/${DEFAULT_API_VERSION}/${args.group || '-'}/Volume/upload/${args.dstName}/${args.id}/${args.files.length}/${args.index + 1}/`,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${args.token}`
      },
      data: args.file
    }).then((res) => {
        cb(null)
    }).catch((err) => {
        console.log(err)
        cb(true)
    })
  } catch (err) {
    console.log(err)
  }
}

export default new Vuex.Store({
  	state: {
  		apiServer: process.env.NODE_ENV !=  'production' ? 'http://localhost:3000' : '',
      userComplete: null,
  		user: {
  			auth: false,
  			token: null,
  			name: null,
  			wrongAuth: false,
  			groups: [],
  			selectedGroup: null,
  		},
      
      selectedWorkspace: null,
      selectedZone: null,

  		apiResponse: {
  			dialog: false,
  			type: null,
  			text: null
  		},
  		resource: {},
  		ui: {
  			fetchingNewData: false,
        hideNavbarAndSidebar: false,
        isMobile: false,
        stat: {
          period: '10m',
          type: 'cluster',
          filter: '',
          filters: []
        },
        resourceView: 1
  		},
      search: {
        filter: '',
        page: 1,
        pages: 1
      }
  	},
  	mutations: {
  		resource (state, data) {
  			state.resource[data.name] = data.data
  		},
  		user (state, data) {
  			state.user = data
  		},
      userComplete (state, data) {
        state.userComplete = data
      },
  		apiResponse (state, data) {
  			state.apiResponse = data
  		},
  		selectedGroup (state, data) {
  			state.ui.fetchingNewData = true
  			state.user.selectedGroup = data
  		},
      newWindowShell (state, data) {
        state.ui.hideNavbarAndSidebar = true
      },
      search (state, data) {
        Object.keys(data).forEach((d) => {
          state.search[d] = data[d]
        })
      },
      isMobile (state, data) {
        state.ui.isMobile = data
      }
  	},
  	actions: {
      upload (context, args) {
        let randomId = randomstring.generate(24)
        let files = args.files
        let volumeName = args.volumeName
        let queue = []
        files.forEach((file, index) => {
            queue.push((cb) => {
              apiVolumeUpload({
                server: context.state.apiServer,
                token: context.state.user.token,
                group: context.state.user.selectedGroup,
                id: randomId,
                file: file,
                index: index,
                dstName: 'home',
                files: files
              }, (err) => {
                cb (err)
              })
            })
        })
        async.series(queue, (err, data) => {
          axios({
            method: 'POST',
            url: `${context.state.apiServer}/${DEFAULT_API_VERSION}/${context.state.user.selectedGroup || '-'}/Volume/upload/${'home'}/${randomId}/${files.length}/endweb/`,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            headers: {
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${context.state.user.token}`
            }
          }).then((res) => {
            console.log('->', res)
          }).catch((err) => {
            console.log(err)
          })
        })
      },
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
  		resource (context, args, hideErrors = false) {
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
  				if (err && !hideErrors) {
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
      stat (context, args, hideErrors = false) {
        if (!context.state.user.auth) {
          return
        }
        context.state.ui.fetchingNewData = false
        apiRequest({
          server: context.state.apiServer,
          token: context.state.user.token,
          type: 'post',
          group: context.state.user.selectedGroup,
          resource: 'cluster',
          verb: 'stat',
          body: {period: args.period, type: args.type, name: args.name}
        }, (err, response) => {
          if (err && !hideErrors) {
            context.commit('apiResponse', {
              dialog: true,
              type: 'Error',
              text: response
            })              
          } else {
            args.cb(response.data)            
          }
        })
      },
  		userStatus (context, args) {
        return
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
          group: '-',
          resource: 'Container',
          verb: 'describe',
          body: {kind: 'Container', apiVersion: DEFAULT_API_VERSION, metadata: {name: args.containername, group: '-'}}
          }, (err, responseContainer) => {
  			     apiRequest({
  			     	server: context.state.apiServer,
  			     	token: context.state.user.token,
  			     	type: 'post',
  			     	group: '-',
  			     	resource: 'Container',
  			     	verb: 'token',
  			     }, (err, response, error) => {
  			     	if (err) {
  			     		context.commit('apiResponse', {
  			     			dialog: true,
  			     			type: 'Error',
  			     			text: response + ' ' + error
  			     		})  						
  			     	} else {
  			     		context.commit('resource', {name: args.name, data: response.data, c_id: responseContainer})
  			     		args.cb(err, {name: args.name, data: response.data, c_id: responseContainer.data[0].observed.c_id})  					
  			     	}
  			     })
           })
  		},
      commit (context, args) {
        apiRequest({
          server: context.state.apiServer,
          token: context.state.user.token,
          type: 'post',
          group: context.state.user.selectedGroup,
          resource: 'Workload',
          verb: 'commit/' + encodeURIComponent(args.name) +'/' + encodeURIComponent(args.repo) + '/',
        }, (err, response, error) => {
          if (err) {
            context.commit('apiResponse', {
              dialog: true,
              type: 'Error',
              text: response + ' ' + error
            })              
          } else {
            context.commit('apiResponse', {
              dialog: true,
              type: 'Done',
              text: 'Commit response:' + response.data
            })  
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
      pause (context, args) {
        apiRequest({
          server: context.state.apiServer,
          token: context.state.user.token,
          type: 'post',
          resource: args.kind,
          verb: 'pause',
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
      resume (context, args) {
        apiRequest({
          server: context.state.apiServer,
          token: context.state.user.token,
          type: 'post',
          resource: args.kind,
          verb: 'unpause',
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
  		logout (context) {
  			context.commit('user', {
  				auth: false,
  				token: null,
  				name: null,
  				wrongAuth: true,
  				groups: [],
  				selectedGroup: null
  			})
  			/*context.commit('apiResponse', {
  				dialog: true,
  				type: 'Done',
  				text: 'Logout'
  			})*/
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
  					router.push('/')
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
  					let user = context.state.user
  					user.workspaces = response.data.workspaces
  					user.selectedWorkspace = response.data.defaultWorkspace
            user.tree = response.data.tree
            context.state.selectedZone = 'All'
            context.state.selectedWorkspace = 'All'
  					context.commit('user', user)
            context.commit('userComplete', response)
  					if (args !== undefined && args.cb !== undefined) {
  						args.cb()
  					}
  				}
  			})
  		}
  	},
  	modules: {}
})
