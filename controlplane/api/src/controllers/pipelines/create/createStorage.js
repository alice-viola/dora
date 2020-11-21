'use strict'

const GE = require('../../../events/global')
let fn = require ('../../fn/fn')
let async = require ('async')
let User = require ('../../../models/user')
let Group = require ('../../../models/group')
let Bind = require ('../../../models/bind')
let api = {v1: require('../../../api')}

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('createStorage')

let request = require('../../fn/request')

async function statusWriter(storage, status, err) {
	if (storage._p.status.length == 0 || storage._p.status[storage._p.status.length -1].reason !== err) {
		storage._p.currentStatus = status
		storage._p.status.push(GE.status(status, err))
		await storage.update()
	}
}

pipe.step('checkGroupStorage', async (pipe, data) => {
	if (data == undefined || data.storages == undefined) {
		pipe.endRunner()
		return
	}
	let queue = []
	pipe.data.groupStorage = []
	for (var i = 0; i < data.storages.length; i += 1) {
		let storage = data.storages[i]
		if (storage._p.metadata.group !== undefined) {
			queue.push((cb) => {
				api['v1']._getOneModel({kind: 'Group', metadata: {name: storage._p.metadata.group}}, (err, group) => {
					pipe.data.groupStorage.push({group: group, storage: storage})
					cb(null)
				})
			}) 
		} else {
			await statusWriter(storage, GE.STORAGE.INSERTED, GE.ERROR.NO_GROUP_SPECIFIED)
		}
	}
	async.parallel(queue, (err, result) => {
		if (err) {
			console.log('ERROR IN ASSIGN STORAGE IN GROUP FETCH')
			pipe.end()
		} else {
			pipe.next()
		}
	})
})

pipe.step('initStorage', async (pipe, data) => {
	for (var storageIndexKey = 0; storageIndexKey < pipe.data.groupStorage.length; storageIndexKey += 1) {
		let groupForStorage = pipe.data.groupStorage[storageIndexKey].group
		if (groupForStorage == null || groupForStorage._p._id == null) {
			await statusWriter(pipe.data.groupStorage[storageIndexKey].storage, GE.STORAGE.INSERTED, GE.ERROR.NO_GROUP_MATCH)
		} else {
			let storage = pipe.data.groupStorage[storageIndexKey].storage
			if (storage._p.currentStatus == undefined) {
				storage._p.currentStatus = GE.STORAGE.INSERTED
				storage._p.status.push(GE.status(GE.STORAGE.INSERTED))
				await storage.update()	
			} else if (storage._p.currentStatus == GE.STORAGE.INSERTED) {
				storage._p.locked = true
				storage._p.currentStatus = GE.STORAGE.CREATED
				storage._p.status.push(GE.status(GE.STORAGE.CREATED))
				await storage.update()	
				Bind.Create(groupForStorage, storage)
			}
		}
	}
	pipe.end()
})

module.exports = scheduler




