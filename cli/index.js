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
	if (CFG.api.server[0].split('https://').length == 2) {
		return 'wss://' + CFG.api.server[0].split('https://')[1]
	} else {
		return 'ws://' + CFG.api.server[0].split('http://')[1]
	}
}

/**
*	Get user home dir,
*	read conf file if present
*/
const homedir = require('os').homedir()
try {
	CFG = yaml.safeLoad(fs.readFileSync(homedir + '/.' + PROGRAM_NAME + '/config', 'utf8'))
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
		axios[type](`${CFG.api.server[0]}/${resource.apiVersion}/${resource.kind}/${verb}`, 
			{data: body,
			token: '3319bf586259448f7a0a589df11a2db7b7b9b29de81e95a81fa86fb1699425454d26f38b9942fbc80404fba017a7f82700e2b44836233fc7436514310e837f300760423ce6774f0af69f8aead01ceee87e8ae2b624737f2c17742b47e08a5d6340b235f495a5d5277521b5dd4a308e0eeb490183d7850276fc72534c6073e9e1e4b5a0647a5dec749ef08fb0751f6d317b3a8e82282608c94c2bf782456512beca86e52cdf5a05f4257d001744fa320fed495bec193a99795332d96dcfe6f67cdd1d80750ecc7aea86a6d7711afa5fa7b987b5a445fadca46269b88263a5cbe1168a5a097f5a474bc598b8818c2f1d3147da8db5e81e79609af5791862eab212'
			}, query, {timeout: 1000}).then((res) => {
			cb(res.data)
		}).catch((err) => {
			console.log('Error in API SERVER')
		}) 	  		
	} catch (err) {}
}

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
	  	  	node: nodeName
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
