'use strict'

const GE = require('../../events/global')
let axios = require('axios')


let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('createWorkingDirs')


async function statusWriter (workload, status, args) {
	let err = args.err
	if (workload._p.status[workload._p.status.length -1].reason !== err) {
		workload._p.currentStatus = status
		workload._p.status.push(GE.status(status, err))
		await workload.update()
	}
}

pipe.step('checkWorkingDirStatus', async function (pipe, workload) {
	if (workload == undefined) {
		pipe.end()
	} else if (workload._p.currentStatus == null) {
		workload._p.currentStatus = GE.WORKLOAD.INSERTED
		if (workload._p.status == undefined) {
			workload._p.status = []
		}
		workload._p.status.push(GE.status(GE.WORKINGDIR.INSERTED, null))
		await workload.update()
		pipe.end()
	} else {
		pipe.next()
	}
})

pipe.step('createWorkingDir', async function (pipe, workload) {
	if (workload._p.currentStatus == GE.WORKINGDIR.INSERTED) {
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
		axios.post('http://' + address + '/workingdir/create/local', {
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
})

module.exports = scheduler