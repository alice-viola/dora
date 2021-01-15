'use strict'

const yaml = require('js-yaml')
const fs = require('fs')
const axios = require('axios')
const shell = require('shelljs')
const path = require('path')
const async = require('async')
let table = require('text-table')
let asTable = require ('as-table')
let inquirer = require('inquirer')
let randomstring = require ('randomstring')
const compressing = require('compressing')
const cliProgress = require('cli-progress')
const { Command } = require('commander')
const splitFile = require('split-file')
let glob = require('glob')
const chokidar = require('chokidar')
let progress = require('progress-stream')
const PROGRAM_NAME = 'pwm'
let CFG = {}

const program = new Command()
let currentProfile = null

program.version(require('./version'), '-v, --vers', '')

let DEFAULT_API_VERSION = 'v1'
let BATCH_LIMIT = 10

const RESOURCE_ALIAS = {
	wk: 		 'Workload',
	workload: 	 'Workload',
	gpu: 	     'GPU',
	gpus: 	     'GPU',
	cpu: 	     'CPU',
	cpus: 	     'CPU',
	node: 	     'Node',
	nodes: 	     'Node',
	group: 	     'Group',
	groups:      'Group',
	user: 	     'User',
	users:       'User',
	volume:      'Volume',
	volumes:     'Volume',
	vol:    	 'Volume',
	vols:        'Volume',
	storage: 	 'Storage',
	storages: 	 'Storage',
}

function errorLog(string) {
	console.log('\x1b[33m%s\x1b[0m', string)
}

function alias (resource) {
	if (RESOURCE_ALIAS[resource] !== undefined) {
		return RESOURCE_ALIAS[resource]
	} 
	return resource
}

function webSocketForApiServer () {
	if ((CFG.api[CFG.profile].server[0]).split('https://').length == 2) {
		return 'wss://' + (CFG.api[CFG.profile].server[0]).split('https://')[1]
	} else {
		return 'ws://' + (CFG.api[CFG.profile].server[0]).split('http://')[1]
	}
}

/**
*	Get user home dir,
*	read conf file if present
*/
const homedir = require('os').homedir()
try {
	CFG = yaml.safeLoad(fs.readFileSync(homedir + '/.' + PROGRAM_NAME + '/config', 'utf8'))
	currentProfile = CFG.profile
} catch (err) {
	errorLog('You must create the configuration file @', homedir + '/.' + PROGRAM_NAME + '/config')
}

function formatResource (inData) {
	if (inData instanceof Array) {
		return inData
	}  else {
		return [inData]
	}
}

function compatibilityRequest (cb) {
	try {
		if (currentProfile == null) {
			cb(true)
			return
		}
		axios.defaults.headers.common = {'Authorization': `Bearer ${CFG.api[CFG.profile].auth.token}`}
		axios['post'](`${CFG.api[CFG.profile].server[0]}/${DEFAULT_API_VERSION}/-/api/compatibility`, 
			{data: {cliVersion: require('./version')},
			}, {timeout: 1000}).then((res) => {
			cb(res.data.compatible)
		}).catch((err) => {
			if (err.code == 'ECONNREFUSED') {
				errorLog('Error connecting to API server ' + CFG.api[CFG.profile].server[0] + ' ' + err.code)
			} else {
				if (err.response !== undefined && err.response.statusText !== undefined) {
					errorLog('Error in response from API server: ' + err.response.statusText) 	
				} else {
					errorLog('Error in response from API server: Unknown') 	
				}
			}
			cb(true)
		}) 	  		
	} catch (err) {errorLog(err)}
}

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
		axios.defaults.headers.common = {'Authorization': `Bearer ${args.token || CFG.api[CFG.profile].auth.token}`}
		axios[args.type](`${args.server || CFG.api[CFG.profile].server[0]}/${apiVersion}/${args.group || '-'}/${args.resource}/${args.verb}`, 
			bodyData, args.query, {timeout: 1000}).then((res) => {
			cb(res.data)
		}).catch((err) => {
			if (err.code == 'ECONNREFUSED') {
				errorLog('Error connecting to API server ' + CFG.api[CFG.profile].server[0])
			} else {
				if (err.response !== undefined && err.response.statusText !== undefined) {
					errorLog('Error in response from API server: ' + err.response.statusText) 	
				} else {
					errorLog('Error in response from API server: Unknown') 	
				}
			}
		}) 	
	} catch (err) {
		errorLog('CLI internal error: ' +  err)
	}
}

program.command('api-version')
.description('api info')
.action((cmdObj) => {
	apiRequest({
		type: 'post',
		resource: 'api',
		group: '-',
		verb: 'version'
	}, (data) => {
		console.log(data)
	})
})

program.command('profile <cmd> [profile]')
.option('-t, --token <token>', 'Token')
.option('-s, --api-server <apiServer>', 'Api Server')
.description('set the api profile to use')
.action((cmd, profile, cmdObj) => {
	switch (cmd) {
		case 'use':
			if (!Object.keys(CFG.api).includes(profile)) {
				errorLog('Profile ' + profile + ' not exist')
				return
			}
  			CFG.profile = profile 
  			try {
  				let newCFG = yaml.safeDump(CFG) 
  				fs.writeFile(homedir + '/.' + PROGRAM_NAME + '/config', newCFG, 'utf8', (err) => {
  					if (err) {
  						errorLog(err)
  					} else {
  						console.log('Now using profile', '*' + profile + '*')
  					}
  				})
   			} catch (err) {
   				errorLog(err)
   			}
   			break

   		case 'init':
			fs.mkdir(homedir + '/.' + PROGRAM_NAME, { recursive: true }, (err) => {
			  	if (err) throw err
			  	let jsonConfig = {}
			  	jsonConfig.profile = profile
			  	jsonConfig.api = {}
			  	jsonConfig.api[profile] = {
			  		server: [cmdObj.apiServer],
			  		auth: {
			  			token: cmdObj.token
			  		}
			  	}
  				fs.writeFile(homedir + '/.' + PROGRAM_NAME + '/config', yaml.safeDump(jsonConfig) , 'utf8', (err) => {
  					if (err) {
  						errorLog(err)
  					} else {
  						console.log('Init profile', '*' + profile + '* done')
  					}
  				})
			})
			break

   		case 'add':
			if (Object.keys(CFG.api).includes(profile)) {
				errorLog('Profile ' + profile + ' already exist')
				return
			}
			let jsonConfig = CFG
			jsonConfig.api[profile] = {
				server: [cmdObj.apiServer],
				auth: {
					token: cmdObj.token
				}
			}
  			fs.writeFile(homedir + '/.' + PROGRAM_NAME + '/config', yaml.safeDump(jsonConfig) , 'utf8', (err) => {
  				if (err) {
  					errorLog(err)
  				} else {
  					console.log('Added profile', '*' + profile + '*')
  				}
  			})
			break

		case 'del':
			if (!Object.keys(CFG.api).includes(profile)) {
				errorLog('Profile ' + profile + ' not exist')
				return
			}
			fs.mkdir(homedir + '/.' + PROGRAM_NAME, { recursive: true }, (err) => {
			  	if (err) throw err
			  	let jsonConfig = CFG
			  	delete jsonConfig.api[profile]
  				fs.writeFile(homedir + '/.' + PROGRAM_NAME + '/config', yaml.safeDump(jsonConfig) , 'utf8', (err) => {
  					if (err) {
  						errorLog(err)
  					} else {
  						console.log('Deleted profile', '*' + profile + '*')
  					}
  				})
			})
			break

		case 'using':
			console.log('You are on', '*' + CFG.profile + '*', 'profile') 
	}

})

program.command('apply')
.option('-f, --file <file>', 'File to apply')
.option('-g, --group <group>', 'Group')
.option('--v, --verbose', 'Verbose')
.description('apply')
.action((cmdObj) => {
	try {
	  	const doc = yaml.safeLoadAll(fs.readFileSync(cmdObj.file, 'utf8'))
	  	if (doc.length > BATCH_LIMIT) {
			apiRequest({
				type: 'post',
				resource: 'batch',
				group: cmdObj.group,
				verb: 'apply',
				body: doc
			}, (data) => {
				console.log(data)
			})
	  	} else {
	  		formatResource(doc).forEach((_resource) => {
				apiRequest({
					type: 'post',
					resource: _resource.kind,
					group: cmdObj.group,
					verb: 'apply',
					body: _resource
				}, (data) => {
					console.log(data)
				})
	  		})
	  	}
	} catch (e) {
	  errorLog(e)
	}
})

program.command('delete [resource] [name]')
.option('-f, --file <file>', 'File to apply')
.option('-g, --group <group>', 'Group')
.option('--v, --verbose', 'Verbose')
.description('apply')
.action((resource, name, cmdObj) => {
	try {
		if (cmdObj.file !== undefined) {
	  		const doc = yaml.safeLoadAll(fs.readFileSync(cmdObj.file, 'utf8'))
	  		if (doc.length > BATCH_LIMIT) {
				apiRequest({
					type: 'post',
					resource: 'batch',
					group: cmdObj.group,
					verb: 'delete',
					body: doc
				}, (data) => {
					console.log(data)
				})
	  		} else {
	  			formatResource(doc).forEach((_resource) => {
					apiRequest({
						type: 'post',
						resource: _resource.kind,
						group: cmdObj.group,
						verb: 'delete',
						body: _resource
					}, (data) => {
						console.log(data)
					})
	  			})
	  		}
	  	} else {
	  		if (resource == undefined || name == undefined) {
	  			console.log('You must specify a resource kind and name')
	  			process.exit()
	  		}
			resource = alias(resource)
			apiRequest({
				type: 'post',
				resource: resource,
				group: cmdObj.group,
				verb: 'delete',
				body: {kind: resource, apiVersion: DEFAULT_API_VERSION, metadata: {name: name}}
			}, (data) => {
				console.log(data)
			})
	  	}
	} catch (e) {
	  errorLog(e)
	}
})

program.command('stop [resource] [name]')
.option('-f, --file <file>', 'File to apply')
.option('-g, --group <group>', 'Group')
.option('--v, --verbose', 'Verbose')
.description('apply')
.action((resource, name, cmdObj) => {
	try {
		if (cmdObj.file !== undefined) {
	  		const doc = yaml.safeLoadAll(fs.readFileSync(cmdObj.file, 'utf8'))
	  		if (doc.length > BATCH_LIMIT) {
				apiRequest({
					type: 'post',
					resource: 'batch',
					group: cmdObj.group,
					verb: 'cancel',
					body: doc
				}, (data) => {
					console.log(data)
				})
	  		} else {
	  			formatResource(doc).forEach((_resource) => {
					apiRequest({
						type: 'post',
						resource: _resource.kind,
						group: cmdObj.group,
						verb: 'cancel',
						body: _resource
					}, (data) => {
						console.log(data)
					})
	  			})
	  		}
	  	} else {
	  		if (resource == undefined || name == undefined) {
	  			console.log('You must specify a resource kind and name')
	  			process.exit()
	  		}
			resource = alias(resource)
			apiRequest({
				type: 'post',
				resource: resource,
				group: cmdObj.group,
				verb: 'cancel',
				body: {kind: resource, apiVersion: DEFAULT_API_VERSION, metadata: {name: name}}
			}, (data) => {
				console.log(data)
			})
	  	}
	} catch (e) {
	  errorLog(e)
	}
})

program.command('get <resource> [name]')
.option('-g, --group <group>', 'Group')
.option('-j, --json', 'JSON output')
.option('-w, --watch', 'Watch')
.description('Get resource')
.action((resource, name, cmdObj) => {
	resource = alias(resource)
	if (name == undefined) {
		let fn = () => {
			apiRequest({
				type: 'post',
				resource: resource,
				group: cmdObj.group,
				verb: 'get',
			}, (data) => {
				if (!cmdObj.json) {
					console.log(asTable(data))
				} else {
					console.log(data)
				}
			})
		}
		if (cmdObj.watch) {
			console.clear()
			fn()
			setInterval (() => {
				console.clear()
				fn()
			}, 2000)
		} else {
			fn ()
		}
	} else {
		apiRequest({
			type: 'post',
			resource: resource,
			group: cmdObj.group,
			verb: 'getOne',
			body: {kind: resource, apiVersion: DEFAULT_API_VERSION, metadata: {name: name, group: cmdObj.group}}
		}, (data) => {
			if (!cmdObj.json) {
				console.log(asTable([data]))
			} else {
				console.log(data)
			}
		})
	}	
})

program.command('stat <type> [name]')
.option('-g, --group <group>', 'Group')
.option('-p, --period <period>', 'Period: 1m, 1h, 1d, 1w, 1M, 1y :: Xm ... where X is a positive integer')
.option('-j, --json', 'JSON output')
.option('-w, --watch', 'Watch')
.description('Get resource stats')
.action((type, name, cmdObj) => {
	let fn = () => {
		apiRequest({
			type: 'post',
			resource: 'cluster',
			group: cmdObj.group,
			verb: 'stat',
			body: {apiVersion: DEFAULT_API_VERSION, period: cmdObj.period || '1m', type: type, name: name}
		}, (data) => {
			console.log(data)
		})
	}
	if (cmdObj.watch) {
		console.clear()
		fn()
		setInterval (() => {
			console.clear()
			fn()
		}, 2000)
	} else {
		fn ()
	}
})

program.command('pause <resource> <name>')
.option('-g, --group <group>', 'Group')
.option('-w, --watch', 'Watch')
.description('Pause a workload')
.action((resource, name, cmdObj) => {
	resource = alias(resource)
	apiRequest({
		type: 'post',
		resource: resource,
		group: cmdObj.group,
		verb: 'pause',
		body: {kind: resource, apiVersion: DEFAULT_API_VERSION, metadata: {name: name, group: cmdObj.group}}
	}, (data) => {
		console.log(data)
	})
})

program.command('resume <resource> <name>')
.option('-g, --group <group>', 'Group')
.option('-w, --watch', 'Watch')
.description('Resume a workload')
.action((resource, name, cmdObj) => {
	resource = alias(resource)
	apiRequest({
		type: 'post',
		resource: resource,
		group: cmdObj.group,
		verb: 'unpause',
		body: {kind: resource, apiVersion: DEFAULT_API_VERSION, metadata: {name: name, group: cmdObj.group}}
	}, (data) => {
		console.log(data)
	})
})

program.command('inspect <resource> <name>')
.option('-g, --group <group>', 'Group')
.option('-l, --logs', 'Get logs')
.description('Inspect resource')
.action((resource, name, cmdObj) => {
	resource = alias(resource)
	apiRequest({
		type: 'post',
		resource: resource,
		group: cmdObj.group,
		verb: 'inspect/' + encodeURIComponent(name) + '/'
	}, (data) => {
		console.log(data)
	})
})

program.command('logs <resource> <name>')
.option('-g, --group <group>', 'Group')
.description('Logs for resource')
.action((resource, name, cmdObj) => {
	resource = alias(resource)
	apiRequest({
		type: 'post',
		resource: resource,
		group: cmdObj.group,
		verb: 'logs/' + encodeURIComponent(name) + '/'
	}, (data) => {
		console.log(data)
	})
})

program.command('commit <resource> <name> [repo]')
.option('-g, --group <group>', 'Group')
.description('Commit a container, both to local node or to a Docker Registry.')
.action((resource, name, repo, cmdObj) => {
	resource = alias(resource)
	apiRequest({
		type: 'post',
		resource: resource,
		group: cmdObj.group,
		verb: 'commit/' + encodeURIComponent(name) + '/' + encodeURIComponent(repo || '-') + '/'
	}, (data) => {
		console.log(data)
	})
})

program.command('top <resource> <name>')
.option('-g, --group <group>', 'Group')
.description('Logs for resource')
.action((resource, name, cmdObj) => {
	resource = alias(resource)
	apiRequest({
		type: 'post',
		resource: resource,
		group: cmdObj.group,
		verb: 'top/' + encodeURIComponent(name) + '/'
	}, (data) => {
		console.log(data)
	})
})

program.command('describe <resource> <name>')
.option('-g, --group <group>', 'Group')
.option('-t, --table', 'Table output')
.description('Get resource')
.action((resource, name, cmdObj) => {
	resource = alias(resource)
	apiRequest({
		type: 'post',
		resource: resource,
		group: cmdObj.group,
		verb: 'describe',
		body: {kind: resource, apiVersion: DEFAULT_API_VERSION, metadata: {name: name, group: cmdObj.group}}
	}, (data) => {
		if (cmdObj.table) {
			console.log(asTable([data]))
		} else {
			console.log(data)
		}
	})
})

/**
*	Sync
*/

program.command('sync <src> <dst>')
.option('-g, --group <group>', 'Group')
.description('real time sync between a local folder and a volume')
.action(async (src, dst, cmdObj) => {
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
		  	url: `${CFG.api[CFG.profile].server[0]}/${DEFAULT_API_VERSION}/${cmdObj.group || '-'}/Volume/upload/${volumeName}/${encodeURIComponent(JSON.stringify(uploadInfo))}`,
		  	maxContentLength: Infinity,
		  	maxBodyLength: Infinity,
		  	headers: {
		  	  	'Content-Type': 'multipart/form-data',
		  	  	'Content-Length': uploadInfo.isDirectory == true ? 0 : file.stats.size,
		  	  	'Authorization': `Bearer ${CFG.api[CFG.profile].auth.token}`
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
					errorLog('Error connecting to API server ' + CFG.api[CFG.profile].server[0] + ' ' + err.code)
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
		  	url: `${CFG.api[CFG.profile].server[0]}/${DEFAULT_API_VERSION}/${cmdObj.group || '-'}/Volume/upload/${volumeName}/${encodeURIComponent(JSON.stringify(uploadInfo))}`,
		  	maxContentLength: Infinity,
		  	maxBodyLength: Infinity,
		  	headers: {
		  	  	'Content-Type': 'multipart/form-data',
		  	  	'Content-Length': 0,
		  	  	'Authorization': `Bearer ${CFG.api[CFG.profile].auth.token}`
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
})

/**
*	Copy
*/
program.command('cp <src> <dst>')
.option('-g, --group <group>', 'Group')
.option('-c, --chunk <chunk>', 'Chunk size in MB, default 100MB')
.description('copy dir from local to volume folder')
.action(async (src, dst, cmdObj) => {
	let tmp = require('os').tmpdir()
	const bar1 = new cliProgress.SingleBar({
		format: 'Copy |' + '{bar}' + '| {percentage}% || {phase}',
		}, cliProgress.Presets.shades_classic)
	bar1.start(120, 0, {
		phase: 'Compressing'
	})
	let archieveName = tmp + '/pwm-vol-' + randomstring.generate(12)
	let dstName = dst
	bar1.update(5, {phase: 'Compressing'})
	await compressing.tar.compressDir(src, archieveName)
	bar1.update(5, {phase: 'Splitting'})
	bar1.update(10)

	let copy = async function (ary) {
		bar1.start(ary.length, 0, {
			phase: 'Sending'
		})
		let dstName = dst
		var str = progress({
		    length: ary.length,
		    time: 10
		})
		let onlyFiles = ary
		let queue = []
		let id = randomstring.generate(12)
		onlyFiles.forEach((file, index) => {
			queue.push((cb) => {
				const size = fs.statSync(file)
				bar1.update(index, {phase: 'copy ' + index + '/' + onlyFiles.length + '\t' + parseInt((size.size / 1000000)) + 'MB'})
				axios({
				  method: 'POST',
				  url: `${CFG.api[CFG.profile].server[0]}/${DEFAULT_API_VERSION}/${cmdObj.group || '-'}/Volume/upload/${dstName}/${id}/${onlyFiles.length}/${index + 1}/`,
				  maxContentLength: Infinity,
				  maxBodyLength: Infinity,
				  headers: {
				    'Content-Type': 'multipart/form-data',
				    'Content-Length': size.size,
				    'Authorization': `Bearer ${CFG.api[CFG.profile].auth.token}`
				  },
				  data: fs.createReadStream(file)
				}).then((res) => {
					cb(null)
				}).catch((err) => {
					if (err.code == 'ECONNREFUSED') {
						errorLog('Error connecting to API server ' + CFG.api[CFG.profile].server[0] + ' ' + err.code)
					} else {
						if (err.response !== undefined && err.response.statusText !== undefined) {
							errorLog('Error in response from API server: ' + err.response.statusText) 	
						} else {
							errorLog('Error in response from API server: Unknown') 	
						}
					}
					cb(true)
				})
			})
		})
		async.series(queue, (err, data) => {
			bar1.update(90, {phase: 'Transferring to container'})
			axios({
			  method: 'POST',
			  url: `${CFG.api[CFG.profile].server[0]}/${DEFAULT_API_VERSION}/${cmdObj.group || '-'}/Volume/upload/${dstName}/${id}/${onlyFiles.length}/end/`,
			  maxContentLength: Infinity,
			  maxBodyLength: Infinity,
			  headers: {
			    'Content-Type': 'multipart/form-data',
			    'Authorization': `Bearer ${CFG.api[CFG.profile].auth.token}`
			  }
			}).then((res) => {
				fs.unlink(archieveName, () => {})
				console.log(res.data)
				process.exit()
			}).catch((err) => {
				fs.unlink(archieveName, () => {})
				process.exit()
			})
		})
	}
	await splitFile.splitFileBySize(archieveName, cmdObj.chunk !== undefined ? parseInt(cmdObj.chunk * 1000000) : 100000000).then((names) => {
	    copy(names)	
	}).catch((err) => {
	    console.log('Split error: ', err);
	})
})

/**
*	Download
*/
program.command('download <dst> <src>')
.option('-g, --group <group>', 'Group')
.description('copy dir from remote volumes to local folder. <dst> is local path, <src> is volumeName')
.action(async (dst, src, cmdObj) => {
	let tmp = require('os').tmpdir()
	let archieveName = tmp + '/pwm-vol-' + randomstring.generate(12)
	let dstName = dst
	let volumeData = {
		name: dstName.split(':')[0],
		subPath: dstName.split(':')[1] || ''
	}
	volumeData = encodeURIComponent(JSON.stringify(volumeData))
	axios({
	  method: 'POST',
	  url: `${CFG.api[CFG.profile].server[0]}/${DEFAULT_API_VERSION}/${cmdObj.group || '-'}/Volume/download/${volumeData}/`,
	  responseType: 'stream',
	  headers: {
	    'Authorization': `Bearer ${CFG.api[CFG.profile].auth.token}`
	  }
	}).then(async (res) => {
		fs.mkdir(src, { recursive: true }, (err) => {
			let writeStream = fs.createWriteStream(path.join(src + '.compressed'))
			res.data.pipe(writeStream)
	  		let error = null;
	  		writeStream.on('error', err => {
	  		  	error = err;
	  		  	writeStream.close()
	  		})
	  		writeStream.on('close', async () => {
	  		  	if (!error) {
	  		    	await compressing.tar.uncompress(path.join(src + '.compressed'), path.join(src))
	  		    	fs.unlink(path.join(src + '.compressed'), () => {})
	  		    	console.log('Done')
	  		  	}
	  		})
	  	})
	}).catch((err) => {
		if (err.response.status == '404') {
			errorLog('Volume or folder not found')
		} 
	})
})

/**
*	Ls volume content
*/

program.command('ls <dst>')
.option('-g, --group <group>', 'Group')
.description('list files and folders from volume. <dst> is local path')
.action(async (dst, cmdObj) => {
	let dstName = dst
	let volumeData = {
		name: dstName.split(':')[0],
		path: dstName.split(':')[1] || ''
	}
	volumeData = encodeURIComponent(JSON.stringify(volumeData))
	axios({
	  method: 'POST',
	  url: `${CFG.api[CFG.profile].server[0]}/${DEFAULT_API_VERSION}/${cmdObj.group || '-'}/Volume/ls/${volumeData}/`,
	  headers: {
	    'Authorization': `Bearer ${CFG.api[CFG.profile].auth.token}`
	  }
	}).then(async (res) => {
		console.log(res.data)
	}).catch((err) => {
		if (err.response.status == '404') {
			errorLog('Volume or folder not found')
		} 
	})
})

/**
*	Shell
*/
program.command('shell <resource> <containername>')
.option('-g, --group <group>', 'Group')
.action((resource, containername, cmdObj) => {
	var DockerClient = require('./src/web-socket-docker-client')
	function main (containerId, nodeName, authToken) {
	  	var client = new DockerClient({
	  	  	url: webSocketForApiServer() + '/pwm/cshell',
	  	  	tty: true,
	  	  	command: 'bash',
	  	  	container: containerId,
	  	  	containername: containername,
	  	  	group: cmdObj.group || '-',
	  	  	node: nodeName,
	  	  	token: authToken
	  	})
	  	return client.execute().then(() => {
    		// magic trick
    		process.stdin.setRawMode(true)
	  	  	process.stdin.pipe(client.stdin)
	  	  	client.stdout.pipe(process.stdout)
	  	  	client.stderr.pipe(process.stderr)
	  	  	client.on('exit', (code) => {
	  	  	  	process.exit(code)
	  	  	})
	  	  	client.resize(process.stdout.rows, process.stdout.columns)
	  	  	process.stdout.on('resize', () => {
	  	  	  	client.resize(process.stdout.rows, process.stdout.columns)
	  	  	})
	  	})
	}
	resource = alias(resource)
	apiRequest({
		type: 'post',
		resource: resource,
		group: cmdObj.group,
		verb: 'getOne',
		body: {kind: resource, apiVersion: DEFAULT_API_VERSION, metadata: {name: containername, group: cmdObj.group}}
	}, (res) => {
		if (res.c_id == undefined || res.c_id == null) {
			errorLog('Workload ' + containername + ' is not running')
			process.exit()
			return
		}
		apiRequest({
			type: 'post',
			resource: resource,
			group: cmdObj.group,
			verb: 'token',
		}, (resAuth) => {
			if (res) {
				console.log('Waiting connection...')
				try {
					main(res.c_id, res.node, resAuth)	
				} catch (err) {}
			}
		})
	})
})

/**
*	token create <username>
*/
program.command('token <action> <userGroup> <user> [defaultGroup] [id]')
.option('-g, --group <group>', 'Group')
.description('token fn')
.action((action, user, userGroup, defaultGroup, id) => {
	apiRequest({
		type: 'post',
		resource: 'token',
		group: 'pwm.all',
		verb: action,
		body: {apiVersion: 'v1', kind: 'token', metadata: {group: 'pwm.all'}, user: user, userGroup: userGroup, defaultGroup: defaultGroup, id: id}
	}, (data) => {
		console.log(data)
	})
})

compatibilityRequest((data) => {
	if (data == false) {
		errorLog('Incompatible cli version with api version. Update the cli')
	}
	program.parse(process.argv)
})

process.on('unhandledRejection', (reason, p) => {
	console.log(p)
  errorLog('Something went wrong... exit'+ reason)
})