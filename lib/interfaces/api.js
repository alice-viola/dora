'use strict'

module.exports.DEFAULT_API_VERSION = 'v1'

module.exports.api = {}
module.exports.api.request = () => {}

module.exports.api.version = (cb) => {
	self.api.request({
		type: 'post',
		resource: 'api',
		group: '-',
		verb: 'version'
	}, (err, data) => {
		cb(err, data)
	})	
}

module.exports.api.compatibility = () => {

}

module.exports.api.apply = {}
module.exports.api.apply.one = (doc, options, cb) => {
	console.log(self.api.request)
	self.api.request({
		type: 'post',
		resource: doc.kind,
		group: options.group,
		verb: 'apply',
		body: doc
	}, (err, data) => {
		cb(err, data)
	})	
}

module.exports.api.apply.batch = (docs, options, cb) => {
	self.api.request({
		type: 'post',
		resource: 'batch',
		group: options.group,
		verb: 'apply',
		body: docs
	}, (err, data) => {
		cb(err, data)
	})	
}

module.exports.api.remove = {}
module.exports.api.remove.one = (doc, options, cb) => {
	self.api.request({
		type: 'post',
		resource: doc.kind,
		group: options.group,
		verb: 'delete',
		body: doc
	}, (err, data) => {
		cb(err, data)
	})	
}

module.exports.api.remove.batch = (docs, options, cb) => {
	self.api.request({
		type: 'post',
		resource: 'batch',
		group: options.group,
		verb: 'delete',
		body: docs
	}, (err, data) => {
		cb(err, data)
	})
}

module.exports.api.remove.named = (kind, name, options, cb) => {
	self.api.request({
		type: 'post',
		resource: kind,
		group: options.group,
		verb: 'delete',
		body: {
			kind: kind, 
			apiVersion: self.DEFAULT_API_VERSION, 
			metadata: {name: name}}
	}, (err, data) => {
		cb(err, data)
	})
}

module.exports.api.stop = {}
module.exports.api.stop.one = (doc, options, cb) => {
	self.api.request({
		type: 'post',
		resource: doc.kind,
		group: options.group,
		verb: 'cancel',
		body: doc
	}, (err, data) => {
		cb(err, data)
	})	
}

module.exports.api.stop.batch = (docs, options, cb) => {
	self.api.request({
		type: 'post',
		resource: 'batch',
		group: options.group,
		verb: 'cancel',
		body: docs
	}, (err, data) => {
		cb(err, data)
	})
}

module.exports.api.stop.named = (name, options, cb) => {
	self.api.request({
		type: 'post',
		resource: 'Workload',
		group: options.group,
		verb: 'cancel',
		body: {
			kind: 'Workload', 
			apiVersion: self.DEFAULT_API_VERSION, 
			metadata: {name: name}}
	}, (err, data) => {
		cb(err, data)
	})
}


module.exports.api.get = {}
module.exports.api.get.one = (kind, options, cb) => {
	self.api.request({
		type: 'post',
		resource: kind,
		group: options.group,
		verb: 'get'
	}, (err, data) => {
		cb(err, data)
	})	
}

module.exports.api.get.named = (kind, name, options, cb) => {
	self.api.request({
		type: 'post',
		resource: kind,
		group: options.group,
		verb: 'getOne',
		body: {
			kind: kind, 
			apiVersion: self.DEFAULT_API_VERSION, 
			metadata: {name: name, group: options.group}}
	}, (err, data) => {
		cb(err, data)
	})
}

module.exports.api.get.stat = (type, name, options, cb) => {
	self.api.request({
		type: 'post',
		resource: 'cluster',
		group: options.group,
		verb: 'stat',
		body: {
			apiVersion: self.DEFAULT_API_VERSION, 
			period: options.period || '1m', 
			type: type, name: name}
	}, (err, data) => {
		cb(err, data)
	})
}

module.exports.api.describe = {}
module.exports.api.describe.one = (kind, name, options, cb) => {
	self.api.request({
		type: 'post',
		resource: kind,
		group: options.group,
		verb: 'describe',
		body: {
			kind: kind, 
			apiVersion: self.DEFAULT_API_VERSION, 
			metadata: {name: name, group: options.group}}
	}, (err, data) => {
		cb(err, data)
	})

}

module.exports.api.pause = {}
module.exports.api.pause.one = (name, options, cb) => {
	self.api.request({
		type: 'post',
		resource: 'Workload',
		group: options.group,
		verb: 'pause',
		body: {
			kind: 'Workload', 
			apiVersion: self.DEFAULT_API_VERSION, 
			metadata: {name: name, group: options.group}}
	}, (err, data) => {
		cb(err, data)
	})
}

module.exports.api.resume = {}
module.exports.api.resume.one = (name, options, cb) => {
	self.api.request({
		type: 'post',
		resource: 'Workload',
		group: options.group,
		verb: 'unpause',
		body: {
			kind: 'Workload', 
			apiVersion: self.DEFAULT_API_VERSION, 
			metadata: {name: name, group: options.group}}
	}, (err, data) => {
		cb(err, data)
	})
}

module.exports.api.inspect = {}
module.exports.api.inspect.one = (name, options, cb) => {
	self.api.request({
		type: 'post',
		resource: 'Workload',
		group: options.group,
		verb: 'inspect/' + encodeURIComponent(name) + '/'
	}, (err, data) => {
		cb(err, data)
	})
}

module.exports.api.logs = {}
module.exports.api.logs.one = (name, options, cb) => {
	self.api.request({
		type: 'post',
		resource: 'Workload',
		group: options.group,
		verb: 'logs/' + encodeURIComponent(name) + '/'
	}, (err, data) => {
		cb(err, data)
	})
}

module.exports.api.top = {}
module.exports.api.top.one = (name, options, cb) => {
	self.api.request({
		type: 'post',
		resource: 'Workload',
		group: options.group,
		verb: 'top/' + encodeURIComponent(name) + '/'
	}, (err, data) => {
		cb(err, data)
	})
}

module.exports.api.commit = {}
module.exports.api.commit.one = (name, repo, options, cb) => {
	self.api.request({
		type: 'post',
		resource: 'Workload',
		group: options.group,
		verb: 'commit/' + encodeURIComponent(name) + '/' + encodeURIComponent(repo || '-') + '/'
	}, (err, data) => {
		cb(err, data)
	})
}

module.exports.api.token = {}
module.exports.api.token.create = (userGroup, user, defaultGroup, id, cb) => {
	self.api.request({
		type: 'post',
		resource: 'token',
		group: 'pwm.all', //TODO, change to shared events
		verb: 'create',
		body: {
			kind: 'token', 
			apiVersion: self.DEFAULT_API_VERSION, 
			user: user, userGroup: userGroup, defaultGroup: defaultGroup, id: id}
	}, (err, data) => {
		cb(err, data)
	})
}

module.exports.api.sync = (src, dst, cmdObj) => {
	let ignoreParser = require('gitignore-parser')
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
		  	url: `${userCfg.profile.CFG.api[userCfg.profile.CFG.profile].server[0]}/${DEFAULT_API_VERSION}/${cmdObj.group || '-'}/Volume/upload/${volumeName}/${encodeURIComponent(JSON.stringify(uploadInfo))}`,
		  	maxContentLength: Infinity,
		  	maxBodyLength: Infinity,
		  	headers: {
		  	  	'Content-Type': 'multipart/form-data',
		  	  	'Content-Length': uploadInfo.isDirectory == true ? 0 : file.stats.size,
		  	  	'Authorization': `Bearer ${userCfg.profile.CFG.api[userCfg.profile.CFG.profile].auth.token}`
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
					errorLog('Error connecting to API server ' + userCfg.profile.CFG.api[userCfg.profile.CFG.profile].server[0] + ' ' + err.code)
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
		  	url: `${userCfg.profile.CFG.api[userCfg.profile.CFG.profile].server[0]}/${DEFAULT_API_VERSION}/${cmdObj.group || '-'}/Volume/upload/${volumeName}/${encodeURIComponent(JSON.stringify(uploadInfo))}`,
		  	maxContentLength: Infinity,
		  	maxBodyLength: Infinity,
		  	headers: {
		  	  	'Content-Type': 'multipart/form-data',
		  	  	'Content-Length': 0,
		  	  	'Authorization': `Bearer ${userCfg.profile.CFG.api[userCfg.profile.CFG.profile].auth.token}`
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

module.exports.api.cp = (doc, options, cb) => {

}

module.exports.api.download = (doc, options, cb) => {

}

module.exports.api.shell = {}
module.exports.api.shell.token = (cb) => {
	self.api.request({
		type: 'post',
		resource: 'Workload',
		group: '-', 
		verb: 'token'
	}, (err, data) => {
		cb(err, data)
	})
}
module.exports.api.shell.terminal = (doc, options, cb) => {

}

module.exports.api.shell.xterm = (doc, options, cb) => {

}

var self = module.exports






