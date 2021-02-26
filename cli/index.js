'use strict'

let DEFAULT_API_VERSION = 'v1'
let BATCH_LIMIT = 10
const PROGRAM_NAME = 'pwm'

const yaml = require('js-yaml')
const fs = require('fs')
const axios = require('axios')
const path = require('path')
const async = require('async')
let table = require('text-table')
let asTable = require ('as-table')
let randomstring = require ('randomstring')
const compressing = require('compressing')
const cliProgress = require('cli-progress')
const { Command } = require('commander')
const splitFile = require('split-file')
let glob = require('glob')
const chokidar = require('chokidar')
let progress = require('progress-stream')


/*
*	Loading common libraries
*/

// HTTP/S Agent
let agent = require('../lib/ajax/request')
agent.configureAgent({
	axios: axios,
	DEFAULT_API_VERSION: DEFAULT_API_VERSION,
})

// API interface
let cli = require('../lib/interfaces/api')
cli.DEFAULT_API_VERSION = DEFAULT_API_VERSION
cli.api.request = agent.apiRequest

let rfs = require('../lib/interfaces/api_fs')

// Configuration file interface
let userCfg = require('../lib/interfaces/user_cfg')
userCfg.yaml = yaml


const program = new Command()
program.version(require('./version'), '-v, --vers', '')

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
	if ((userCfg.profile.CFG.api[userCfg.profile.CFG.profile].server[0]).split('https://').length == 2) {
		return 'wss://' + (userCfg.profile.CFG.api[userCfg.profile.CFG.profile].server[0]).split('https://')[1]
	} else {
		return 'ws://' + (userCfg.profile.CFG.api[userCfg.profile.CFG.profile].server[0]).split('http://')[1]
	}
}

/*
*	Get user home dir,
*	read conf file if present
*/
const homedir = require('os').homedir()
userCfg.profile.setCfgLocation(homedir + '/.' + PROGRAM_NAME + '/config')

let [cfgErr, _CFG] = userCfg.profile.get()
if (cfgErr != null) {
	errorLog('You must create the configuration file @', userCfg.profile.cfgPath)
} 

/*
*	Configure the agent
*	with the profile credentials
*/
agent.configureAgent({
	server: userCfg.profile.CFG.api[userCfg.profile.CFG.profile].server[0],
	token: userCfg.profile.CFG.api[userCfg.profile.CFG.profile].auth.token,
})

function formatResource (inData) {
	if (inData instanceof Array) {
		return inData
	}  else {
		return [inData]
	}
}

function compatibilityRequest (cb) {
	try {
		if (userCfg.profile.CFG.currentProfile == null) {
			cb(true)
			return
		}
		axios.defaults.headers.common = {'Authorization': `Bearer ${userCfg.profile.CFG.api[userCfg.profile.CFG.profile].auth.token}`}
		axios['post'](`${userCfg.profile.CFG.api[userCfg.profile.CFG.profile].server[0]}/${DEFAULT_API_VERSION}/-/api/compatibility`, 
			{data: {cliVersion: require('./version')},
			}, {timeout: 1000}).then((res) => {
			cb(res.data.compatible)
		}).catch((err) => {
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
		}) 	  		
	} catch (err) {errorLog(err)}
}

program.command('api-version')
.description('api info')
.action((cmdObj) => {
	cli.api.version((err, response) => {
		if (err) {
			errorLog(err)
		} else {
			console.log(response)
		}
	})
})

program.command('profile <cmd> [profile]')
.option('-t, --token <token>', 'Token')
.option('-s, --api-server <apiServer>', 'Api Server')
.description('set the api profile to use')
.action((cmd, profile, cmdObj) => {
	switch (cmd) {
		case 'use':
			if (!Object.keys(userCfg.profile.CFG.api).includes(profile)) {
				errorLog('Profile ' + profile + ' not exist')
				return
			}
			userCfg.profile.use(profile, (err, response) => {
  				if (err) {
  					errorLog(err)
  				} else {
					agent.configureAgent({
						server: userCfg.profile.CFG.api[userCfg.profile.CFG.profile].server[0],
						token: userCfg.profile.CFG.api[userCfg.profile.CFG.profile].auth.token,
					})
  					console.log('Now using profile', '*' + response + '*')
  				}
			})
   			break

   		case 'init': // TODO: test it
			userCfg.profile.init(profile, cmdObj.apiServer, cmdObj.token, (err, response) => {
  				if (err) {
  					errorLog(err)
  				} else {
  					console.log('Now using profile', '*' + response + '*')
  				}
			})
			break

   		case 'add':
			if (Object.keys(userCfg.profile.CFG.api).includes(profile)) {
				errorLog('Profile ' + profile + ' already exist')
				return
			}
			userCfg.profile.add(profile, cmdObj.apiServer, cmdObj.token, (err, response) => {
  				if (err) {
  					errorLog(err)
  				} else {
  					console.log('Added profile', '*' + response + '*')
  				}
			})
			break

		case 'del':
			if (!Object.keys(userCfg.profile.CFG.api).includes(profile)) {
				errorLog('Profile ' + profile + ' not exist')
				return
			}
			userCfg.profile.del(profile, (err, response) => {
  				if (err) {
  					errorLog(err)
  				} else {
  					console.log('Deleted profile', '*' + response + '*')
  				}
			})
			break

		case 'using':
			console.log('You are on', '*' + userCfg.profile.CFG.profile + '*', 'profile') 
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
	  		cli.api.apply.batch(doc, cmdObj, (err, response) => {
				if (err) {
					errorLog(err)
				} else {
					console.log(response)
				}
	  		})
	  	} else {
	  		formatResource(doc).forEach((_resource) => {
	  			cli.api.apply.one(_resource, cmdObj, (err, response) => {
					if (err) {
						errorLog(err)
					} else {
						console.log(response)
					}

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
.description('delete')
.action((resource, name, cmdObj) => {
	try {
		if (cmdObj.file !== undefined) {
	  		const doc = yaml.safeLoadAll(fs.readFileSync(cmdObj.file, 'utf8'))
	  		if (doc.length > BATCH_LIMIT) {
	  			cli.api.remove.batch(doc, cmdObj, (err, response) => { 
					if (err) {
						errorLog(err)
					} else {
						console.log(response)
					}
	  			})
	  		} else {
	  			formatResource(doc).forEach((_resource) => {
					cli.api.remove.one(_resource, cmdObj, (err, response) => { 
						if (err) {
							errorLog(err)
						} else {
							console.log(response)
						}
					})
	  			})
	  		}
	  	} else {
	  		if (resource == undefined || name == undefined) {
	  			console.log('You must specify a resource kind and name')
	  			process.exit()
	  		}
			resource = alias(resource)
			cli.api.remove.named(resource, name, cmdObj, (err, response) => { 
				if (err) {
					errorLog(err)
				} else {
					console.log(response)
				}
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
.description('stop')
.action((resource, name, cmdObj) => {
	try {
		if (cmdObj.file !== undefined) {
	  		const doc = yaml.safeLoadAll(fs.readFileSync(cmdObj.file, 'utf8'))
	  		if (doc.length > BATCH_LIMIT) {
	  			cli.api.stop.batch(doc, cmdObj, (err, response) => { 
					if (err) {
						errorLog(err)
					} else {
						console.log(response)
					}
	  			})
	  		} else {
	  			formatResource(doc).forEach((_resource) => {
					cli.api.stop.one(_resource, cmdObj, (err, response) => { 
						if (err) {
							errorLog(err)
						} else {
							console.log(response)
						}
					})
	  			})
	  		}
	  	} else {
	  		if (resource == undefined || name == undefined) {
	  			console.log('You must specify a resource kind and name')
	  			process.exit()
	  		}
			resource = alias(resource)
			cli.api.stop.named(name, cmdObj, (err, response) => { 
				if (err) {
					errorLog(err)
				} else {
					console.log(response)
				}
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
			cli.api.get.one(resource, cmdObj, (err, data) => {
				if (err) {
					errorLog(err)
				} else {
					if (!cmdObj.json) {
						console.log(asTable(data))
					} else {
						console.log(data)
					}						
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
		cli.api.get.named(resource, name, cmdObj, (err, data) => {
			if (err) {
				errorLog(err)
			} else {
				if (!cmdObj.json) {
					if (typeof data !== 'array') {
						data = [data]
					}
					console.log(asTable(data))
				} else {
					console.log(data)
				}	
			}			
		})
	}	
})

program.command('stat <type> [name]')
.option('-g, --group <group>', 'Group')
.option('-p, --period <period>', 'Period: 1m, 1h, 1d, 1w, 1M, 1y :: Xm ... where X is a positive integer')
.option('-w, --watch', 'Watch')
.description('Get resource stats')
.action((type, name, cmdObj) => {
	let fn = () => {
		cli.api.get.stat(type, name, cmdObj, (err, response) => {
			if (err) {
				errorLog(err)
			} else {
				console.log(response)
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
})

program.command('pause <resource> <name>')
.option('-g, --group <group>', 'Group')
.option('-w, --watch', 'Watch')
.description('Pause a workload')
.action((resource, name, cmdObj) => {
	cli.api.pause.one(name, cmdObj, (err, response) => {
		if (err) {
			errorLog(err)
		} else {
			console.log(response)
		}
	})
})

program.command('resume <resource> <name>')
.option('-g, --group <group>', 'Group')
.option('-w, --watch', 'Watch')
.description('Resume a workload')
.action((resource, name, cmdObj) => {
	cli.api.resume.one(name, cmdObj, (err, response) => {
		if (err) {
			errorLog(err)
		} else {
			console.log(response)
		}
	})
})

program.command('inspect <resource> <name>')
.option('-g, --group <group>', 'Group')
.description('Inspect resource')
.action((resource, name, cmdObj) => {
	cli.api.inspect.one(name, cmdObj, (err, response) => {
		if (err) {
			errorLog(err)
		} else {
			console.log(response)
		}
	})
})

program.command('logs <resource> <name>')
.option('-g, --group <group>', 'Group')
.description('Logs for resource')
.action((resource, name, cmdObj) => {
	cli.api.logs.one(name, cmdObj, (err, response) => {
		if (err) {
			errorLog(err)
		} else {
			console.log(response)
		}				
	})
})

program.command('commit <resource> <name> [repo]')
.option('-g, --group <group>', 'Group')
.description('Commit a container, both to local node or to a Docker Registry.')
.action((resource, name, repo, cmdObj) => {
	cli.api.commit.one(name, repo, cmdObj, (err, response) => {
		if (err) {
			errorLog(err)
		} else {
			console.log(response)
		}				
	})
})

program.command('top <resource> <name>')
.option('-g, --group <group>', 'Group')
.description('Logs for resource')
.action((resource, name, cmdObj) => {
	cli.api.top.one(name, cmdObj, (err, response) => {
		if (err) {
			errorLog(err)
		} else {
			console.log(response)
		}				
	})
})

program.command('describe <resource> <name>')
.option('-g, --group <group>', 'Group')
.option('-t, --table', 'Table output')
.description('Get resource')
.action((resource, name, cmdObj) => {
	resource = alias(resource)
	cli.api.describe.one(resource, name, cmdObj, (err, response) => {
		if (err) {
			errorLog(err)
		} else {
			if (cmdObj.table) {
				console.log(asTable([response]))
			} else {
				console.log(response)
			}
		}
	})
})


////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

program.command('ls <volume> [path]')
.option('-g, --group [group]', 'Group')
.description('v1.experimental List volumes content')
.action(async (volume, path, cmdObj) => {
	cli.api.volume.ls(volume, path || '/', {group: cmdObj.group || '-', apiVersion: 'v1.experimental'}, (err, data) => {
		if (err) {
			console.log(err)
		} else {
			if (data == undefined) {
				console.log('Is file')
			} else {
				console.log(data.join(' '))				
			}
		}
	})
})

program.command('download <volume> <path> <dst>')
.option('-g, --group [group]', 'Group')
.description('v1.experimental Download data from volumes')
.action(async (volume, path, dst, cmdObj) => {
	cli.api.volume.download(volume, path || '/', {group: cmdObj.group, apiVersion: 'v1.experimental'}, (err, data) => {
		fs.writeFile(dst, data, (err) => {
			if (err) {
				errorLog(err)
			} else {
				console.log('Done')
			}
		})
	})
})

program.command('upload <src> <volume> [volumeSubpath]')
.option('-w, --watch', 'Watch and sync')
.option('-g, --group [group]', 'Group')
.option('-c, --chunk [chunkSize]', 'Chunk size in MB')
.option('-d, --dump <dump_file>', 'Dump the files to upload to the fs for future restore if this pc/process die during the upload')
.option('-r, --restore', 'Resume the download from a dump file')
.description('v1.experimental Upload data to volumes')
.action(async (src, volume, volumeSubpath, cmdObj) => {
	let randomUploadId = randomstring.generate(24) 
	let bar1 = new cliProgress.SingleBar({
		format: 'Copy |' + '{bar}' + '| {percentage}% || {phase}',
	}, cliProgress.Presets.shades_classic)
	bar1.start(100, 0, {
		phase: 'Start'
	})
	let startDate = new Date()
	try {
		let lastStep = 0
		let current = 0
		let total = 0
		let url = `${userCfg.profile.CFG.api[userCfg.profile.CFG.profile].server[0]}/${'v1.experimental'}/-/Volume/upload/${volume}/-/${encodeURIComponent(randomUploadId)}`
		rfs.api.remote.fs.upload({
			src: src,
			dst: volumeSubpath,
			watch: cmdObj.watch,
			dumpFile: cmdObj.dump,
			restore: cmdObj.restore,
			chunkSize: cmdObj.chunkSize,
			endpoint: url,
			token: userCfg.profile.CFG.api[userCfg.profile.CFG.profile].auth.token,
			onEnd: () => {
				bar1.update(100, {phase: 'Done in ' + ((new Date() - startDate) / 1000 / 60) + ' minutes'  })
				bar1.stop()
			},
			log: (args) => {
				if (args.progress !== undefined) {
					//bar1.update(lastStep, {phase: args.name + ' ' + args.progress })
					bar1.update(lastStep, {phase: current + '/' +  total + ' ' + args.name + ' ' + args.progress + '%'})
				} else {
					current = args.current
					total = args.total
					lastStep = Math.round(( ( (args.current) / args.total) * 100), 2)
					bar1.update(lastStep, {phase: current + '/' +  total + ' ' + args.name})				
				}
			}
		})
	} catch (err) {errorLog(err)}
})


////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

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
})

/**
*	Copy
*/
program.command('cp <src> <dst>')
.option('-g, --group <group>', 'Group')
.option('-c, --chunk <chunk>', 'Chunk size in MB, default 100MB')
.option('-e, --error', 'Show errors')
.description('copy dir from local to volume folder')
.action(async (src, dst, cmdObj) => {
	let archieveName, tmp, bar1, dstName
	try {
		tmp = require('os').tmpdir()
		bar1 = new cliProgress.SingleBar({
			format: 'Copy |' + '{bar}' + '| {percentage}% || {phase}',
			}, cliProgress.Presets.shades_classic)
		bar1.start(120, 0, {
			phase: 'Compressing'
		})
		archieveName = tmp + '/pwm-vol-' + randomstring.generate(12)
		dstName = dst
		bar1.update(5, {phase: 'Compressing'})
		await compressing.tar.compressDir(src, archieveName)
		bar1.update(5, {phase: 'Splitting'})
		bar1.update(10)
	} catch (err) {
		if (cmdObj.error == undefined) {
			errorLog('Error in upload, use -e to show the error')	
		} else {
			errorLog('Error in upload')
			errorLog(err)
		}
		fs.unlink(archieveName, () => {})
		process.exit()
	}

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
				try {
					const size = fs.statSync(file)
					bar1.update(index, {phase: 'copy ' + index + '/' + onlyFiles.length + '\t' + parseInt((size.size / 1000000)) + 'MB'})
					axios({
					  method: 'POST',
					  url: `${userCfg.profile.CFG.api[userCfg.profile.CFG.profile].server[0]}/${DEFAULT_API_VERSION}/${cmdObj.group || '-'}/Volume/upload/${dstName}/${id}/${onlyFiles.length}/${index + 1}/`,
					  maxContentLength: Infinity,
					  maxBodyLength: Infinity,
					  headers: {
					    'Content-Type': 'multipart/form-data',
					    'Content-Length': size.size,
					    'Authorization': `Bearer ${userCfg.profile.CFG.api[userCfg.profile.CFG.profile].auth.token}`
					  },
					  data: fs.createReadStream(file)
					}).then((res) => {
						cb(null)
					}).catch((err) => {
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
					})
				} catch (err) {
					errorLog('Error in file ' + file) 	
					cb(null)
				}
			})
		})
		async.series(queue, (err, data) => {
			bar1.update(90, {phase: 'Transferring to container'})
			axios({
			  method: 'POST',
			  url: `${userCfg.profile.CFG.api[userCfg.profile.CFG.profile].server[0]}/${DEFAULT_API_VERSION}/${cmdObj.group || '-'}/Volume/upload/${dstName}/${id}/${onlyFiles.length}/end/`,
			  maxContentLength: Infinity,
			  maxBodyLength: Infinity,
			  headers: {
			    'Content-Type': 'multipart/form-data',
			    'Authorization': `Bearer ${userCfg.profile.CFG.api[userCfg.profile.CFG.profile].auth.token}`
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
	let sizeInterval = null
	axios({
	  method: 'POST',
	  url: `${userCfg.profile.CFG.api[userCfg.profile.CFG.profile].server[0]}/${DEFAULT_API_VERSION}/${cmdObj.group || '-'}/Volume/download/${volumeData}/`,
	  responseType: 'stream',
	  headers: {
	    'Authorization': `Bearer ${userCfg.profile.CFG.api[userCfg.profile.CFG.profile].auth.token}`
	  }
	}).then(async (res) => {
		sizeInterval = setInterval(() => {
			console.clear()
			console.log('Downloaded', Math.round(fs.statSync(path.join(src + '.compressed')).size / (1024 * 1024), 1), 'MB')
		}, 1000)
		fs.mkdir(src, { recursive: true }, (err) => {
			let writeStream = fs.createWriteStream(path.join(src + '.compressed'))
			res.data.pipe(writeStream)
	  		let error = null;
	  		writeStream.on('error', err => {
	  		  	error = err;
	  		  	if (sizeInterval !== null) { clearInterval(sizeInterval) }
	  		  	writeStream.close()
	  		})
	  		writeStream.on('close', async () => {
	  		  	if (!error) {
	  		    	await compressing.tar.uncompress(path.join(src + '.compressed'), path.join(src))
	  		    	fs.unlink(path.join(src + '.compressed'), () => {})
	  		    	if (sizeInterval !== null) { clearInterval(sizeInterval) }
	  		    	console.log('Done')
	  		  	}
	  		})
	  	})
	}).catch((err) => {
		if (sizeInterval !== null) { clearInterval(sizeInterval) }
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
	agent.apiRequest({
		type: 'post',
		resource: resource,
		group: cmdObj.group,
		verb: 'getOne',
		body: {kind: resource, apiVersion: DEFAULT_API_VERSION, metadata: {name: containername, group: cmdObj.group}}
	}, (err, res) => {
		if (res.c_id == undefined || res.c_id == null) {
			errorLog('Workload ' + containername + ' is not running')
			process.exit()
			return
		}
		agent.apiRequest({
			type: 'post',
			resource: resource,
			group: cmdObj.group,
			verb: 'token',
		}, (err, resAuth) => {
			if (res) {
				console.log('Waiting connection...')
				try {
					main(res.c_id, res.node, resAuth)	
				} catch (err) {
					errorLog('Error connecting to workload ' + containername)
				}
			}
		})
	})
})

/**
*	token create <username>
*/
program.command('token <action> <userGroup> <user> [defaultGroup] [id]')
.description('token creation')
.action((action, user, userGroup, defaultGroup, id) => {
	if (['create'].includes(action)) {
		cli.api.token[action](userGroup, user, defaultGroup, id, (err, response) => {
			if (err) {
				errorLog(err)
			} else {
				console.log(response)
			}
		})
	} else {
		errorLog('Action ' + action + ' not exist')
	}
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

module.exports = program