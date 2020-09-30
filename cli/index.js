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

program.command('get <resource> [name]')
.option('-g, --group <group>', 'Group')
.option('-j, --json', 'JSON output')
.option('-w, --watch', 'Watch')
.description('Get resource')
.action((resource, name, cmdObj) => {
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

program.command('delete <resource> <name>')
.option('-g, --group <group>', 'Group')
.description('cancel')
.action((resource, name, cmdObj) => {
	apiRequest('post', {kind: resource, apiVersion: DEFAULT_API_VERSION, metadata: {name: name, group: cmdObj.group}}, 
			'delete', (res) => {console.log(res)})
})

program.command('cancel <resource> <name>')
.option('-g, --group <group>', 'Group')
.description('cancel')
.action((resource, name) => {
	apiRequest('post', {kind: resource, apiVersion: DEFAULT_API_VERSION, metadata: {name: name, group: cmdObj.group}}, 
			'cancel', (res) => {console.log(res)})
})

program.command('login <username> <api>')
.description('cancel')
.action((name) => {
  	console.log(name)
})

program.parse(process.argv)
