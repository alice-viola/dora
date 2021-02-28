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
let pwmConfigLocation = path.join(cfgFolder, 'config')
let appConfigLocation = path.join(cfgFolder, 'appconfig.json')

Vue.use(Vuex)

export default new Vuex.Store({
  	state: {
  		appname: 'PROMWM',
  		userCfg: {
  			path: pwmConfigLocation,
  			hasConfigFile: false,
  			cfg: null,
        profile: null,
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
  			projectView: 'project-settings',
  			selectedProjectIdx: 0,
  			selectedProjectId: null,
  			fileExplorer: [],
  			fileToShow: null,

  			// Projects - Code
  			tabs: [],
  			columns: 1,
  			onFocusTab: 0,
  			

  			// Settings page
  			selectedSettingIdx: 0,
  			settings: [
          		{name: 'Configuration file', icon: 'fas fa-file-signature', id: 'cfg'}, 
          		{name: 'Development server', icon: 'fas fa-server', id: 'devserver'},
          		{name: 'Images', icon: 'fab fa-docker', id: 'images'},
          		{name: 'Preferences', icon: 'fas fa-user-alt', id: 'preferences'},
  			],

  			projectSettings: [
          		{name: 'General', icon: 'fas fa-file-signature', id: 'general', desc: 'Name and Image'}, 
              {name: 'Local data', icon: 'fas fa-folder', id: 'local-folders', desc: 'Local root code and location'}, 
              {name: 'Sync', icon: 'fas fa-folder', id: 'remote-folders', desc: 'Remote code and location'}, 
  			],
        projectSettingView: 'general',

  			preferences: {}
  		},

  		docker: {
  			images: []
  		},
  		
  		workloads: [],
  		workloadToShow: null,
  		workloadToShowClick: '1',

  		interface: {cli: cli},
  		GE: GE,
  		projects: [],


      gpus: [],
      gpuNodeToShow: null,
      gpuNodeToClick: null,

      disks: [],
      diskToShow: null,
      diskToShowClick: null,
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
		  setWorkloadToShowClick (state, rs) {
		  	state.workloadToShowClick = rs
		  },
		  projectView (state, view) {
		  	state.projectView = view
		  },
		  workloads (state, workloads) {
		  	state.workloads = workloads
		  },
      setGpuNodeToShow (state, gpuNode) {
        state.gpuNodeToShow = gpuNode
      },
      setGpuNodeToShowClick (state, rs) {
        state.gpuNodeToClick = rs
      },
      setDiskToShow (state, disk) {
        state.diskToShow = disk
      },
      setDiskToShowClick (state, rs) {
        state.diskToShowClick = rs
      },
  	},
  	actions: {
		  initUserCfg (context, args) {
      		UserCfg.profile.init(args.profile, args.server, args.token, args.cb)
		  },
      changeProfile (context, args) {
        console.log('Switching to', context.state.userCfg.profile)
        context.state.userCfg.cfg.profile = context.state.userCfg.profile
        UserCfg.profile.save(context.state.userCfg.cfg, (err, done) => {
          console.log(err, done)
          if (err == null) {
            context.dispatch('checkUserCfg')
          }
        })
      },
		  checkUserCfg (context, args) {
		  	UserCfg.profile.setCfgFolder(cfgFolder)
		  	UserCfg.profile.setCfgLocation(context.state.userCfg.path)
  
      	let [cfgErr, _CFG] = UserCfg.profile.get()
      	if (cfgErr != null) {
      		context.state.userCfg.cfg = _CFG
          context.state.userCfg.hasConfigFile = false
          context.state.userCfg.profiles = []
          UserCfg.profile.mkdirAppHome(cfgFolder)
      	} else {
      		context.state.userCfg.cfg = _CFG
          context.state.userCfg.hasConfigFile = true
          context.state.userCfg.profiles = Object.keys(_CFG.api)
          context.state.userCfg.profile = _CFG.profile
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
		  		await context.state.app.db.set('ui.editor.theme', 'pwm-web').write()	
          await context.state.app.db.set('ui.randomNameGenerator', 'unique-names-generator').write()  
		  	}
		  	context.state.projects = await context.state.app.db.get('projects').value()
		  	context.state.docker = await context.state.app.db.get('docker').value()
		  	context.state.ui.preferences = await context.state.app.db.get('ui').value()
		  	if (args !== undefined && args.cb !== undefined) {args.cb()}
		  },
		  async savePreferences (context, args) {
		  	await context.state.app.db.get('ui').set(context.state.ui.preferences).write()
		  },
		  async saveDockerPreferences (context, args) {
		  	let dddd = await context.state.app.db.get('docker.images')
		  	await context.state.app.db.set('docker.images', context.state.docker.images).write()
		  },
		  async saveProject (context, args) {
		  	let projects = await context.state.app.db.get('projects').value()
		  	projects[context.state.ui.selectedProjectIdx] = args
		  	await context.state.app.db.set('projects', projects).write()
		  	context.state.projects = await context.state.app.db.get('projects').value()
		  },
		  async addProject (context, args) {
		  	await context.state.app.db.get('projects').push(args).write()
		  	context.state.projects = await context.state.app.db.get('projects').value()
		  },
		  async delProject (context, args) {
		  	let projects = await context.state.app.db.get('projects').value()
		  	projects.splice(args.index, 1)
		  	await context.state.app.db.set('projects', projects).write()
		  	context.state.projects = await context.state.app.db.get('projects').value()
		  },
  
		  /**
		  *	Args includes vuetify instance and theme
		  */
		  setTheme (context, args) {
		  	let isDark = true
        args.vuetify.theme.dark = true
        args.vuetify.theme.themes.dark.primary= "#F96F5D"
        return
		  	let theme = {
        			mainbackground: "#1f2430",
        			navigationDrawerMain: "#1f2430",
        			navigationDrawer: "#1f2430",
        			navigationDrawerRight: "#1f2430",
        			primary: "#F96F5D",
        			accent: "#F96F5D",
        			secondary: "#ffb74d",
        			success: "#86af3f",
        			info: "#727272",
        			warning: "#FB8C00",
        			error: "#FF5252",
		  	}
		  	switch (args.theme) {
  
		  		case 'ayu-dark':
		  			theme = {
        					mainbackground: "#0a0e14",
        					navigationDrawerMain: "#0a0e14",
        					navigationDrawer: "#0a0e14",
        					navigationDrawerRight: "#0a0e14",
        					primary: "#F96F5D",
        					accent: "#F96F5D",
        					secondary: "#ffb74d",
        					success: "#86af3f",
        					info: "#727272",
        					warning: "#FB8C00",
        					error: "#FF5252",
		  			}
		  			break
  
		  		case 'ayu-mirage':
		  			break
  
		  		case 'ayu-light':
		  			break
  
          case 'pwm-web':
            theme = {
              mainbackground: "#161616",
              navigationDrawerMain: "#101010",
              navigationDrawer: "#121212",
              navigationDrawerRight: "#121212",
              primary: "#F96F5D",
              accent: "#F96F5D",
              secondary: "#ffb74d",
              success: "#86af3f",
              info: "#727272",
              warning: "#FB8C00",
              error: "#FF5252",
            }
            break
  
          case 'discord':
            theme = {
              navigationDrawerMain: "#202225",
              navigationDrawer: "#2f3136",
              navigationDrawerRight: "#2f3136",
              mainbackground: "#36393f",
              primary: "#F96F5D",
              accent: "#F96F5D",
              secondary: "#ffb74d",
              success: "#86af3f",
              info: "#727272",
              warning: "#FB8C00",
              error: "#FF5252",
            }
            break
  
          case 'discord-inverted':
            theme = {
              navigationDrawerMain: "#36393f",//"#202225",
              navigationDrawer: "#2f3136", //"#2f3136",
              navigationDrawerRight: "#2f3136",
              mainbackground: "#202225",//"#36393f",
              primary: "#F96F5D",
              accent: "#F96F5D",
              secondary: "#ffb74d",
              success: "#86af3f",
              info: "#727272",
              warning: "#FB8C00",
              error: "#FF5252",
            }
            break
  
		  		case 'monokai':
		  			theme = {
        					mainbackground: "#272822",
        					navigationDrawerMain: "#272822",
        					navigationDrawer: "#272822",
        					navigationDrawerRight: "#272822",
        					primary: "#F96F5D",
        					accent: "#F96F5D",
        					secondary: "#ffb74d",
        					success: "#86af3f",
        					info: "#727272",
        					warning: "#FB8C00",
        					error: "#FF5252",
		  			}
		  			break
		  	}
		  	args.vuetify.theme.dark = isDark
      		Object.keys(theme).forEach (function (key) {
      		  args.vuetify.theme.themes.dark[key] = theme[key]
      		}.bind(this))
		  }
  	},
  	modules: {
	
  	}
})
