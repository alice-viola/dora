'use strict'

const GE = require('../../../events/global')
let Pipe = require('piperunner').Pipeline
let axios = require('axios')
let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('outOfCreditKiller')
let Workload = require ('../../../models/workload')
let DeletedResource = require ('../../../models/resource').DeletedResource
let ResourceCredit = require ('../../../models/resourcecredit')
let Bind = require ('../../../models/bind')

async function statusWriter (workload, pipe, args) {
	let err = args.err
	if (workload._p.status[workload._p.status.length -1].reason !== err) {
		workload._p.status.push(GE.status(workload._p.currentStatus, err))
		await workload.update()
	} 
}

pipe.step('check', async function (pipe, data) {
	if (data == undefined || data.length == 0) {
		pipe.end()
		return
	}
	
	let deletedWks = await DeletedResource.FindWorkloadsByUserInWindow(data._p.metadata.name, 'weekly')
	let sumSecondsComputing = 0
	let credits = 0
	deletedWks.forEach((oldWk) => {
		let startDate = null
		let endDate = oldWk.created
		oldWk.spec.resource.status.some((status) => {
			if (status.status == GE.WORKLOAD.RUNNING) {
				startDate = status.data
				return true
			}
		})
		if (startDate !== null && endDate !== null) {
			let creditPerResource = oldWk.spec.resource.creditsPerHour || 0
			const diffTime = Math.abs(endDate - startDate)
			const diffSeconds = Math.ceil(diffTime / (1000))
			sumSecondsComputing += diffSeconds
			credits += ( (diffSeconds / 3600.0) * creditPerResource)
		}
	})
	
	let currentRunningWk = await Workload.FindWorkloadsByUserInWindow(data._p.metadata.name, 'weekly')
	for (var wksIndex = 0; wksIndex < currentRunningWk.length; wksIndex += 1) {
		let currentWk = currentRunningWk[wksIndex]
		let startDate = null
		let endDate = new Date()
		let wkModel = Workload.asModel(currentWk) 
		let resourceType = wkModel.assignedResourceProductName()
		let resourceCount = wkModel.assignedResourceCount()
		currentWk.status.some((status) => {
			if (status.status == GE.WORKLOAD.RUNNING) {
				startDate = status.data
				return true
			}
		})
		let creditPerResource = await ResourceCredit.CreditForResourcePerHour(resourceType)
		if (startDate !== null && endDate !== null) {
			const diffTime = Math.abs(endDate - startDate)
			const diffSeconds = Math.ceil(diffTime / (1000))
			sumSecondsComputing += diffSeconds
			credits += ( (diffSeconds / 3600.0) * creditPerResource * resourceCount)
		}
	}
	console.log('Credits for user', data._p.metadata.name, credits)
	if (data._p.account == undefined) {
		data._p.account = {}
		data._p.account.credits = {}
		data._p.account.status = {} 
		data._p.account.status.outOfCredit = false
	}
	data._p.account.credits.weekly = credits
	if (data._p.spec.limits !== undefined 
		&& data._p.spec.limits.credits !== undefined 
		&& data._p.spec.limits.credits.weekly !== undefined 
		&& credits >= data._p.spec.limits.credits.weekly) {
		data._p.account.status.outOfCredit = true
		for (var i = 0; i < currentRunningWk.length; i+= 1) {
			let wkModel = Workload.asModel(currentRunningWk[i]) 
			await wkModel.drain(Bind)
			await wkModel.update()
		}
	} else {
		data._p.account.status.outOfCredit = false
	}
	await data.update()
	pipe.next()
})

module.exports = scheduler