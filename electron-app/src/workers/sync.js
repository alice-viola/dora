'use strict'

let yaml = require('js-yaml')
let UserCfg = require('../../../lib/interfaces/user_cfg')
let appCfg = require('../../../lib/interfaces/app_cfg')
const homedir = require('os').homedir()
const path = require('path')
const fs = require('fs')
const axios = require('axios')
const async = require('async')
let ignoreParser = require('gitignore-parser')
let randomstring = require('randomstring')
const chokidar = require('chokidar')

let cfgFolder = path.join(homedir, '.pwm')
let pwmConfigLocation = path.join(cfgFolder, 'config')
let appConfigLocation = path.join(cfgFolder, 'appconfig.json')


UserCfg.yaml = yaml

UserCfg.profile.setCfgFolder(cfgFolder)
UserCfg.profile.setCfgLocation(pwmConfigLocation)
let [cfgErr, userCfg] = UserCfg.profile.get()


// HTTP/S Agent
let agent = require('../../../lib/ajax/request')
agent.configureAgent({
	axios: axios,
	DEFAULT_API_VERSION: 'v1',
})

let DEFAULT_API_VERSION = 'v1'
// API interface
let cli = require('../../../lib/interfaces/api')
cli.DEFAULT_API_VERSION = 'v1'
cli.api.request = agent.apiRequest

let db, projects
let syncProcesses = {}

function sync (src, dst, cmdObj) {
	
	console.log('Start one-way sync process...')
	/**
	* 	Exclude content present in ignore files:
	*	.pwmsyncignore
	*	.gitignore
	*
	* 	And always exclude:
	*	.git
	*/
	let filesToIgnore = ['.git', '.gitignore', '.dockerignore', '.pwmsyncignore']
	let gitIgnore, dockerIgnore, syncIgnore

	try {
		gitIgnore = ignoreParser.compile(fs.readFileSync(path.join(src, '.gitignore'), 'utf8'))
	} catch (err) {
		gitIgnore = ignoreParser.compile('')
	}
	try {
		let syncIgnoreBuffer = fs.readFileSync(path.join(src, '.pwmsyncignore'))
		syncIgnoreBuffer += '\n.git\n' 
		syncIgnore = ignoreParser.compile(syncIgnoreBuffer)
	} catch (err) {
		syncIgnore = ignoreParser.compile('\n.git\n')
	}

	let randomId = randomstring.generate(12)
	let volumeName = dst.split(':').length == 1 ? dst : dst.split(':')[0]
	async function copy (src, dst, cmdObj, file, cb) {
		let filepath = file.path.split(src).length == 1 ? '/' : file.path.split(src)[file.path.split(src).length -1]
		if (gitIgnore.denies(filepath) == true || syncIgnore.denies(filepath) == true) {
			cb()
			return
		}		
		if (file.event == 'unlink') {
			cb()
			return
		}	
		let toExclude = (file) => {

		}
		let index = 0
		let targetDir = dst.split(':').length == 1 ? '/' : dst.split(':')[1]
		let uploadInfo = {
			event: file.event,
			targetDir: targetDir,
			id: randomId,
			index: index,
			isDirectory: file.stats.isDirectory(),
			filename: file.path.split(src).length == 1 ? '/' : file.path.split(src)[file.path.split(src).length -1],
		}
		process.stdout.write('Copy ' + file.path)
		axios({
		  	method: 'POST',
		  	url: `${userCfg.api[userCfg.profile].server[0]}/${DEFAULT_API_VERSION}/${cmdObj.group || '-'}/Volume/upload/${volumeName}/${encodeURIComponent(JSON.stringify(uploadInfo))}`,
		  	maxContentLength: Infinity,
		  	maxBodyLength: Infinity,
		  	headers: {
		  	  	'Content-Type': 'multipart/form-data',
		  	  	'Content-Length': uploadInfo.isDirectory == true ? 0 : file.stats.size,
		  	  	'Authorization': `Bearer ${userCfg.api[userCfg.profile].auth.token}`
		  	},
		  	data: uploadInfo.isDirectory == true ? '' : fs.createReadStream(file.path)
		}).then((res) => {
			process.stdout.write(' 200, OK \n')
			index += 1
			cb(null)
		}).catch((err) => {
			if (err !== undefined && err.response !== undefined && err.response.status == 429) {
				process.stdout.write('429, Hit rate limiter... wait \n')
				setTimeout(() => {copy (src, dst, cmdObj, file, cb)}, 1000)
			} else {
				process.stdout.write('500, error, skip \n')
				index += 1
				if (err.code == 'ECONNREFUSED') {
					errorLog('Error connecting to API server ' + userCfg.api[userCfg.profile].server[0] + ' ' + err.code)
				} else {
					if (err.response !== undefined && err.response.statusText !== undefined) {
						errorLog('Error in response from API server: ' + err.response.statusText) 	
					} else {
						errorLog('Error in response from API server: Unknown') 	
					}
				}
				cb(true)
			}
		})
	}

	let syncQueue = async.queue(function(task, callback) {
		copy(src, dst, cmdObj, task, () => {
			callback(task)	
		})
	}, 1)
	chokidar.watch(src, {alwaysStat: true}).on('all', (event, path, stats) => {
	  syncQueue.push({event: event, path: path, stats: stats}, (task) => {})
	})
	process.on('SIGINT', function() {
	    console.log('Stopping sync process on remote host... wait (max 30 seconds)')
		let uploadInfo = {
			event: 'exit',
			id: randomId,
		}
		let exitTimeout = setTimeout (() => {
			process.exit(1)
		}, 30000)
		axios({
		  	method: 'POST',
		  	url: `${userCfg.api[userCfg.profile].server[0]}/${DEFAULT_API_VERSION}/${cmdObj.group || '-'}/Volume/upload/${volumeName}/${encodeURIComponent(JSON.stringify(uploadInfo))}`,
		  	maxContentLength: Infinity,
		  	maxBodyLength: Infinity,
		  	headers: {
		  	  	'Content-Type': 'multipart/form-data',
		  	  	'Content-Length': 0,
		  	  	'Authorization': `Bearer ${userCfg.api[userCfg.profile].auth.token}`
		  	},
		  	data: ''
		}).then((res) => {
			clearInterval(exitTimeout)
			process.exit(1)
		}).catch((err) => {
			clearInterval(exitTimeout)
			process.exit(1)
		})
	})
}

function manageSync () {
	let presentsProcess = []
	projects.forEach((project) => {
		presentsProcess.push(project.id)
		if (project.syncCode == true) {
			if (syncProcesses[project.id] == undefined) {
				syncProcesses[project.id] = {run: true, from: project.code , to: project.codeVolume.name + ':/' + project.id + '/code', alreadyRunning: false}
			} 
		} else {
			syncProcesses[project.id] = {run: false, from: project.code , to: project.codeVolume.name + ':/' + project.id + '/code',  alreadyRunning: false }
		}
	})
	Object.keys(syncProcesses).forEach((sp) => {
		//console.log(syncProcesses[sp])
		if (syncProcesses[sp].run == true && syncProcesses[sp].alreadyRunning == false) {
			syncProcesses[sp].alreadyRunning = true
			sync(syncProcesses[sp].from, syncProcesses[sp].to, {})	
		}
		
	})
}

module.exports.run = async () => {
	db = await appCfg.init(appConfigLocation)
	setInterval (() => {
		projects = appCfg.getDb().get('projects').value()
		manageSync()
	}, 1000)
} 	