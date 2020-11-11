'use strict'

const yaml = require('js-yaml')
const fs = require('fs')
const axios = require('axios')
const path = require('path')
const { Command } = require('commander')
const PROGRAM_NAME = 'pwm'
let CFG = {}

const program = new Command()
let currentProfile = null

program.version(require('./version'), '-v, --vers', '')

let DEFAULT_API_VERSION = 'v1'
let BATCH_LIMIT = 10

/**
*	Get user home dir,
*	read conf file if present
*/
const homedir = require('os').homedir()
try {
	CFG = yaml.safeLoad(fs.readFileSync(homedir + '/.' + PROGRAM_NAME + '/config', 'utf8'))
	currentProfile = CFG.profile
} catch (err) {
	console.log(err)
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
				console.log('Error in response from API server:', err.response.statusText) 
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
			useAuthGroup: 'pwm.all'
			}, query, {timeout: 5000}).then((res) => {
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

program.command('user <action>')
.option('-f, --file <file>', 'File')
.description('user fn')
.action((action, cmdObj) => {
	try {
	  	const doc = yaml.safeLoadAll(fs.readFileSync(cmdObj.file, 'utf8'))
	  	doc.forEach((singleDoc) => { 
	  		if (singleDoc.kind !== 'User' && singleDoc.kind !== 'Group') {
	  			console.log('Wrong kind')
	  			process.exit(1)
	  		}
	  		if (singleDoc.metadata.group == undefined) {
	  			//singleDoc.metadata.group = singleDoc.metadata.name
	  		}
	  	})
	  	batchApiRequest('post', doc, action, (res) => {console.log(res)})
	} catch (e) {
	  console.log(e)
	}
})

/**
*	token create amedeo.setti
*/
program.command('token <action> <user>')
.option('-g, --group <group>', 'Group')
.description('token fn')
.action((action, user) => {
	apiRequest('post',  {apiVersion: 'v1', kind: 'token', metadata: {group: 'pwm.all'}, user: user}, action, (res) => {console.log(res)})
})

program.parse(process.argv)
