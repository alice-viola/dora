const yaml = require('js-yaml')
const fs = require('fs')
const axios = require('axios')
const shell = require('shelljs')
let table = require('text-table')
let asTable = require ('as-table')
let randomstring = require ('randomstring')
const compressing = require('compressing')
const { Command } = require('commander')
const PROGRAM_NAME = 'pwm'
let CFG = {}

const program = new Command()
program.version('0.1.3', '-v, --vers', '')

let DEFAULT_API_VERSION = 'v1'

const RESOURCE_ALIAS = {
	wk: 		 'Workload',
	gpuw: 	     'Workload',
	gpu: 	     'GPU',
	gpus: 	     'GPU',
	cpuw: 	     'Workload',
	cpu: 	     'CPU',
	cpus: 	     'CPU',
	node: 	     'Node',
	nodes: 	     'Node',
	group: 	     'Group',
	groups:      'Group',
	volume:      'Volume',
	volumes:     'Volume',
	vol:    	 'Volume',
	vols:        'Volume',
	wkd: 	     'WorkingDir',
	workingdir:  'WorkingDir',
	workingdirs: 'WorkingDir',
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

program.command('stop <resource> <name>')
.option('-g, --group <group>', 'Group')
.description('cancel')
.action((resource, name, cmdObj) => {
	resource = alias(resource)
	apiRequest('post', {kind: resource, apiVersion: DEFAULT_API_VERSION, metadata: {name: name, group: cmdObj.group}}, 
			'cancel', (res) => {console.log(res)})
})

program.command('remove <resource> <name>')
.option('-g, --group <group>', 'Group')
.description('cancel')
.action((resource, name, cmdObj) => {
	resource = alias(resource)
	apiRequest('post', {kind: resource, apiVersion: DEFAULT_API_VERSION, metadata: {name: name, group: cmdObj.group}}, 
			'remove', (res) => {console.log(res)})
})

/** Stop alias */
program.command('cancel <resource> <name>')
.option('-g, --group <group>', 'Group')
.description('cancel')
.action((resource, name, cmdObj) => {
	resource = alias(resource)
	apiRequest('post', {kind: resource, apiVersion: DEFAULT_API_VERSION, metadata: {name: name, group: cmdObj.group}}, 
			'cancel', (res) => {console.log(res)})
})

/**
*	Copy
*/
program.command('cp <src> <dst>')
.option('-g, --group <group>', 'Group')
.description('copy dir from local to volume folder')
.action(async (src, dst) => {
	let archieveName = homedir + '/pwm-vol-' + randomstring.generate(12)
	let node = dst.split(':')[0]
	let dstName = dst.split(':')[1]
	console.log('Start compressing...')
	await compressing.tar.compressDir(src, archieveName)
	console.log('Compressed! Sending...')
	const size = fs.statSync(archieveName)
	console.log(archieveName)
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
	  data: fs.createReadStream(archieveName)
	}).then((res) => {
		fs.unlink(archieveName, () => {})
		console.log('Done')
	})
})

/**
*	Shell
*/
program.command('shell <resource> <containername>')
.option('-g, --group <group>', 'Group')
.action((resource, containername, cmdObj) => {
	var DockerClient = require('./src/web-socket-docker-client')
	function main (containerId, nodeName) {
	  	var client = new DockerClient({
	  	  	url: webSocketForApiServer() + '/pwm/cshell',
	  	  	tty: true,
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
				console.log('Waiting connection...')
				try {
					main(res.c_id, res.node)	
				} catch (err) {}
			}
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
		let itMod = require('./src/it')
		itMod.setFn(res)
		let doc = await itMod.start()
		apiRequest('post', {
			apiVersion: 'v1',
			kind: 'interactive',
			name: procedure,
			responses: doc,
		}, 'apply', async (formattedRes) => {
			try {
			  	formatResource(formattedRes).forEach((resource) => {
			  		apiRequest('post', resource, 'apply', (res) => {console.log(res)})
			  	})
			} catch (e) {
			  console.log(e)
			}
		})
	})
})

program.parse(process.argv)
