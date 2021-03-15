'use strict'

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const FileAsync = require('lowdb/adapters/FileAsync')


let adapter, db = null

module.exports.init = async (path) => {
	adapter = new FileAsync(path)
	db = await low(adapter)
	await db.defaults({
		ui: {},
		projects: [],
		docker: {}
	}).write()
	return db
}

module.exports.getDb = () => {
	return db
}