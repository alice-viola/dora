'use strict'

const yaml = require('js-yaml')
const fs = require('fs')
const axios = require('axios')
const shell = require('shelljs')
const path = require('path')
let table = require('text-table')
let asTable = require ('as-table')
let inquirer = require('inquirer')
let randomstring = require ('randomstring')
const compressing = require('compressing')
const cliProgress = require('cli-progress')
const { Command } = require('commander')
var progress = require('progress-stream')
const PROGRAM_NAME = 'pwm'
let CFG = {}

const program = new Command()
let currentProfile = null
/**
* TODOS

- memory on get
- aggiungere grouppo a cartelle su storage
- labels node
- modificators
- config cpu e mem e port?
- verificare questione cartelle upload
- const targetDir = require('os').tmpdir()
- logs?
- cambiare cp, senza specificare il nodo
- scheduler a frequenza variabile
- multi api
- mount fs only read
- check limits on storage and resources
- node auto update
- limiti utenti

- add exited reason by user

- sms plugin

*/

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
	console.log('You must create the configuration file @', homedir + '/.' + PROGRAM_NAME + '/config')
	process.exit()
}

function formatResource (inData) {
	if (inData instanceof Array) {
		return inData
	}  else {
		return [inData]
	}
}

function apiRequest (type, resource, verb, cb) {
	let body, query = null
	if (type == 'get') {
		query = resource
	} else {
		body = resource
	}
	try {
		axios.defaults.headers.common = {'Authorization': `Bearer ${CFG.api[CFG.profile].auth.token}`}
		axios[type](`${CFG.api[CFG.profile].server[0]}/${resource.apiVersion}/${resource.kind}/${verb}`, 
			{data: body,
			}, query, {timeout: 1000}).then((res) => {
			cb(res.data)
		}).catch((err) => {
			if (err.code == 'ECONNREFUSED') {
				console.log('Error connecting to API server', CFG.api[CFG.profile].server[0])
			} else {
				if (err.response !== undefined && err.response.statusText !== undefined) {
					console.log('Error in response from API server:', err.response.statusText) 	
				} else {
					console.log('Error in response from API server: Unknown') 	
				}
			}
		}) 	  		
	} catch (err) {}
}

function batchApiRequest (type, resource, verb, cb) {
	let body, query = null
	if (type == 'get') {
		query = resource
	} else {
		body = resource
	}
	try {
		axios.defaults.headers.common = {'Authorization': `Bearer ${CFG.api[CFG.profile].auth.token}`}
		axios[type](`${CFG.api[CFG.profile].server[0]}/${DEFAULT_API_VERSION}/batch/${verb}`, 
			{data: body,
			}, query, {timeout: 5000}).then((res) => {
			cb(res.data)
		}).catch((err) => {
			if (err.code == 'ECONNREFUSED') {
				console.log('Error connecting to API server', CFG.api[CFG.profile].server[0])
			} else {
				console.log('Error in response from API server') 
			}
		}) 	  		
	} catch (err) {}
}


program.command('api-version')
.description('api info')
.action((cmdObj) => {
	apiRequest('post',  {apiVersion: 'v1', kind: 'api'}, 'version', (res) => {console.log(res)})
})

program.command('use <profile>')
.description('set the api profile to use')
.action((profile) => {
  	CFG.profile = profile 
  	try {
  		let newCFG = yaml.safeDump(CFG) 
  		fs.writeFile(homedir + '/.' + PROGRAM_NAME + '/config', newCFG, 'utf8', (err) => {
  			if (err) {
  				console.log(err)
  			} else {
  				console.log('Now using profile', '*' + profile + '*')
  			}
  		})
   	} catch (err) {
   		console.log(err)
   	}
})

program.command('using')
.description('get setted profile')
.action((profile) => {
  	console.log('You are on', '*' + CFG.profile + '*', 'profile') 
})

program.command('status')
.description('control plane status')
.action((cmdObj) => {
	apiRequest('post',  {apiVersion: 'v1', kind: 'cluster', metadata: {group: 'pwm.all'}}, 'status', (res) => {console.log(res)})
})

program.command('apply')
.option('-f, --file <file>', 'File to apply')
.option('-g, --group <group>', 'Group')
.option('--v, --verbose', 'Verbose')
.description('apply')
.action((cmdObj) => {
	try {
	  	const doc = yaml.safeLoadAll(fs.readFileSync(cmdObj.file, 'utf8'))
	  	doc.forEach((singleDoc) => { 
	  		if (cmdObj.group !== undefined && singleDoc.metadata.group == undefined) {
	  			singleDoc.metadata.group = cmdObj.group 
	  		}
	  	})
	  	if (doc.length > BATCH_LIMIT) {
	  		batchApiRequest('post', doc, 'apply', (res) => {console.log(res)})
	  	} else {
	  		formatResource(doc).forEach((resource) => {
	  			apiRequest('post', resource, 'apply', (res) => {console.log(res)})
	  		})
	  	}
	} catch (e) {
	  console.log(e)
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
	  		doc.forEach((singleDoc) => { 
	  			if (cmdObj.group !== undefined) {
	  				singleDoc.metadata.group = cmdObj.group 
	  			}
	  		})
	  		if (doc.length > BATCH_LIMIT) {
	  			batchApiRequest('post', doc, 'delete', (res) => {console.log(res)})
	  		} else {
	  			formatResource(doc).forEach((resource) => {
	  				apiRequest('post', resource, 'delete', (res) => {console.log(res)})
	  			})
	  		}
	  	} else {
	  		if (resource == undefined || name == undefined) {
	  			console.log('You must specify a resource kind and name')
	  			process.exit()
	  		}
			resource = alias(resource)
			apiRequest('post', {kind: resource, apiVersion: DEFAULT_API_VERSION, metadata: {name: name, group: cmdObj.group}, force: cmdObj.force}, 
					'delete', (res) => {console.log(res)})
	  	}
	} catch (e) {
	  console.log(e)
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
	  		doc.forEach((singleDoc) => { 
	  			if (cmdObj.group !== undefined) {
	  				singleDoc.metadata.group = cmdObj.group 
	  			}
	  		})
	  		if (doc.length > BATCH_LIMIT) {
	  			batchApiRequest('post', doc, 'cancel', (res) => {console.log(res)})
	  		} else {
	  			formatResource(doc).forEach((resource) => {
	  				apiRequest('post', resource, 'cancel', (res) => {console.log(res)})
	  			})
	  		}
	  	} else {
	  		if (resource == undefined || name == undefined) {
	  			console.log('You must specify a resource kind and name')
	  			process.exit()
	  		}
			resource = alias(resource)
			apiRequest('post', {kind: resource, apiVersion: DEFAULT_API_VERSION, metadata: {name: name, group: cmdObj.group}}, 
					'cancel', (res) => {console.log(res)})
	  	}
	} catch (e) {
	  console.log(e)
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
		let fn = () => {apiRequest('post', {kind: resource, apiVersion: DEFAULT_API_VERSION, metadata: {group: cmdObj.group}}, 
			'get', (res) => {
				if (!cmdObj.json) {
					console.log(asTable(res))
				} else {
					console.log(res)
				}
		})}
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
		apiRequest('post', {kind: resource, apiVersion: DEFAULT_API_VERSION, metadata: {name: name, group: cmdObj.group}}, 
			'getOne', (res) => {
				if (!cmdObj.json) {
					console.log(asTable([res]))
				} else {
					console.log(res)
				}
			})
	}	
})

program.command('logs <resource> <name>')
.option('-g, --group <group>', 'Group')
.description('Logs for resource')
.action((resource, name, cmdObj) => {
	resource = alias(resource)
	apiRequest('post', {kind: resource, apiVersion: DEFAULT_API_VERSION, metadata: {name: name, group: cmdObj.group}}, 
	'getOne', (resResource) => {
		apiRequest('post', {kind: resource, apiVersion: DEFAULT_API_VERSION, name: name, nodename: resResource.node, id: resResource.c_id}, 
		'logs', (res) => {
			console.log(res)	
		})
	})
})

program.command('describe <resource> <name>')
.option('-g, --group <group>', 'Group')
.option('-t, --table', 'Table output')
.description('Get resource')
.action((resource, name, cmdObj) => {
	resource = alias(resource)
	if (name == undefined) {
		let fn = () => {apiRequest('post', {kind: resource, apiVersion: DEFAULT_API_VERSION}, 
			'get', (res) => {
				if (!cmdObj.json) {
					console.log(asTable(res))
				} else {
					console.log(res)
				}
		})}
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
		apiRequest('post', {kind: resource, apiVersion: DEFAULT_API_VERSION, metadata: {name: name, group: cmdObj.group}}, 
			'describe', (res) => {
				if (cmdObj.table) {
					console.log(asTable([res]))
				} else {
					console.log(res)
				}
			})
	}	
})

program.command('drain <resource> <nodename>')
.option('-g, --group <group>', 'Group')
.description('drain a node')
.action((resource, nodename, cmdObj) => {
	resource = alias(resource)
	apiRequest('post', {kind: resource, apiVersion: DEFAULT_API_VERSION, metadata: {name: nodename, group: cmdObj.group}}, 
			'drain', (res) => {console.log(res)})
})

/**
*	Copy
*/
program.command('cp <src> <dst>')
.option('-g, --group <group>', 'Group')
.description('copy dir from local to volume folder')
.action(async (src, dst) => {
	let status = 'pippo'
	const bar1 = new cliProgress.SingleBar({
		format: 'Copy |' + '{bar}' + '| {percentage}% || {phase}',
		}, cliProgress.Presets.shades_classic)
	bar1.start(120, 0, {
		phase: 'Compressing'
	})
	let archieveName = homedir + '/pwm-vol-' + randomstring.generate(12)
	let node = dst.split(':')[0]
	let dstName = dst.split(':')[1]
	bar1.update(5, {phase: 'Compressing'})
	await compressing.tar.compressDir(src, archieveName)
	bar1.update(5, {phase: 'Sending'})
	bar1.update(10)
	const size = fs.statSync(archieveName)
	var str = progress({
	    length: size.size,
	    time: 10 /* ms */
	})
	 
	str.on('progress', function(progress) {
	    bar1.update(10 + progress.percentage)
	    if (progress.percentage == 100) {
	    	bar1.update(120, {phase: 'Transferring to container volume'})
	    }
	})

	axios({
	  method: 'POST',
	  url: `${CFG.api[CFG.profile].server[0]}/volume/upload/${node}/${dstName}`,
	  maxContentLength: Infinity,
	  maxBodyLength: Infinity,
	  headers: {
	    'Content-Type': 'multipart/form-data',
	    'Content-Length': size.size,
	    'Authorization': `Bearer ${CFG.api[CFG.profile].auth.token}`
	  },
	  data: fs.createReadStream(archieveName).pipe(str)
	}).then((res) => {
		fs.unlink(archieveName, () => {})
		bar1.update(120, {phase: 'Completed'})
		bar1.stop()
	})
})

/**
*	Download
*/
program.command('download <dst> <src>')
.option('-g, --group <group>', 'Group')
.description('copy dir from remote volumes to local folder. <dst> is local path, <src> as nodeName:volumeName')
.action(async (dst, src) => {
	let archieveName = homedir + '/pwm-vol-' + randomstring.generate(12)
	let node = dst.split(':')[0]
	let dstName = dst.split(':')[1]
	axios({
	  method: 'POST',
	  url: `${CFG.api[CFG.profile].server[0]}/volume/download/${node}/${dstName}`,
	  responseType: 'stream',
	  headers: {
	    'Authorization': `Bearer ${CFG.api[CFG.profile].auth.token}`
	  }
	}).then(async (res) => {
		let writeStream = fs.createWriteStream(path.join(src + '.compressed'))
		res.data.pipe(writeStream)
      	let error = null;
      	writeStream.on('error', err => {
      	  	error = err;
      	  	console.log(error)
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
	apiRequest('post', {kind: resource, apiVersion: DEFAULT_API_VERSION, metadata: {name: containername, group: cmdObj.group}}, 
		'getOne', (res) => {
		apiRequest('post', {kind: 'authtoken', apiVersion: DEFAULT_API_VERSION, metadata: {}}, 
			'get', (resAuth) => {
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
*	Interactive mode
*/
program.command('it <procedure>')
.description('Interactive mode')
.action(async (procedure) => {
	apiRequest('post', {
		apiVersion: 'v1',
		kind: 'interactive',
		name: procedure
	}, 'get', async (res) => {
		if (res.nopipe != undefined && res.nopipe == true) {
			console.log('No procedure named', procedure)
			process.exit()
		}
		let toReturn = ''
		let goOn = true
		let fn = res[0]
		let key = fn.key
		let responses = {}
		while (goOn) {
			let res = await inquirer.prompt(fn)
			axios.defaults.headers.common = {'Authorization': `Bearer ${CFG.api[CFG.profile].auth.token}`}
			let response = await axios['post'](`${CFG.api[CFG.profile].server[0]}/v1/interactive/next`, 
				{data: {name: procedure, key: key, res: Object.values(res)[0]},
				}, null, {timeout: 1000})
			
			responses[Object.keys(res)[0]] = Object.values(res)[0]
			if (response.data == '' || response.data == undefined || response.data[0] == undefined) {
				goOn = false
				apiRequest('post', {
					apiVersion: DEFAULT_API_VERSION,
					kind: 'interactive',
					name: procedure,
					responses: responses,
				}, 'apply', (res) => {
					apiRequest('post', res, 'apply',  (resApply) => {
						console.log(resApply)
					})
				})
			} else {
				fn = response.data[0]
				key = fn.key
			}
		}
	})
})

program.parse(process.argv)
