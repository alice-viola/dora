import Vue from 'vue'
import Vuex from 'vuex'

const yaml = require('js-yaml')
const path = require('path')
const homedir = require('os').homedir()
const fs = require('fs')

let UserCfg = require('../../../lib/interfaces/user_cfg')
UserCfg.yaml = yaml

let pwmConfigLocation = '.pwm/config'

Vue.use(Vuex)

export default new Vuex.Store({
  	state: {
  		userCfg: {
  			path: path.join(homedir, pwmConfigLocation),
  			hasConfigFile: false,
  			cfg: null,
  			profiles: []
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

  			// Settings page
  			selectedSettingIdx: 0,
  			settings: [
          		{name: 'Configuration file', icon: 'fas fa-file-signature', id: 'cfg'}, 
          		{name: 'Development server', icon: 'fas fa-server', id: 'devserver'},
          		{name: 'Preferences', icon: 'fas fa-user-alt', id: 'preferences'},
  			],

  		}
  	},
  	mutations: {
		setUi (state, args) {
			let keys = Object.keys(args)
			for (var i = 0; i < keys.length; i += 1) {
				state.ui[keys[i]] = args[keys[i]]
			}
		}	
  	},
  	actions: {
		checkUserCfg (context, args) {
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
    		}
    		if (args !== undefined && args.cb !== undefined) {
    			args.cb()
    		}
		},
		saveUserCfg (context, args) {
			UserCfg.profile.save(context.state.userCfg.cfg, (err, done) => {
    			console.log(err, done)
    			if (args !== undefined && args.cb !== undefined) {

    				args.cb(err, done)
    			}				
			})
		},
		addProject (context, args) {
			UserCfg.project.add(args, (err, result) => {
				console.log(err, result)
			})
		},
		delProject (context, args) {
			UserCfg.project.del(args, (err, result) => {
				console.log(err, result)
			})
		}
  	},
  	modules: {
	
  	}
})
