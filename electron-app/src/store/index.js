import Vue from 'vue'
import Vuex from 'vuex'

const yaml = require('js-yaml')
const path = require('path')
const homedir = require('os').homedir()
const fs = require('fs')
const dedent = require('dedent')
const axios = require('axios')

let GE = require('../../../lib/events/global')
let UserCfg = require('../../../lib/interfaces/user_cfg')
let AppCfg = require('../../../lib/interfaces/app_cfg')
UserCfg.yaml = yaml

// HTTP/S Agent
let agent = require('../../../lib/ajax/request')
agent.configureAgent({
	axios: axios,
	DEFAULT_API_VERSION: 'v1',
})

// API interface
let cli = require('../../../lib/interfaces/api')
cli.DEFAULT_API_VERSION = 'v1'
cli.api.request = agent.apiRequest

let cfgFolder = path.join(homedir, '.pwm')
let pwmConfigLocation = path.join(cfgFolder, 'config_test')
let appConfigLocation = path.join(cfgFolder, 'appconfig_test.json')

Vue.use(Vuex)

export default new Vuex.Store({
  	state: {
  		appname: 'PROMWM',
  		userCfg: {
  			path: pwmConfigLocation,
  			hasConfigFile: false,
  			cfg: null,
  			profiles: []
  		},
  		app: {
  			path: appConfigLocation,
  			hasConfigFile: false,
  			cfg: null
  		},
  		fileExtensions: {
  			py: {icon: 'fab fa-python', codeMirrorMode: 'python'},
  			js: {icon: 'fab fa-node-js', codeMirrorMode: 'javascript'},
  			csv: {icon: 'fas fa-file-csv', codeMirrorMode: 'csv'},
  		},
  		ui: {
  			leftDrawerComponent: null,

  			// Projects page
  			selectedProjectIdx: 0,
  			fileExplorer: [],
  			fileToShow: null,

  			// Projects - Workloads
  			

  			// Settings page
  			selectedSettingIdx: 0,
  			settings: [
          		{name: 'Configuration file', icon: 'fas fa-file-signature', id: 'cfg'}, 
          		{name: 'Development server', icon: 'fas fa-server', id: 'devserver'},
          		{name: 'Preferences', icon: 'fas fa-user-alt', id: 'preferences'},
  			],

  			preferences: {}
  		},
  		
  		workloadToShow: null,
  		projectView: 'projects-list',

  		interface: {cli: cli},
  		GE: GE,
  		projects: [],
  	},
  	mutations: {
		setUi (state, args) {
			let keys = Object.keys(args)
			for (var i = 0; i < keys.length; i += 1) {
				state.ui[keys[i]] = args[keys[i]]
			}
		},
		setWorkloadToShow (state, wk) {
			state.workloadToShow = wk
		},
		projectView (state, view) {
			state.projectView = view
		}	
  	},
  	actions: {
		initUserCfg (context, args) {
    		UserCfg.profile.init(args.profile, args.server, args.token, args.cb)
		},
		checkUserCfg (context, args) {
			UserCfg.profile.setCfgFolder(cfgFolder)
			UserCfg.profile.setCfgLocation(context.state.userCfg.path)
			
    		let [cfgErr, _CFG] = UserCfg.profile.get()
    		if (cfgErr != null) {
    			context.state.userCfg.cfg = _CFG
    		  	context.state.userCfg.hasConfigFile = false
    		  	context.state.userCfg.profiles = []
    		} else {
    			context.state.userCfg.cfg = _CFG
    		  	context.state.userCfg.hasConfigFile = true
    		  	context.state.userCfg.profiles = Object.keys(_CFG.api)

				agent.configureAgent({
					server: _CFG.api[_CFG.profile].server[0],
					token: _CFG.api[_CFG.profile].auth.token,
				})
    		}
    		if (args !== undefined && args.cb !== undefined) {
    			args.cb(context.state.userCfg.hasConfigFile)
    		}
		},
		async initAppCfg (context, args) {
			await AppCfg.init(context.state.app.path)
			context.state.app.db = AppCfg.getDb()
			if (await context.state.app.db.get('ui.editor.theme').value() == undefined) {
				await context.state.app.db.set('ui.editor.theme', 'ayu-dark').write()	
			}
			context.state.projects = await context.state.app.db.get('projects').value()
			context.state.ui.preferences = await context.state.app.db.get('ui').value()
			if (args !== undefined && args.cb !== undefined) {args.cb()}
		},
		async savePreferences (context, args) {
			await context.state.app.db.get('ui').set(context.state.ui.preferences).write()
		},
		async addProject (context, args) {
			await context.state.app.db.get('projects').push(args).write()
			context.state.projects = await context.state.app.db.get('projects').value()
		},
		delProject (context, args) {
			//UserCfg.project.del(args, (err, result) => {
			//	console.log(err, result)
			//})
		},

		// A P I

  	},
  	modules: {
	
  	}
})
