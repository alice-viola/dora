'use strict'

let DEFAULT_API_VERSION = 'v1'
let BATCH_LIMIT = Infinity
const PROGRAM_NAME = 'dora'

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
const util = require('util')
const chokidar = require('chokidar')
let progress = require('progress-stream')

/*
*	Loading common libraries
*/

// HTTP/S Agent
let agent = require('../core/ajax/request')
agent.configureAgent({
	axios: axios,
	DEFAULT_API_VERSION: DEFAULT_API_VERSION,
})

// API interface
let cli = require('../core/interfaces/api')
cli.DEFAULT_API_VERSION = DEFAULT_API_VERSION
cli.api.request = agent.apiRequest

let rfs = require('../core/interfaces/api_fs')

// Configuration file interface
let userCfg = require('../core/interfaces/user_cfg')
userCfg.yaml = yaml


const program = new Command()
program.version(require('./version'), '-v, --vers', '')

const RESOURCE_ALIAS = {
	wk: 		 	'Workload',
	workload: 	 	'Workload',
	gpu: 	     	'GPU',
	gpus: 	     	'GPU',
	cpu: 	     	'CPU',
	cpus: 	     	'CPU',
	node: 	     	'Node',
	nodes: 	     	'Node',
	group: 	     	'Group',
	groups:      	'Group',
	ws: 	 	 	'Workspace',
	workspace: 	 	'Workspace',
	workspaces:  	'Workspace',
	user: 	     	'User',
	users:       	'User',
	volume:      	'Volume',
	volumes:     	'Volume',
	vol:    	 	'Volume',
	vols:        	'Volume',
	rc: 	 		'Resourcecredit',
	resourcecredit: 'Resourcecredit',
	uc:     		'Usercredit',
	usercredit:     'Usercredit',
	storage: 	 	'Storage',
	storages: 	 	'Storage',
	zone: 	 	 	'Zone',
	zones: 	 	 	'Zone',
	z: 			 	'Zone',
	c: 				'Container', 
	contianer: 		'Container', 
	contianers: 	'Container'
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
userCfg.profile.setCfgLocation(path.join(homedir, '.' + PROGRAM_NAME, 'config'))
userCfg.profile.setCfgFolder(path.join(homedir, '.'+ PROGRAM_NAME))

let [cfgErr, _CFG] = userCfg.profile.get()
if (cfgErr != null) {
	errorLog('You must create the configuration file @', userCfg.profile.cfgPath)
} 

/*
*	Configure the agent
*	with the profile credentials
*/
if (cfgErr == null) {
	agent.configureAgent({
		server: userCfg.profile.CFG.api[userCfg.profile.CFG.profile].server[0],
		token: userCfg.profile.CFG.api[userCfg.profile.CFG.profile].auth.token,
	})
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
		case 'ls':
			Object.keys(userCfg.profile.CFG.api).forEach((k) => {
				if (userCfg.profile.CFG.api[k].server.length == 1) {
					console.log(k, '@', userCfg.profile.CFG.api[k].server[0])	
				} else {
					console.log(k, '@', userCfg.profile.CFG.api[k].server)
				}
			})
   			break

		case 'token':
			console.log(userCfg.profile.CFG.api[userCfg.profile.CFG.profile].auth.token)
   			break

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
.option('-z, --zone <zone>', 'Zone')
.option('--v, --verbose', 'Verbose')
.description('apply')
.action((cmdObj) => {
	try {
		process.env.ZONE = cmdObj.zone !== undefined ? cmdObj.zone : '-'
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
.option('-z, --zone <zone>', 'Zone')
.option('--v, --verbose', 'Verbose')
.description('delete')
.action((resource, name, cmdObj) => {
	process.env.ZONE = cmdObj.zone !== undefined ? cmdObj.zone : '-'
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
	process.env.ZONE = cmdObj.zone !== undefined ? cmdObj.zone : '-'
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
.option('-z, --zone <zone>', 'Zone')
.option('-j, --json', 'JSON output')
.option('-w, --watch', 'Watch')
.description('Get resource')
.action((resource, name, cmdObj) => {
	process.env.ZONE = cmdObj.zone !== undefined ? cmdObj.zone : '-'
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
					//if (typeof data !== 'array') {
					//	data = [data]
					//}
					//console.log(data)
					console.log(asTable(data))
				} else {
					console.log(data)
				}	
			}			
		})
	}	
})

/*
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
})*/

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
.option('-z, --zone <zone>', 'Zone')
.option('-t, --table', 'Table output')
.description('Get resource')
.action((resource, name, cmdObj) => {
	process.env.ZONE = cmdObj.zone !== undefined ? cmdObj.zone : '-'
	resource = alias(resource)
	cli.api.describe.one(resource, name, cmdObj, (err, response) => {
		if (err) {
			errorLog(err)
		} else {
			if (cmdObj.table) {
				console.log(asTable([response]))
			} else {
				console.log(util.inspect(response, {showHidden: false, depth: null}))
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
	process.env.ZONE = cmdObj.zone !== undefined ? cmdObj.zone : '-'
	cli.api.volume.ls(volume, path || '/', {group: cmdObj.group || '-', apiVersion: 'v1.experimental'}, (err, data) => {
		if (err) {
			console.log(err)
		} else {
			if (data == undefined) {
				console.log('Is file')
			} else {
				console.log(data.join('\n'))				
			}
		}
	})
})

program.command('upload <src> <volume> [volumeSubpath]')
.option('-g, --group [group]', 'Group')
.option('-c, --chunk [chunkSize]', 'Chunk size in MB')
.option('-d, --dump <dump_file>', 'Dump the files to upload to the fs for future restore if this pc/process die during the upload, every 10 seconds')
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
		let url = `${userCfg.profile.CFG.api[userCfg.profile.CFG.profile].server[0]}/${'v1.experimental'}/-/Volume/upload/${volume}/-/${encodeURIComponent(randomUploadId)}/-/-`
		rfs.api.remote.fs.upload({
			src: src,
			dst: volumeSubpath || '/',
			dumpFile: cmdObj.dump,
			restore: cmdObj.restore,
			watch: false,
			chunkSize: cmdObj.chunkSize,
			endpoint: url,
			token: userCfg.profile.CFG.api[userCfg.profile.CFG.profile].auth.token,
			onEnd: () => {
				bar1.update(100, {phase: 'Done in ' + ((new Date() - startDate) / 1000 / 60) + ' minutes'  })
				bar1.stop()
			},
			log: (args) => {
				if (args.progress !== undefined) {
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

program.command('sync <src> <volume> [volumeSubpath]')
.option('-g, --group [group]', 'Group')
.option('-c, --chunk [chunkSize]', 'Chunk size in MB')
.description('v1.experimental Sync data to volumes')
.action(async (src, volume, volumeSubpath, cmdObj) => {
	let randomUploadId = randomstring.generate(24) 
	try {
		let lastStep = 0
		let current = 0
		let total = 0
		let url = `${userCfg.profile.CFG.api[userCfg.profile.CFG.profile].server[0]}/${'v1.experimental'}/-/-/Volume/upload/${volume}/-/${encodeURIComponent(randomUploadId)}/-/-`
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
})

/*
**	// NEXT VERSION
**	
**	program.command('download <volume> <path> <dst>')
**	.option('-g, --group [group]', 'Group')
**	.description('v1.experimental Download data from volumes')
**	.action(async (volume, path, dst, cmdObj) => {
**		cli.api.volume.download(volume, path || '/', {group: cmdObj.group, apiVersion: 'v1.experimental'}, (err, data) => {
**			fs.writeFile(dst, data, (err) => {
**				if (err) {
**					errorLog(err)
**				} else {
**					console.log('Done')
**				}
**			})
**		})
**	})
*/

////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

/**
*	Download
*/

program.command('download <dst> <subPath> <src>')
.option('-g, --group <group>', 'Group')
.description('copy dir from remote volumes to local folder. <dst> is local path, <src> is volumeName')
.action(async (dst, subPath, src, cmdObj) => {
	let tmp = require('os').tmpdir()
	let archieveName = tmp + '/pwm-vol-' + randomstring.generate(12)
	let dstName = dst
	let volumeData = dst /*{
		name: dst,
		subPath: subPath || '/'
	}*/
	//volumeData = encodeURIComponent(JSON.stringify(volumeData))
	let sizeInterval = null
	axios({
	  method: 'POST',
	  url: `${userCfg.profile.CFG.api[userCfg.profile.CFG.profile].server[0]}/${'v1.experimental'}/${cmdObj.group || '-'}/Volume/download/${volumeData}/`,
	  responseType: 'stream',
	  headers: {
	    'Authorization': `Bearer ${userCfg.profile.CFG.api[userCfg.profile.CFG.profile].auth.token}`
	  }
	}).then(async (res) => {
		sizeInterval = setInterval(() => {
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
program.command('shell <resource> <containername> [cmd]')
.option('-g, --group <group>', 'Group')
.option('-z, --zone <zone>', 'Zone')
.action((resource, containername, cmd, cmdObj) => {
	process.env.ZONE = cmdObj.zone !== undefined ? cmdObj.zone : '-'
	var DockerClient = require('./src/web-socket-docker-client')
	function main (containerId, nodeName, authToken) {
	  	var client = new DockerClient({
	  	  	url: webSocketForApiServer() + '/pwm/cshell',
	  	  	tty: true,
	  	  	command: cmd !== undefined ? cmd : '/bin/bash',
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
		verb: 'describe',
		body: {kind: resource, apiVersion: DEFAULT_API_VERSION, metadata: {name: containername, group: cmdObj.group}}
	}, (err, response) => {
		if (response == undefined) {
			errorLog('Something went wrong')
			process.exit()
			return
		}
		let res = null
		if (response.length == 1) {
			res = response[0]
		} else {
			errorLog('Container ' + containername + ' is not running')
			process.exit
			return
		}
		if (res.observed == undefined || res.observed == null || res.observed.c_id == null) {
			errorLog('Container ' + containername + ' is not running')
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
					main(res.observed.c_id, res.computed.node, resAuth)	
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
program.command('token <action> <user> <defaultGroup> <id>')
.description('token creation')
.action((action, user, defaultGroup, id) => {
	if (['create'].includes(action)) {
		cli.api.token[action](user, defaultGroup, id, (err, response) => {
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