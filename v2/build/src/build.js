'use strict'

let fs = require('fs')
let path = require('path')
const execShPromise = require('exec-sh').promise
const Log = require('./log')
const DORA_ROOT = path.join(__dirname, '../../')

let toPush = []

async function makeBuildFolder (version) {
	let PATH = path.join(DORA_ROOT, '/build/_homebuilds')
	await execShPromise('mkdir -p ' + version, { cwd: PATH, stdio : process.env.DEBUG ? 'inherit' : 'pipe' })
	await execShPromise('mkdir -p ' + version + '/cli/macos-x64', { cwd: PATH, stdio : process.env.DEBUG ? 'inherit' : 'pipe' })
	await execShPromise('mkdir -p ' + version + '/cli/linux-x64', { cwd: PATH, stdio : process.env.DEBUG ? 'inherit' : 'pipe' })
	await execShPromise('mkdir -p ' + version + '/cli/win-x64', { cwd: PATH, stdio : process.env.DEBUG ? 'inherit' : 'pipe' })
	await execShPromise('mkdir -p ' + version + '/electronapp', { cwd: PATH, stdio : process.env.DEBUG ? 'inherit' : 'pipe' })
	await execShPromise('mkdir -p ' + version + '/electronapp/macos-x64', { cwd: PATH, stdio : process.env.DEBUG ? 'inherit' : 'pipe' })
	await execShPromise('mkdir -p ' + version + '/electronapp/win-x64', { cwd: PATH, stdio : process.env.DEBUG ? 'inherit' : 'pipe' })
	await execShPromise('mkdir -p ' + version + '/electronapp/linux-x64', { cwd: PATH, stdio : process.env.DEBUG ? 'inherit' : 'pipe' })
}

async function updatePackageVersion (PATH, version) {
	try {
		let packageFile = path.join(PATH, 'package.json')
		let file = fs.readFileSync(packageFile)
		let json = JSON.parse(file)
		json.version = version
		let jsonString = JSON.stringify(json, null, 4)
		await fs.writeFile(packageFile, jsonString, (err) => {
			if (err !== null) {
				Log.err(err)	
			}
		})
	} catch (err) {}
}	

async function push (registry, image) {
	let out
  	try {
  		out = await execShPromise('docker tag ' + image + ' ' + registry + '/' + image, { cwd: DORA_ROOT, stdio: process.env.DEBUG ? 'inherit' : 'pipe' })
  		out = await execShPromise('docker push '+ registry + '/' + image, { cwd: DORA_ROOT, stdio: process.env.DEBUG ? 'inherit' : 'pipe' })
  	  	return true
  	} catch (e) {
  	  	return false
  	}	
}

const TARGETS = {
	cli: async (PATH, options) => {
		await updatePackageVersion(PATH, options.version)
		let out
  		try {
  			out = await execShPromise('pkg -t node16-macos-x64 index.js -o ../build/_homebuilds/' + options.version + '/cli/macos-x64/dora', { cwd: PATH, stdio : process.env.DEBUG ? 'inherit' : 'pipe' })
  			out = await execShPromise('pkg -t node16-linux-x64 index.js -o ../build/_homebuilds/' + options.version + '/cli/linux-x64/dora', { cwd: PATH, stdio : process.env.DEBUG ? 'inherit' : 'pipe' })
  			out = await execShPromise('pkg -t node16-win-x64 index.js -o ../build/_homebuilds/' + options.version + '/cli/win-x64/dora', { cwd: PATH, stdio : process.env.DEBUG ? 'inherit' : 'pipe' })
  			out = await execShPromise('docker build -f ./cli/Dockerfile ./  -t dora.cli:' + options.version, { cwd: DORA_ROOT, stdio: process.env.DEBUG ? 'inherit' : 'pipe' })
  		  	toPush.push('dora.cli:' + options.version)
  		  	return true
  		} catch (e) {
  		  	return false
  		}
	},
	sync: async (PATH, options) => {
		await updatePackageVersion(PATH, options.version)
		let out
  		try {
  			out = await execShPromise('docker build -f ./sync/Dockerfile ./  -t dora.sync:' + options.version, { cwd: DORA_ROOT, stdio: process.env.DEBUG ? 'inherit' : 'pipe' })
  		  	toPush.push('dora.sync:' + options.version)
  		  	return true
  		} catch (e) {
  		  	return false
  		}		
	},	
	webapp: async (PATH, options) => {
		await updatePackageVersion(PATH, options.version)
		let out
  		try {
  			out = await execShPromise('npm run build', { cwd: PATH, stdio : process.env.DEBUG ? 'inherit' : 'pipe' })
  			out = await execShPromise('cp -R webapp/dist/* api/public/', { cwd: DORA_ROOT, stdio: process.env.DEBUG ? 'inherit' : 'pipe' })
  		  	return true
  		} catch (e) {
  		  	return false
  		}		
	},	
	electronapp: async (PATH, options) => {
		// override path
		PATH = path.join(DORA_ROOT, './webapp')
		await updatePackageVersion(PATH, options.version)
		let out
  		try {
  			// out = await execShPromise('npm run build', { cwd: PATH, stdio : process.env.DEBUG ? 'inherit' : 'pipe' })
  			out = await execShPromise('npm run build-linux', { cwd: PATH, stdio : process.env.DEBUG ? 'inherit' : 'pipe' })
  			out = await execShPromise('mv ./dist_electron/dora.webapp_' + options.version + '_amd64.deb ../build/_homebuilds/' + options.version + '/electronapp/linux-x64/appdora', { cwd: PATH, stdio : process.env.DEBUG ? 'inherit' : 'pipe' })
  			out = await execShPromise('npm run build-mac', { cwd: PATH, stdio : process.env.DEBUG ? 'inherit' : 'pipe' })
  			out = await execShPromise('mv ./dist_electron/dora.webapp-' + options.version + '.dmg ../build/_homebuilds/' + options.version + '/electronapp/macos-x64/appdora', { cwd: PATH, stdio : process.env.DEBUG ? 'inherit' : 'pipe' })
  			out = await execShPromise('npm run build-win', { cwd: PATH, stdio : process.env.DEBUG ? 'inherit' : 'pipe' })
  			out = await execShPromise('mv ./dist_electron/"dora.webapp Setup ' + options.version + '.exe" ../build/_homebuilds/' + options.version + '/electronapp/win-x64/appdora', { cwd: PATH, stdio : process.env.DEBUG ? 'inherit' : 'pipe' })
  		  	return true
  		} catch (e) {
  		  	return false
  		}		
	},		
	api: async (PATH, options) => {
		await updatePackageVersion(PATH, options.version)
		let out
  		try {
  			out = await execShPromise('docker build -f ./api/Dockerfile ./  -t dora.api:' + options.version, { cwd: DORA_ROOT, stdio: process.env.DEBUG ? 'inherit' : 'pipe' })
  		  	toPush.push('dora.api:' + options.version)
  		  	return true
  		} catch (e) {
  		  	return false
  		}			
	},
	node: async (PATH, options) => {
		await updatePackageVersion(PATH, options.version)
		let out
  		try {
  			out = await execShPromise('docker build -f ./node/Dockerfile ./  -t dora.node:' + options.version, { cwd: DORA_ROOT, stdio: process.env.DEBUG ? 'inherit' : 'pipe' })
  		  	toPush.push('dora.node:' + options.version)
  		  	return true
  		} catch (e) {
  		  	return false
  		}			
	},	
	scheduler: async (PATH, options) => {
		await updatePackageVersion(PATH, options.version)
		let out
  		try {
  			out = await execShPromise('docker build -f ./scheduler/Dockerfile ./  -t dora.scheduler:' + options.version, { cwd: DORA_ROOT, stdio: process.env.DEBUG ? 'inherit' : 'pipe' })
  			toPush.push('dora.scheduler:' + options.version)
  		  	return true
  		} catch (e) {
  		  	return false
  		}			
	},
	creditsys: async (PATH, options) => {
		await updatePackageVersion(PATH, options.version)
		let out
  		try {
  			out = await execShPromise('docker build -f ./creditsys/Dockerfile ./  -t dora.creditsys:' + options.version, { cwd: DORA_ROOT, stdio: process.env.DEBUG ? 'inherit' : 'pipe' })
  		  	toPush.push('dora.creditsys:' + options.version)
  		  	return true
  		} catch (e) {
  		  	return false
  		}			
	},
	downloadpage: async (PATH, options) => {
		await updatePackageVersion(PATH, options.version)
		let out
  		try {
  			out = await execShPromise('docker build -f ./downloadpage/Dockerfile ./  -t dora.downloadpage:' + options.version, { cwd: DORA_ROOT, stdio: process.env.DEBUG ? 'inherit' : 'pipe' })
  		  	toPush.push('dora.downloadpage:' + options.version)
  		  	return true
  		} catch (e) {
  		  	return false
  		}			
	}	
}

async function buildTarget (target, options) {
	let TARGET_ROOT = path.join(DORA_ROOT, './' + target)
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
	if (options.registry !== undefined) {
		for (var r = 0; r < options.registry.length; r += 1) {
			for (var i = 0; i < toPush.length; i += 1) {
				await push(options.registry[r], toPush[i])
			}
		}
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
	if (filteredTargets.includes('cli') || filteredTargets.includes('electronapp')) {
		await makeBuildFolder(options.version)	
	}
	await buildTargets(filteredTargets, options)
}



