'use strict'

let fs = require('fs')
const mongoose = require('mongoose')
const Schema = mongoose.Schema

mongoose.set('useFindAndModify', false)

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
	db () {
		return db
	},

	init (conf, cb) {
		init(conf, cb)
		return self
	}
}



