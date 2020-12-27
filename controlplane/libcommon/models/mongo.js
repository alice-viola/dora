'use strict'

let fs = require('fs')
const mongoose = require('mongoose')
const Schema = mongoose.Schema

mongoose.set('useFindAndModify', false)

let db

function init (_conf, cb) {
	let conf = {
		host: process.env.dbhost || 'localhost',
		port: process.env.dbport || '27017',
		database: process.env.dbname || 'pwm-01',
	}
	mongoose.connect('mongodb://' + conf.host + ':' + conf.port + '/' + conf.database + '', {useNewUrlParser: true, useUnifiedTopology: true })
	db = mongoose.connection
	db.on('error', () => {
		console.error.bind(console, 'connection error')
		init(_conf, db)
	})
	db.once('open', async function() {
		cb(mongoose.connection)
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



