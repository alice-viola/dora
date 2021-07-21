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
const PROGRAM_NAME = 'dora'

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

    let zone = '-'
    if (args !== undefined &&  args.body !== undefined && args.body.metadata !== undefined && args.body.metadata.zone !== undefined) {
      zone = args.body.metadata.zone
    }
    if (args !== undefined && args.zone !== undefined && args.zone !== null) {
      zone = args.zone
    }
    
    let workspace = '-'
    if (args !== undefined && args !== null && args.body !== undefined && args.body.metadata !== undefined && args.body.metadata.workspace !== undefined) {
      workspace = args.body.metadata.workspace
    }
    if (args !== undefined && args !== null && args.group !== undefined && args.group !== null) {
      workspace = args.group
    }
    if (args !== undefined && args !== null && args.workspace !== undefined && args.workspace !== null) {
      workspace = args.workspace
    }
    

		axios[args.type](`${args.server}/${apiVersion}/${zone}/${workspace}/${args.resource}/${args.verb}`, 
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
  		apiServer: process.env.NODE_ENV != 'production' ? 'http://localhost:3000' : '',
      userComplete: null,
  		user: {
  			auth: false,
  			token: null,
  			name: null,
  			wrongAuth: false,
  			groups: [],
  			selectedGroup: null,
        workspaces: []
      },
	  
      selectedWorkspace: null,
      selectedZone: null,
      defaultZone: null,

      groupCallIndex: 0,

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
        	resourceView: 0
  		},
      search: {
        filter: '',
        page: 1,
        pages: 1
      },
	
      // Electron things
      isElectron: false,
      profiles: [],
      cliCore: null,
      appCore: null,

      // Drag
      workloadOrder: []
  	},
    getters: {
      smallViewport: state => {
        return this.$vuetify.breakpoint.name !== 'lg' && this.$vuetify.breakpoint.name !== 'xl'
      },
      syncData: (state) => (wk) => {
        if (state.isElectron !== true) {
          return 
        }
        
        let sync = state.appCore.getDb().get('sync').value()     
        let wkID = wk.workspace + '.' + wk.name  
        if (sync[wkID] == undefined || Object.values(sync[wkID]).length == 0) {
          return false
        }

        return sync[wkID].filter((s) => {return s.active == true}).length > 0
      },   
      /**
      * args: {
      *   zone: ,
      *   workspace: 
      *   kind: 
      *   operation: 
      * }
      */
      capability: state => (args) => {
        let listOfRes = []
        let isAble = false
        if (args.zone !== undefined) {
          listOfRes = state.user.tree.zone[args.zone]
          if (listOfRes == undefined && state.user.tree.zone.All !== undefined) {
            listOfRes = state.user.tree.zone.All
          } 
        } else {
          return false
        }
        
        if (listOfRes == undefined) {
          return false
        }
        if (args.workspace !== undefined) {
          listOfRes = listOfRes.workspace[args.workspace]
          if (listOfRes == undefined && state.user.tree.zone[state.selectedZone].workspace.All !== undefined) {
            listOfRes = state.user.tree.zone[state.selectedZone].workspace.All
          }           
        } else {
          return false
        }
        if (listOfRes == undefined) {
          return false
        }         
          
        if (listOfRes[args.kind] !== undefined) {
          listOfRes = listOfRes[args.kind]
        } else {
          return false
        }
        if (listOfRes == undefined) {
          return false
        }        
        if (listOfRes.includes(args.operation)) {
          isAble = true
        }        
        return isAble
      }   
    },
  	mutations: {
      workloadOrder (state, value) {
        state.workloadOrder = value
      },
		  setIsElectron (state, value) {
		  	let path = require('path')
		  	let yaml = require('js-yaml')
		  	let fs = require('fs')
		  	state.isElectron = true
		  	let cliCore = require('../../../../lib/interfaces/user_cfg')
        let appCore = require('../../../../lib/interfaces/app_cfg')
		  	cliCore.yaml = yaml
		  	cliCore.setFsModule(fs)
		  	const homedir = require('os').homedir()
		  	
		  	cliCore.profile.setCfgLocation(path.join(homedir, '.' + PROGRAM_NAME, 'config'))
		  	cliCore.profile.setCfgFolder(path.join(homedir, '.'+ PROGRAM_NAME))
        appCore.init(path.join(homedir, '.' + PROGRAM_NAME, 'app'))
        state.cliCore = cliCore
        state.appCore = appCore
		  	let profiles = cliCore.profile.get()
		  	state.profiles = profiles[1]

        let cookieApiServer = Vue.prototype.$cookie.get('dora.apiServer')
        if (cookieApiServer !== undefined && cookieApiServer !== null) {
          state.apiServer = cookieApiServer
        }
		  },
      createProfile (state, args) {
        state.cliCore.profile.init(args.profile, args.apiserver, args.token, (err, response) => {
          if (err) {
            alert(err)
            args.cb(true)
          } else {
            let profiles = state.cliCore.profile.get()
            state.profiles = profiles[1]
            console.log('Now using profile', '*' + response + '*')
            args.cb(null)
          }
      })
      },      
      saveSyncData (state, wk) {
        if (state.isElectron !== true) {
          return
        }
        
        let sync = state.appCore.getDb().get('sync').value()     
        let wkID = wk.metadata.workspace + '.' + wk.metadata.name  
        sync[wkID] = wk.meta.sync
        state.appCore.getDb().set('sync', sync).write()
      },  
      deleteSyncData (state, wk) {
        if (state.isElectron !== true) {
          return
        }
        
        let sync = state.appCore.getDb().get('sync').value()     
        let wkID = wk.metadata.workspace + '.' + wk.metadata.name  
        delete sync[wkID] 
        state.appCore.getDb().set('sync', sync).write()
      },            
      setApiServer (state, value) {
        state.apiServer = value
        Vue.prototype.$cookie.set('dora.apiServer', value)
      },
      resetResource (state) {
      	state.resource = {}
      },
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
      },
      selectedWorkspace (state, data) {
      	state.selectedWorkspace = data
      },
      selectedZone (state, data) {
        state.selectedZone = data
      },      
  	},
  	actions: {
		  userCredits (context, cb) {
		  	if (!context.state.user.auth) {
		  		return
		  	}
		  	context.state.ui.fetchingNewData = false
		  	apiRequest({
		  		server: context.state.apiServer,
		  		token: context.state.user.token,
		  		type: 'post',
		  		group: '-',
		  		resource: 'User',
          zone: context.state.selectedZone,
		  		verb: 'credits'
		  	}, (err, response) => {
		  		// console.log('USERCREDITS', err, response.data)
		  		if (err) {
		  			context.commit('apiResponse', {
		  				dialog: true,
		  				type: 'Error',
		  				text: response
		  			})  						
		  		} else {
		  			cb(response.data)
		  							
		  		}
		  	})
		  },		  
  		apply (context, args) {
        apiRequest({
          server: context.state.apiServer,
          token: context.state.user.token,
          type: 'post',
          resource: args.kind,
          group: args.workspace,
          zone: context.state.selectedZone,
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
  				group: args.workspace || context.state.selectedWorkspace,
          zone: context.state.selectedZone,
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
      getEvents (context, args, hideErrors = false) {
        if (!context.state.user.auth) {
          return
        }
        context.state.ui.fetchingNewData = false
        apiRequest({
          server: context.state.apiServer,
          token: context.state.user.token,
          type: 'post',
          group: args.workspace || context.state.selectedWorkspace,
          resource: args.kind,
          zone: context.state.selectedZone,
          verb: 'event',
          body: {kind: args.kind, apiVersion: DEFAULT_API_VERSION, metadata: {name: args.name, group: args.workspace}, spec: {
            resource_id: args.resource_id
          }},
        }, (err, response) => {
          if (err && !hideErrors) {
            context.commit('apiResponse', {
              dialog: true,
              type: 'Error',
              text: response
            })              
          } else {
            //context.commit('resource', {name: args.name, data: response.data})
            args.cb(response.data)            
          }
        })
      },

      getVersions (context, args, hideErrors = false) {
        if (!context.state.user.auth) {
          return
        }
        context.state.ui.fetchingNewData = false
        apiRequest({
          server: context.state.apiServer,
          token: context.state.user.token,
          zone: context.state.selectedZone,
          type: 'post',
          group: args.workspace || context.state.selectedWorkspace,
          resource: args.kind,
          verb: 'version',
          body: {kind: args.kind, apiVersion: DEFAULT_API_VERSION, metadata: {name: args.name, group: args.workspace}, spec: {
            resource_id: args.resource_id
          }},
        }, (err, response) => {
          if (err && !hideErrors) {
            // context.commit('apiResponse', {
            //   dialog: true,
            //   type: 'Error',
            //   text: response
            // })              
          } else {
            //context.commit('resource', {name: args.name, data: response.data})
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
          zone: context.state.selectedZone,
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
          zone: context.state.selectedZone,
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
      cloneWorkspace (context, args) {
        if (!context.state.user.auth) {
          return
        }
        context.state.ui.fetchingNewData = false
        apiRequest({
          server: context.state.apiServer,
          token: context.state.user.token,
          type: 'post',
          group: context.state.user.selectedGroup,
          zone: context.state.selectedZone,
          resource: 'Workspace',
          verb: 'clone/' + args.name,
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
  				group: args.workspace,
          zone: context.state.selectedZone,
  				resource: args.kind,
  				verb: 'describe',
  				body: {kind: args.kind, apiVersion: DEFAULT_API_VERSION, metadata: {name: args.name, group: args.workspace}},
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
          zone: context.state.selectedZone,
          type: 'post',
          group: context.state.selectedWorkspace,
          resource: 'Container',
          verb: 'describe',
          body: {kind: 'Container', apiVersion: DEFAULT_API_VERSION, metadata: {name: args.containername, group: context.state.selectedWorkspace, zone: context.state.selectedZone}}
          }, (err, responseContainer) => {
  			     apiRequest({
  			     	server: context.state.apiServer,
  			     	token: context.state.user.token,
  			     	type: 'post',
              zone: context.state.selectedZone,
  			     	group: context.state.selectedWorkspace,
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
          zone: context.state.selectedZone,
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
          zone: context.state.selectedZone,
  				type: 'post',
  				resource: args.kind,
  				verb: 'cancel',
  				group: context.state.user.selectedGroup,
  				body: {kind: args.kind, apiVersion: DEFAULT_API_VERSION, metadata: {name: args.name, group: args.group}},
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
          zone: context.state.selectedZone,
          type: 'post',
          resource: args.kind,
          verb: 'pause',
          group: context.state.user.selectedGroup,
          body: {kind: args.kind, apiVersion: DEFAULT_API_VERSION, metadata: {name: args.name, group: args.group}},
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
          zone: context.state.selectedZone,
          type: 'post',
          resource: args.kind,
          verb: 'unpause',
          group: context.state.user.selectedGroup,
          body: {kind: args.kind, apiVersion: DEFAULT_API_VERSION, metadata: {name: args.name, group: args.group}},
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
          zone: context.state.selectedZone,
  				type: 'post',
  				resource: args.kind,
  				verb: 'delete',
          group: args.workspace,
  				body: {kind: args.kind, apiVersion: DEFAULT_API_VERSION, metadata: {name: args.name, group: args.workspace}},
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
  			context.commit('selectedWorkspace', null)
        context.commit('userComplete', null)
        context.commit('resetResource', {})
        context.commit('user', {
          auth: false,
          token: null,
          name: null,
          wrongAuth: false,
          groups: [],
          selectedGroup: null,
          workspaces: []
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
          zone: context.state.selectedZone,
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
  					user.workspaces = response.data.resources.map((r) => { return r.workspace })
            if (!user.workspaces.includes(response.data.default.workspace)) {
              user.workspaces.push(response.data.default.workspace)
            }
  					user.selectedWorkspace = response.data.default.workspace
            user.tree = response.data.tree
            context.state.defaultZone = response.data.default.zone
            context.state.selectedZone = response.data.default.zone
            context.state.selectedWorkspace = response.data.default.workspace//response.data.default.workspace
  					context.commit('user', user)
            context.commit('userComplete', response)
            context.state.groupCallIndex += 1
  					if (args !== undefined && args.cb !== undefined) {
  						args.cb()
  					}
  				}
  			})
  		}
  	},
  	modules: {}
})
