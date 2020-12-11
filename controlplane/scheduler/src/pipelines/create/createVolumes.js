'use strict'

const GE = require('../../../../libcommon').events
let fn = require ('../../fn/fn')
let async = require ('async')
let Models = require('../../../../libcommon').models
let User = Models.User
let Bind = Models.Bind
let api = {v1: require('../../../../libcommon').api}

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('checkVolumes')

let request = require('../../fn/request')

async function statusWriter(volume, status, err) {
	if (volume._p.status.length == 0 || volume._p.status[volume._p.status.length -1].reason !== err || workload._p.currentStatus !== status) {
		volume._p.currentStatus = status
		volume._p.status.push(GE.status(status, err))
		await volume.update()
	}
}

pipe.step('initVolume', async (pipe, volumes) => {
	if (volumes == undefined || volumes.volumes == undefined) {
		pipe.endRunner()
		return
	}
	for (var i = 0; i < volumes.volumes.length; i += 1) {
		let volume = volumes.volumes[i]
		if (volume._p.currentStatus == undefined) {
			volume._p.currentStatus = GE.VOLUME.INSERTED
			volume._p.status.push(GE.status(GE.VOLUME.INSERTED))
			await volume.update()	
		}
	}
	pipe.next()
})

pipe.step('userSelection', async (pipe, volumes) => {
	let queue = []
	pipe.data.userVolume = {}
	for (var i = 0; i < volumes.volumes.length; i += 1) {
		let volume = volumes.volumes[i]
		if (volume._p.user !== undefined && volume._p.user.user !== undefined) {
			queue.push((cb) => {
				api['v1']._getOne({kind: 'User', metadata: {name: volume._p.user.user, group: volume._p.user.userGroup}}, (err, _user) => {
					pipe.data.userVolume[volume._p.id] = _user
					cb(null)
				})
			})
		}
	}
	async.parallel(queue, (err, result) => {
		if (err) {
			console.log('ERROR IN ASSIGN VOLUME IN USER FETCH')
			pipe.end()
		} else {
			pipe.next()
		}
	})
})

pipe.step('checkVolumesRights', async function (pipe, volumes) {
	for (var volumeIndex = 0; volumeIndex < volumes.volumes.length; volumeIndex += 1) {
		let volume = volumes.volumes[volumeIndex]
		if (pipe.data.userVolume[volume._p.id] !== undefined) {
			let isAllowed = true
			let availableStorage = fn.filterStorageByUser(pipe.data.storages, pipe.data.userVolume[volume._p.id])	
			if (availableStorage.length == 0) {
				await statusWriter(volume, GE.VOLUME.DENIED, GE.ERROR.EMPTY_STORAGE_SELECTOR)
				isAllowed = false
				continue
			} else {
				if (!availableStorage.map((storage) => { return storage._p.metadata.name }).includes(volume._p.spec.storage)) {
					await statusWriter(volume, GE.VOLUME.DENIED, GE.ERROR.EMPTY_STORAGE_SELECTOR)
					isAllowed = false
					continue
				}
			}
			if (isAllowed == true) {
				volume._p.locked = true
				
				// Add binds
				for (var indexStorage = 0; indexStorage < availableStorage.length; indexStorage += 1) {
					if (availableStorage[indexStorage]._p.metadata.name == volume._p.spec.storage) {
						Bind.Create(availableStorage[indexStorage], volume)
					}
				}
				for (var groupIndex = 0; groupIndex < pipe.data.groups.length; groupIndex += 1) {
					if (pipe.data.groups[groupIndex]._p.metadata.name == volume._p.metadata.group) {
						Bind.Create(pipe.data.groups[groupIndex], volume)
						break
					}
				}
				for (var userIndex = 0; userIndex < pipe.data.users.length; userIndex += 1) {
					if (pipe.data.users[userIndex]._p.metadata.name == volume._p.user.user) {
						Bind.Create(pipe.data.users[userIndex], volume)
						break
					}
				}
				await statusWriter(volume, GE.VOLUME.CREATED, null)
			}
		}
	}
	pipe.end()
})

module.exports = scheduler




