'use strict'

let yaml = require('js-yaml')
const homedir = require('os').homedir()
const path = require('path')
const fs = require('fs')
const axios = require('axios')
const async = require('async')
let ignoreParser = require('gitignore-parser')
let randomstring = require('randomstring')

let cfgFolder = path.join(homedir, '.dora')
let doraConfigLocation = path.join(cfgFolder, 'config')
let appConfigLocation = path.join(cfgFolder, 'app')

let userCfg = require('../../../../lib/interfaces/user_cfg')
let appCfg = require('../../../../lib/interfaces/app_cfg')
let rfs = require('../../../../lib/interfaces/api_fs')
userCfg.yaml = yaml
userCfg.setFsModule(fs)

userCfg.profile.setCfgLocation(doraConfigLocation)
userCfg.profile.setCfgFolder(cfgFolder)


let DEFAULT_API_VERSION = 'v1'

// HTTP/S Agent
let agent = require('../../../../lib/ajax/request')
agent.configureAgent({
	axios: axios,
	DEFAULT_API_VERSION: DEFAULT_API_VERSION,
})


// API interface
let cli = require('../../../../lib/interfaces/api')
cli.api.request = agent.apiRequest


let syncProcesses = {}

function sync (src, dst, volumeSubpath) {
	console.log(src, dst, volumeSubpath)
	let randomUploadId = randomstring.generate(24) 
	try {
		let lastStep = 0
		let current = 0
		let total = 0
		let url = `${userCfg.profile.CFG.api[userCfg.profile.CFG.profile].server[0]}/${'v1.experimental'}/-/-/Volume/upload/${dst}/-/${encodeURIComponent(randomUploadId)}/-/-`
		rfs.api.remote.fs.upload({
			src: src,
			dst: volumeSubpath || '/',
			dumpFile: undefined,
			restore: undefined,
			watch: true,
			//chunkSize: cmdObj.chunkSize,
			endpoint: url,
			token: userCfg.profile.CFG.api[userCfg.profile.CFG.profile].auth.token,
			onEnd: () => {
				
			},
			log: (args) => {
				if (args.syncFile !== undefined) {
					console.log('Sync', args.syncFile)	
				}
			}
		})
	} catch (err) {console.log(err)}
}

function manageSync (syncs) {
	let presentsProcess = []
	Object.keys(syncs).forEach((syncID) => {
		let sync = syncs[syncID]
		
		sync.forEach((s, index) => {
			presentsProcess.push(syncID + s.src + s.volume + s.dst)
			if (syncProcesses[syncID + s.src + s.volume + s.dst] == undefined) {
				syncProcesses[syncID + s.src + s.volume + s.dst] = {run: s.active, from: s.src , to: s.volume.split('.')[s.volume.split('.').length - 1], path: s.dst || '/', alreadyRunning: false}
			} else {
				syncProcesses[syncID + s.src + s.volume + s.dst] = {run: s.active, from: s.src , to: s.volume.split('.')[s.volume.split('.').length - 1], path: s.dst || '/', alreadyRunning: syncProcesses[syncID + s.src + s.volume + s.dst].alreadyRunning}
			}
		})		
	})

	let keysToRemove = []
	Object.keys(syncProcesses).forEach((spId) => {
		if (!presentsProcess.includes(spId)) {
			keysToRemove.push(spId)
		}
	})
	keysToRemove.forEach((key) => {
		delete syncProcesses[key]
	})
	//console.log(syncProcesses)
	Object.keys(syncProcesses).forEach((sp) => {
		if (syncProcesses[sp].run == true && syncProcesses[sp].alreadyRunning == false) {
			syncProcesses[sp].alreadyRunning = true
			sync(syncProcesses[sp].from, syncProcesses[sp].to, syncProcesses[sp].path)	
		}
		
	})
}

module.exports.run = async () => {
	let db = await appCfg.init(appConfigLocation)
	let sync = appCfg.getDb().get('sync').value()
	userCfg.profile.get()
	manageSync(sync)
	setInterval (async () => {		
		userCfg.profile.get()
		let db2 = await appCfg.init(appConfigLocation)
		let sync2 = appCfg.getDb().get('sync').value()
		//console.log('manageSync', sync2)
		manageSync(sync2)
	}, 2000)
} 

var self = module.exports
//self.run()
