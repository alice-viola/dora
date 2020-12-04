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
	if (workload._p.status[workload._p.status.length -1].reason !== err || workload._p.currentStatus !== status) {
		workload._p.status.push(GE.status(workload._p.currentStatus, err))
		await workload.update()
	} 
}

pipe.step('check', async function (pipe, data) {
	if (data == undefined || data.length == 0) {
		pipe.end()
		return
	}

	let sumSecondsComputing = 0
	let credits = 0
	let endDate = new Date()
	
	if (data._p.account == undefined) {
		data._p.account = {}
		data._p.account.credits = {total: 0, weekly: 0, lastCheck: null, resettedDate: null}
		data._p.account.status = {} 
		data._p.account.status.outOfCredit = false
	}

	let currentRunningWk = await Workload.FindRunningWorkloadsByUserInWindow(data._p.metadata.name, 'all')
	for (var wksIndex = 0; wksIndex < currentRunningWk.length; wksIndex += 1) {
		let currentWk = currentRunningWk[wksIndex]
		let wkModel = Workload.asModel(currentWk) 
		let resourceType = wkModel.assignedResourceProductName()
		let resourceCount = wkModel.assignedResourceCount()
		let creditPerResource = await ResourceCredit.CreditForResourcePerHour(resourceType) || 0
		if (currentWk.currentStatus == GE.WORKLOAD.RUNNING) {
			let startDate = null
			if (data._p.account.credits.lastCheck == null) {
				startDate = currentWk.status[currentWk.status.length - 1].data
			} else {
				startDate = data._p.account.credits.lastCheck
			}
			if (startDate !== null && endDate !== null) {
				const diffTime = Math.abs(endDate - startDate)
				const diffSeconds = diffTime / (1000)
				// console.log('ADD WK COMPUTE', currentWk.metadata.name, startDate, endDate, diffSeconds, creditPerResource)
				sumSecondsComputing += diffSeconds
				if (data._p.account.credits.total == undefined) {
					data._p.account.credits.total = 0
				}
				if (data._p.account.credits.weekly == undefined) {
					data._p.account.credits.weekly = 0
				}
				let creditsToAdd = ( (diffSeconds / 3600.0) * creditPerResource)
				data._p.account.credits.total += creditsToAdd
				data._p.account.credits.weekly += creditsToAdd
				if (data._p.account.credits.total < data._p.account.credits.weekly) {
					data._p.account.credits.total = data._p.account.credits.weekly
				}
			}
		}
	}
	data._p.account.credits.lastCheck = endDate
	await data.update()
	console.log('Credits for user', data._p.account.credits.lastCheck, data._p.metadata.name, data._p.account.credits.weekly, data._p.spec.limits.credits.weekly)

	let resetDate = new Date()
	if (endDate.getDay() == (process.env.RESET_CREDIT_DAY || 7)
		&& (data._p.account.credits.resettedDate == undefined 
			|| data._p.account.credits.resettedDate == null 
			|| data._p.account.credits.resettedDate.toString() !== (resetDate.toISOString().split('T')[0].toString()) ) ) {
		data._p.account.credits.weekly = 0
		console.log('RESETTING DAY')
		data._p.account.credits.resettedDate = resetDate.toISOString().split('T')[0].toString()
		data._p.account.status.outOfCredit = false
		await data.update()
	}

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