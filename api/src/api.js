'use strict'

let _ = require('lodash')
let db = require('./models/mongo')
db.init({
	host: process.env.mongohost || 'localhost',  
	port: process.env.mongoport || 27017,  
	database: process.env.mongodb || 'pwm-01',  
}, (r) => {})


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
	let res = await db.resource[args.kind].findOne({metadata: args.metadata}).lean(true)
	if ( (res === undefined || res == null) || (Object.keys(res).length === 0 && res.constructor === Object)) {
		let n = new db.resource[args.kind](args)
		await n.save()
		cb(false, `Resource ${args.kind}/${args.metadata.name} created`)	
	} else if (!smartCompare(args, res, 'spec')) {
		if (res.locked == true) {
			cb(false, `Resource ${args.kind}/${args.metadata.name} locked`)
			return		
		}
		let doc = await db.resource[args.kind].findOneAndUpdate({metadata: args.metadata}, args)
		await doc.save()
		cb(false, `Resource ${args.kind}/${args.metadata.name} configured`)	
	} else {
		cb(false, `Resource ${args.kind}/${args.metadata.name} not changed`)	
	}
}

module.exports.get = async function (args, cb)  {
	let res = await db.resource[args.kind].find().lean(true)	
	cb(false, res)
}

module.exports.getOne = async function (args, cb)  {
	let res = await db.resource[args.kind].findOne(args)	
	cb(false, res)
}

module.exports.delete = async function (args, cb)  {
	let res = await db.resource[args.kind].findOne({metadata: args.metadata}).lean(true)
	if ( (res === undefined || res == null) || (Object.keys(res).length === 0 && res.constructor === Object)) {
		cb(false, `Resource ${args.kind}/${args.metadata.name} not present`)	
	} else {
		if (res.locked == undefined || res.locked == false) {
			await db.resource[args.kind].deleteOne({metadata: args.metadata}).lean(true)
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
