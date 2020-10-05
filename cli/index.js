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

/**
*	Get user home dir,
*	read conf file if present
*/
const homedir = require('os').homedir()
try {
	CFG = yaml.safeLoad(fs.readFileSync(homedir + '/.' + PROGRAM_NAME + '/cfg.yaml', 'utf8'))
} catch (err) {
	console.log('You must create the configuration file @', homedir + '/.' + PROGRAM_NAME + '/cfg.yaml')
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
			}, query).then((res) => {
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

const WebSocket = require('ws')

function dockerExecCreate(id, cmd, cb) {
		axios.post(`http://localhost:3002/containers/${id}/exec`, 
			{Privileged: true, AttachStdin: true, AttachStdout: true, Tty: true, Detach: false, Cmd: [cmd]}).then((res) => {
				//console.log('->', res.data)
				dockerExecStart(id, res.data.Id, cb)
				//cb(res.data)
		}).catch((err) => {
			console.log(err)
		}) 	
}

function dockerExecStart(id, execid, cb) {
		axios.post(`http://localhost:3002/exec/${execid}/start`, 
			{Tty: true, Detach: false}).then((res) => {
				console.log(res.data)
				//cb(id)
		}).catch((err) => {
			console.log(err)
		}) 	
}

program.command('shell <container> <cmd>')
.action((container, cmd) => {
	let id = 'fa31bd605814'
	var WebSocketClient = require('websocket').client
	 
	var client = new WebSocketClient('echo-protocol')
	 
	client.on('connectFailed', function(error) {
	    console.log('Connect Error: ' + error.toString());
	});
	 
	client.on('connect', function(connection) {
	    console.log('WebSocket Client Connected');
	    //dockerExecCreate(id, cmd, () => {})
	    connection.on('error', function(error) {
	        console.log("Connection Error: " + error.toString());
	    });
	    connection.on('close', function() {
	        console.log('echo-protocol Connection Closed');
	    });
	    connection.on('message', function(message) {
	        //if (message.type === 'utf8') {
	       	console.log(message);
	        //}
	    });
	    
	    function sendNumber() {
	        if (connection.connected) {
	            connection.sendUTF('ls')
	            setTimeout(sendNumber, 1000);
	        }
	    }
	    sendNumber()
	});
	 
	client.connect(`ws://localhost:3003/containers/${id}/attach/ws?stream=true&stdout=true&stdin=true&stderr=true`);
	//let cb = (id) => {
	//	const ws = new WebSocket(`ws://localhost:3003/containers/${id}/attach/ws?stream=true&stdout=true&stdin=true&stderr=true`, {
	//	})
	//	ws.on('message', function incoming(data) {
	//	  console.log(data)
	//	})
	//	//const duplex = WebSocket.createWebSocketStream(ws, { encoding: 'utf8' })
	//	//duplex.pipe(process.stdout)
	//	//process.stdin.pipe(duplex)
	//	setInterval(() => {
	//		ws.send('ls')
	//	}, 100)
	//}
	////dockerExecCreate(id, cmd, cb)
	//cb(id)

})
program.parse(process.argv)
