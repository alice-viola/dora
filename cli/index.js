const yaml = require('js-yaml')
const fs = require('fs')
const axios = require('axios')
const shell = require('shelljs')
let table = require('text-table')
let asTable = require ('as-table')
const { Command } = require('commander')
const PROGRAM_NAME = 'pwm'
let CFG = {}

const program = new Command()
program.version('0.0.1', '-v, --vers', '')

let DEFAULT_API_VERSION = 'v1'

const RESOURCE_ALIAS = {
	gpuw: 	'GPUWorkload',
	gpu: 	'GPU',
	gpus: 	'GPU',
	node: 	'Node',
	nodes: 	'Node',
	group: 	'Group',
	groups: 'Group',
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
			console.log('Error connecting to API server', CFG.api[CFG.profile].server[0])
		}) 	  		
	} catch (err) {}
}

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
  				console.log('Now using profile', profile)
  			}
  		})
   	} catch (err) {
   		console.log(err)
   	}
})

program.command('apply')
.option('-f, --file <file>', 'File to apply')
.option('--v, --verbose', 'Verbose')
.description('apply')
.action((cmdObj) => {
	try {
	  	const doc = yaml.safeLoadAll(fs.readFileSync(cmdObj.file, 'utf8'))
	  	formatResource(doc).forEach((resource) => {
	  		apiRequest('post', resource, 'apply', (res) => {console.log(res)})
	  	})
	} catch (e) {
	  console.log(e)
	}
})

program.command('delete')
.option('-f, --file <file>', 'File to apply')
.option('--v, --verbose', 'Verbose')
.description('apply')
.action((cmdObj) => {
	try {
	  	const doc = yaml.safeLoadAll(fs.readFileSync(cmdObj.file, 'utf8'))
	  	formatResource(doc).forEach((resource) => {
	  		apiRequest('post', resource, 'delete', (res) => {console.log(res)})
	  	})
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
			'getOne', (res) => {
				if (!cmdObj.json) {
					console.log(asTable([res]))
				} else {
					console.log(res)
				}
			})
	}	
})

program.command('download <name> <outputDir>')
.description('download')
.action((name, outputDir) => {
  	console.log(name, outputDir)
})

program.command('build <name> <inputDir>')
.description('build')
.action((name, inputDir) => {
  	console.log(name, outputDir)
})

program.command('push <name>')
.option('-r, --registry <registry>', 'Registry to push')
.option('-i, --input-dataset <inputdatasetname>', 'Dataset to use')
.description('push')
.action((name, cmdObj) => {
  	console.log(name, cmdObj.registry)
})

program.command('status <name>')
.description('status')
.action((name) => {
  	console.log(name)
})

program.command('cancel <resource> <name>')
.option('-g, --group <group>', 'Group')
.description('cancel')
.action((resource, name, cmdObj) => {
	resource = alias(resource)
	apiRequest('post', {kind: resource, apiVersion: DEFAULT_API_VERSION, metadata: {name: name, group: cmdObj.group}}, 
			'cancel', (res) => {console.log(res)})
})

program.command('login <username> <api>')
.description('cancel')
.action((name) => {
  	console.log(name)
})

program.command('shell <resource> <containername>')
.option('-g, --group <group>', 'Group')
.action((resource, containername, cmdObj) => {
	var DockerClient = require('docker-exec-websocket-client').DockerExecClient
	function main (containerId, nodeName) {
	  	var client = new DockerClient({
	  	  	url: webSocketForApiServer() + '/pwm/cshell',
	  	  	tty: 'true',
	  	  	command: 'bash',
	  	  	container: containerId,
	  	  	node: nodeName,
	  	  	headers: {'Authorization': `Bearer ${CFG.api[CFG.profile].auth.token}`}
	  	})
	  	return client.execute().then(() => {
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
			if (res) {
				main(res.c_id, res.node[0])	
			}
	})

})
program.parse(process.argv)
