'use strict'

const GE = require('../../events/global')
let axios = require('axios')


let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('createVolumes')


async function statusWriter (volume, status, args) {
	let err = args.err
	if (volume._p.status[volume._p.status.length -1].reason !== err) {
		volume._p.currentStatus = status
		volume._p.status.push(GE.status(status, err))
		await volume.update()
	}
}

pipe.step('checkWorkingDirStatus', async function (pipe, volume) {
	if (volume == undefined) {
		pipe.end()
	} else if (volume._p.currentStatus == null) {
		volume._p.currentStatus = GE.VOLUME.INSERTED
		if (volume._p.status == undefined) {
			volume._p.status = []
		}
		volume._p.status.push(GE.status(GE.VOLUME.INSERTED, null))
		await volume.update()
		pipe.end()
	} else {
		pipe.next()
	}
})

pipe.step('createVolume', async function (pipe, volume) {
	if (volume._p.currentStatus == GE.VOLUME.INSERTED) {
		let volumeSpec = workload._p.spec
		let selectedStorage = null
		// Troviamo lo storage
		pipe.data.storages.some((storage) => {
			if (storage._p.metadata.name == volumeSpec.storage) {
				selectedStorage = storage
				return true
			}
		}) 
		if (selectedStorage == null) {
			statusWriter(volume, GE.VOLUME.ERROR, {err: GE.ERROR.NO_STORAGE_MATCH })
			pipe.end()
			return
		}
		// Troviamo il nodo dello storage
		let kindOfStorage = selectedStorage._p.spec.kind
		let nodeName = null
		let nfsServerAddress = null
		if (kindOfStorage == 'local') {
			nodeName = selectedStorage._p.spec.local.node
		} else if (kindOfStorage == 'nfs') {
			nodeName = selectedStorage._p.spec.nfs.node
			nfsServerAddress = selectedStorage._p.spec.nfs.server
			nfsServerRootPath = selectedStorage._p.spec.nfs.path
		} else {
			statusWriter(volume, GE.VOLUME.ERROR, {err: GE.ERROR.NO_STORAGE_TYPE_MATCH })
			pipe.end()
			return
		}

	} else {
		pipe.end()
	}
})

/*
pipe.step('createWorkingDir', async function (pipe, workload) {
	if (workload._p.currentStatus == GE.VOLUME.INSERTED) {
		console.log('-->', workload._p.spec)
		let requiredVolume = workload._p.spec.volume.name
		let requiredSubpath = workload._p.spec.volume.subpath
		
		// Get node for volume
		let selectedVolume = pipe.data.volumes.filter((volume) => {
			return volume._p.metadata.name == requiredVolume
		})
		if (selectedVolume.length != 1) {
			await statusWriter(workload, GET.WORKINGDIR.STUCK, GE.ERROR.NO_VOLUME_MATCH)
			pipe.end()
			return
		}
		selectedVolume = selectedVolume[0]

		let selectedNode = pipe.data.nodes.filter((node) => {
			return node._p.metadata.name == selectedVolume._p.spec.mount.local.node
		})
		if (selectedNode.length != 1) {
			await statusWriter(workload, GET.WORKINGDIR.STUCK, GE.ERROR.EMPTY_NODE_SELECTOR)
			pipe.end()
			return
		}
		selectedNode = selectedNode[0]

		let address = selectedNode._p.spec.address[0]
		axios.post('http://' + address + '/volume/create', {
			workingdir: workload._p,
			volume: selectedVolume._p
		}, {timeout: 3000}).then(async (res) => {
			if (res.data.created == true) {
				workload._p.currentStatus = GE.WORKINGDIR.BOUND
				workload._p.status.push(GE.status(GE.WORKINGDIR.BOUNDD, null))
				await workload.update()
			} else {
				console.log('WKDIR CREATED #NOT# C R E A T E D')
				workload._p.currentStatus = GE.WORKINGDIR.INSERTED
				workload._p.status.push(GE.status(GE.WORKINGDIR.INSERTED, {err: GE.ERROR.UNKNOWN}))
				await workload.update()
			}
			pipe.end()
		}).catch((err) => {
			console.log('NODE', address, 'IS DEAD', err)
			pipe.end()
		})
	} else {
		pipe.next()
	}
})*/

module.exports = scheduler