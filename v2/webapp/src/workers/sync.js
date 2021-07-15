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

let userCfg = require('../../../../lib/interfaces/user_cfg')
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

function sync (src, dst, cmdObj) {
	
	let randomUploadId = randomstring.generate(24) 
	try {
		let lastStep = 0
		let current = 0
		let total = 0
		let url = `${userCfg.profile.CFG.api[userCfg.profile.CFG.profile].server[0]}/${'v1.experimental'}/-/Volume/upload/${volume}/-/${encodeURIComponent(randomUploadId)}/-/-`
		rfs.api.remote.fs.upload({
			src: src,
			dst: volumeSubpath || '/',
			dumpFile: undefined,
			restore: undefined,
			watch: true,
			chunkSize: cmdObj.chunkSize,
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
	} catch (err) {errorLog(err)}
}

function manageSync () {
	let currentProfileName = userCfg.profile.using()
	let profile = userCfg.profile.getOne(currentProfileName)
	let token = profile.auth.token[0]
	let apiServer = profile.server[0]
	/**
	* Get running wk
	*/ 
	


	return
	let presentsProcess = []
	projects.forEach((project) => {
		if (project.syncCode == true) {
			presentsProcess.push(project.id)
			if (syncProcesses[project.id] == undefined) {
				syncProcesses[project.id] = {run: true, from: project.code , to: project.codeVolume.name + ':/' + project.id + '/code', alreadyRunning: false}
			} else {
				syncProcesses[project.id] = {run: true, from: project.code , to: project.codeVolume.name + ':/' + project.id + '/code', alreadyRunning: syncProcesses[project.id].alreadyRunning}
			}
		} 
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
	Object.keys(syncProcesses).forEach((sp) => {
		if (syncProcesses[sp].run == true && syncProcesses[sp].alreadyRunning == false) {
			syncProcesses[sp].alreadyRunning = true
			sync(syncProcesses[sp].from, syncProcesses[sp].to, {})	
		}
		
	})
}

module.exports.run = async () => {
	manageSync()
	setInterval (async () => {
		console.log('manageSync')
		//let db = await appCfg.init(appConfigLocation)
		//let projects = appCfg.getDb().get('projects').value()
		//manageSync(projects)
	}, 10000)
} 	