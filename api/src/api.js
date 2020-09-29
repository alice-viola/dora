'use strict'

let _ = require('lodash')
const mongoose = require('mongoose')
const { Schema } = mongoose
let db = require('./models/mongo')

db.init({
	host: process.env.mongohost || 'localhost',  
	port: process.env.mongoport || 27017,  
	database: process.env.mongodb || 'pwm-01',  
}, (r) => {})

let model = {
	Node: require('./models/node'),
	Group: require('./models/group'),
	GPUWorkload: require('./models/gpuworkload'),
	Volume: require('./models/volume')
}

Object.keys(model).forEach((m) => {
	model[m].makeModel(m)
})

function smartCompare (nn, o) {
	let n = JSON.parse(JSON.stringify(nn))
	delete n['_id']
	delete n['__v']
	//delete n['status']
	//delete n['created']
	//delete n['currentStatus']
	//delete o['currentStatus']
	//delete o['created']
	//delete o['status']
	delete o['__v']
	delete o['_id']
	return _.isEqual(n, o)
}

module.exports.apply = async function (args, cb)  {
	let resource = new model[args.kind](args)
	let res = await resource.model().findOne({metadata: args.metadata}).lean(true)
	if ( (res === undefined || res == null) || (Object.keys(res).length === 0 && res.constructor === Object)) {
		resource.validate()
		if (resource._valid.global == false) {
			cb(false, `Resource ${args.kind}/${args.metadata.name} not created, not valid`)		
		} else {
			cb(false, `Resource ${args.kind}/${args.metadata.name} created`)	
			resource.create(resource[args.kind])
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
			m.update()
			//let doc = await m.model().findOneAndUpdate({metadata: args.metadata}, args)
			//await doc.save()			
		}
	} else {
		cb(false, `Resource ${args.kind}/${args.metadata.name} not changed`)	
	}
}

module.exports.get = async function (args, cb) {
	let resource = new model[args.kind](args)
	let res = await resource.find()
	cb(false, res)
}

module.exports.getOne = async function (args, cb)  {
	let resource = new model[args.kind](args)
	let res = await resource.findOne(args)
	cb(false, res)
}

module.exports.delete = async function (args, cb)  {
	let resource = new model[args.kind](args)
	let res = await resource.model().findOne({metadata: args.metadata}).lean(true)
	if ( (res === undefined || res == null) || (Object.keys(res).length === 0 && res.constructor === Object)) {
		cb(false, `Resource ${args.kind}/${args.metadata.name} not present`)	
	} else {
		if (res.locked == undefined || res.locked == false) {
			await resource.delete()
			//await resource.model().deleteOne({metadata: args.metadata}).lean(true)
			cb(false, `Resource ${args.kind}/${args.metadata.name} deleted`)
		} else {
			cb(false, `Resource ${args.kind}/${args.metadata.name} locked`)
		}
	}
}

module.exports.cancel = async function (args, cb)  {
	switch (args.kind) {
		case 'GPUWorkload':
			// Send to the client node the kill 
			// then delete from DB
			cb(false, {})

		default:
	}
}

module.exports._get = async function (args, cb) {
	let resource = new model[args.kind](args)
	let res = await resource.model().find().lean()	
	cb(false, res)
}

