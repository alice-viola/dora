'use strict'

let _ = require('lodash')
const mongoose = require('mongoose')
const { Schema } = mongoose
let db = require('./models/mongo')
let it = require('./interactive/it')

db.init({
	host: process.env.mongohost || 'localhost',  
	port: process.env.mongoport || 27017,  
	database: process.env.mongodb || 'pwm-01',  
}, (r) => {})

let model = require('./models/models')

function smartCompare (nn, o) {
	let n = JSON.parse(JSON.stringify(nn))
	delete n['_id']
	delete n['__v']
	delete o['__v']
	delete o['_id']
	return _.isEqual(n, o)
}

module.exports.apply = async function (args, cb)  {
	if (model[args.kind] == undefined) {
		cb(true, 'Resource kind', args.kind, 'not exist')
		return
	}
	let resource = new model[args.kind](args)
	let res = await resource.model().findOne({metadata: args.metadata}).lean(true)
	if ( (res === undefined || res == null) || (Object.keys(res).length === 0 && res.constructor === Object)) {
		resource.validate()
		if (resource._valid.global == false) {
			cb(false, `Resource ${args.kind}/${args.metadata.name} not created, not valid`)		
		} else {
			cb(false, `Resource ${args.kind}/${args.metadata.name} created`)	
			await resource.create(resource[args.kind])
		}
	} else if (!smartCompare(args, res, 'spec')) {
		if (res.locked == true) {
			cb(false, `Resource ${args.kind}/${args.metadata.name} locked`)
			return		
		}
		let m = new model[args.kind](args)
		m.validate()
		if (m._valid.global == false) {
			cb(false, `Resource ${args.kind}/${args.metadata.name} not configured, not valid`)		
		} else {
			cb(false, `Resource ${args.kind}/${args.metadata.name} configured`)	
			m._p = args
			await m.update()
		}
	} else {
		cb(false, `Resource ${args.kind}/${args.metadata.name} not changed`)	
	}
}

module.exports.get = async function (args, cb) {
	let resource = new model[args.kind](args)
	let res = await resource.find(args)
	cb(false, res)
}

module.exports.describe = async function (args, cb)  {
	let resource = new model[args.kind](args)
	let res = await resource.describeOne(args)
	cb(false, res)
}

module.exports.getOne = async function (args, cb)  {
	let resource = new model[args.kind](args)
	let res = await resource.describeOne(args)
	cb(false, res)
}

module.exports.delete = async function (args, cb)  {
	let resource = new model[args.kind]()
	let res = await resource.findOneAsResource(args, model[args.kind]) 
	console.log('res', res)
	if ( (res === undefined || res == null) || (Object.keys(res).length === 0 && res.constructor === Object)) {
		cb(false, `Resource ${args.kind}/${args.metadata.name} not present`)	
	} else {
		if (res._p.locked == undefined || res._p.locked == false) {
			await res.delete()
			cb(false, `Resource ${args.kind}/${args.metadata.name} deleted`)
			
		} else {
			if (args.force) {
				await res.delete()
				cb(false, `Resource ${args.kind}/${args.metadata.name} deleted`)
			} else {
				cb(false, `Resource ${args.kind}/${args.metadata.name} locked`)	
			}
		}
	}
}

module.exports.cancel = async function (args, cb)  {
	if (cb == null) {
		cb = () => {}
	}
	let resource, res = null
	switch (args.kind) {
		case 'Workload':
			resource = new model[args.kind]()
			res = await resource.findOneAsResource(args, model[args.kind]) 
			if ( (res === undefined || res == null) || (Object.keys(res).length === 0 && res.constructor === Object)) {
				cb(false, `Resource ${args.kind}/${args.metadata.name} not present`)	
			} else {
				cb(false, `Resource ${args.kind}/${args.metadata.name} request cancel accepted`)
				res.cancel()
				await res.update()
			}
			break

		default:
			cb(false, `Cancel action for resource ${args.kind}/${args.metadata.name} is not implemented`)
	}
}

module.exports._get = async function (args, cb) {
	let resource = new model[args.kind](args)
	let res = await resource.model().find().lean()	
	cb(false, res)
}

module.exports._getOne = async function (args, cb) {
	let resource = new model[args.kind](args)
	let res = await resource.model().findOne(args).lean()	
	cb(false, res)
}

module.exports._getOneModel = async function (args, cb) {
	let resource = new model[args.kind](args)
	let _model = await resource.model().findOne({metadata: args.metadata}).lean(true)
	console.log(_model)
	cb(false, new model[args.kind](_model))
}

module.exports._proceduresGet = async function (args, cb) {
	cb(false, it.get(args.name))
}

module.exports._proceduresNext = async function (args, cb) {
	cb(false, it.next(args.name, args.key, args.res))
}

module.exports._proceduresApply = async function (args, cb) {
	cb(false, it.apply(args.name, args.responses))
}
