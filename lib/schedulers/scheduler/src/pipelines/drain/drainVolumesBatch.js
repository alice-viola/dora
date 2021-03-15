'use strict'

const GE = require('../../../../../index').events
let Pipe = require('piperunner').Pipeline

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('drainVolumesBatch')
let request = require('../../fn/request')

pipe.step('groupvolumesByNode', async function (pipe, data) {
	let volumes = data.volumes
	let volumesForStorage = {}
	let volumesToDelete = []
	volumes.forEach ((volume) => {
		let storages = pipe.data.storages.filter((storage) => {
			if (volume !== undefined && volume._p !== undefined && volume._p.spec !== undefined && volume._p.spec.storage !== undefined) {
				return storage._p.metadata.name == volume._p.spec.storage
			} else {
				return false
			}
		})	
		if (storages !== undefined && storages.length == 1) {
			let storage = storages[0]
			if (volumesForStorage[storage._p.metadata.name] == undefined) {
				volumesForStorage[storage._p.metadata.name] = {storage: storage, volumes: []}
			}
			volumesForStorage[storage._p.metadata.name].volumes.push(volume)
 		} else {
 			// Delete the volume from DB, the storage has been
 			// already deleted by Binds
 			volumesToDelete.push(volume)
 		}
	})
	for (var volumeToDeleteIndex = 0; volumeToDeleteIndex < volumesToDelete.length; volumeToDeleteIndex += 1) {
		await volumesToDelete[volumeToDeleteIndex].delete()
	}
	if (Object.keys(volumesForStorage).length == 0) {
		pipe.end()
	} else {
		pipe.data.volumesForStorage = volumesForStorage
		pipe.next()
	}
})

pipe.step('stopAndDelete', async function (pipe, data) {
	// To remove when pwmclient will remove the data
	let volumes = data.volumes
	for (var volumeIndex = 0; volumeIndex < volumes.length; volumeIndex += 1) {
		await volumes[volumeIndex].delete()
	}
	pipe.end()
	return
	/** Not implemented yet */
	Object.values(pipe.data.volumesForNode).forEach((nodevolumes) => {
		let batchStatusRequest = async function (node, volumes) {
			for (var volumeIndex = 0; volumeIndex < volumes.length; volumeIndex += 1) {
				volumes[volumeIndex]._p.requestedCancelSent = true
				await volumes[volumeIndex].update()
			} 
			let apiVersion = GE.DEFAULT.API_VERSION
			request({
				method: 'post',
				node: node,
				path: '/' + apiVersion + '/' + 'batch' + '/volumedelete',
				body: {data: volumes.map((volume) => {return volume._p})},
				then: async (res) => {
				}
			})
		}
		console.log('Stopping')
		batchStatusRequest(nodevolumes.node, nodevolumes.volumes)
		pipe.end()
	})
})

module.exports = scheduler 