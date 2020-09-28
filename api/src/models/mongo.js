'use strict'

let fs = require('fs')
const mongoose = require('mongoose')
const Schema = mongoose.Schema

mongoose.set('useFindAndModify', false)

let Node = require('./node')
let Group = require('./group')
let GPUWorkload = require('./gpuworkload')
let Volume = require('./Volume')

let db

function init (conf, cb) {
	mongoose.connect('mongodb://' + conf.host + ':' + conf.port + '/' + conf.database + '', {useNewUrlParser: true, useUnifiedTopology: true })
	db = mongoose.connection
	db.on('error', console.error.bind(console, 'connection error'))
	db.once('open', async function() {
		cb(true)
	})
}

var self = module.exports = {
	resource: {
		Node: Node.model(),
		Group: Group.model(),
		GPUWorkload: GPUWorkload.model(),
		Volume: Volume.model()
	},

	db () {
		return db
	},

	init (conf, cb) {
		init(conf, cb)
		return self
	},

	update (collection, data, cb) {
		collections[collection].findOneAndUpdate({_id: data._id}, data, {useFindAndModify: true}, function(err, doc) {
		    if (err) {
		    	cb(false)
		    } else {
		    	cb(true)
		    }
		})
	}
}



