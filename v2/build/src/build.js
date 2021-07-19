'use strict'

let fs = require('fs')
let path = require('path')
const execShPromise = require('exec-sh').promise
const Log = require('./log')
const DORA_ROOT = path.join(__dirname, '../../')


const TARGETS = {
	cli: async (PATH, options) => {
		let out
  		try {
  			out = await execShPromise('pkg -t node16-macos-x64 index.js -o ../build/builds/dora-macos-x64:' + options.version, { cwd: PATH, stdio : process.env.DEBUG ? 'inherit' : 'pipe' })
  			out = await execShPromise('pkg -t node16-linux-x64 index.js -o ../build/builds/dora-linux-x64:' + options.version, { cwd: PATH, stdio : process.env.DEBUG ? 'inherit' : 'pipe' })
  			out = await execShPromise('pkg -t node16-win-x64 index.js -o ../build/builds/dora-win-x64:' + options.version, { cwd: PATH, stdio : process.env.DEBUG ? 'inherit' : 'pipe' })
  			out = await execShPromise('docker build -f ./cli/Dockerfile ./  -t dora.cli:' + options.version, { cwd: DORA_ROOT, stdio: process.env.DEBUG ? 'inherit' : 'pipe' })
  		  	return true
  		} catch (e) {
  		  	return false
  		}
	},
	sync: async (PATH, options) => {
		let out
  		try {
  			out = await execShPromise('docker build -f ./sync/Dockerfile ./  -t dora.sync:' + options.version, { cwd: DORA_ROOT, stdio: process.env.DEBUG ? 'inherit' : 'pipe' })
  		  	return true
  		} catch (e) {
  		  	return false
  		}		
	},
	webapp: async (PATH, options) => {
		let out
  		try {
  			out = await execShPromise('npm run build', { cwd: PATH, stdio : process.env.DEBUG ? 'inherit' : 'pipe' })
  			out = await execShPromise('npm run electron:build', { cwd: PATH, stdio : process.env.DEBUG ? 'inherit' : 'pipe' })
  			//out = await execShPromise('docker build -f ./cli/Dockerfile ./  -t dora.cli:' + options.version, { cwd: DORA_ROOT, stdio: process.env.DEBUG ? 'inherit' : 'pipe' })
  		  	return true
  		} catch (e) {
  		  	return false
  		}		
	},	
	api: async (PATH, options) => {
		let out
  		try {
  			out = await execShPromise('docker build -f ./api/Dockerfile ./  -t dora.api:' + options.version, { cwd: DORA_ROOT, stdio: process.env.DEBUG ? 'inherit' : 'pipe' })
  		  	return true
  		} catch (e) {
  		  	return false
  		}			
	},
	scheduler: async (PATH, options) => {
		let out
  		try {
  			out = await execShPromise('docker build -f ./scheduler/Dockerfile ./  -t dora.scheduler:' + options.version, { cwd: DORA_ROOT, stdio: process.env.DEBUG ? 'inherit' : 'pipe' })
  		  	return true
  		} catch (e) {
  		  	return false
  		}			
	},
	creditsys: async (PATH, options) => {
		let out
  		try {
  			out = await execShPromise('docker build -f ./creditsys/Dockerfile ./  -t dora.creditsys:' + options.version, { cwd: DORA_ROOT, stdio: process.env.DEBUG ? 'inherit' : 'pipe' })
  		  	return true
  		} catch (e) {
  		  	return false
  		}			
	}
}

async function buildTarget (target, options) {
	const TARGET_ROOT = path.join(DORA_ROOT, './' + target)
	let result = await TARGETS[target](TARGET_ROOT, options)
	return true
}

async function buildTargets (targets, options) {
	let failed = 0
	for (var i = 0; i < targets.length; i += 1) {
		let target = targets[i]
		let success = await buildTarget(target, options)
		if (success == false) {
			if (options.strict !== undefined) {
				process.exitCode = 1
				break
			}
			failed += 1
		}
		Log.log('build of target', target, success == true ? 'DONE' : 'FAIL')
	}
}

function filterTargets (targets) {
	let TargetsKeys = Object.keys(TARGETS)
	return targets.filter((t) => {
		return TargetsKeys.includes(t)
	})
}

function buildSanityCheck (targets, options) {
	let hasVersion = options.version !== undefined
	return hasVersion
}

module.exports.targets = () => {
	return Object.keys(TARGETS).join('\n')
}

module.exports.build = async (targets, options) => {
	let safe = buildSanityCheck(targets, options)
	if (safe !== true) {
		Log.log('failed, missing or wrong inputs')
		process.exitCode = 1
		return
	}
	if (targets.length == 1 && targets[0] == 'All') {
		targets = Object.keys(TARGETS)
	}	
	Log.log('start build at', DORA_ROOT)
	let filteredTargets = filterTargets(targets)
	Log.log('identified',  
		filteredTargets.length, 
		'targets over', 
		targets.length, 
		'skipping', targets.length - filteredTargets.length)
	Log.log('targets:', filteredTargets.join(', '))
	await buildTargets(filteredTargets, options)
}



