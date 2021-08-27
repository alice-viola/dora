'use strict'

let PipeRunner = require('piperunner')
let scheduler = new PipeRunner.Scheduler()
let Class = require('../core').Model.Class

const SliceTime = process.env.SLICE_TIME || 10000

let GPUUsage = {}

function saveUsageDate (gpuuid) {
	GPUUsage[gpuuid] = new Date()
}

function checkUsageDate (gpuuid) {
	if (GPUUsage[gpuuid] == undefined) {
		return true
	}
	let lastUsageDate = GPUUsage[gpuuid]
	let diffInMinutes = (new Date() - new Date(lastUsageDate)) / 1000 / 60
	if (diffInMinutes > (process.env.MAX_GPU_INACTIVITY_TIME_M || 15)) {
		return true
	} else {
		return false
	}
}

scheduler.pipeline('creditsys')
.step('fetch', async (pipeline, job) => {
	pipeline.data.containers = await Class.Container.Get({
		zone: process.env.ZONE
	})
	pipeline.data.users = await Class.User.Get({})
	let resourceCredits = await Class.Resourcecredit.Get({
		zone: process.env.ZONE	
	})
	pipeline.data.resourceCredits = {}
	resourceCredits.data.forEach((rc) => {
		pipeline.data.resourceCredits[rc.name] = rc
	})
	pipeline.next()
})

scheduler.pipeline('creditsys')
.step('match', async (pipeline, job) => {
	console.log('----------', new Date())
	let nodeCache = {}
	let endDate = new Date()
	
	for (var i = 0; i < pipeline.data.users.data.length; i += 1) {
		let user = pipeline.data.users.data[i]
		console.log('USER: ', user.name)
		let creditToAddForUser = 0
		for (var k = 0; k < pipeline.data.containers.data.length; k += 1) { 
			let container = pipeline.data.containers.data[k]
			if (container.owner == user.name) {
				let containerStatus = (container.observed !== undefined && container.observed !== null) ? container.observed.state : 'unknown'
				if (container.computed !== null && container.computed.gpus !== null && container.computed.gpus !== null && container.computed.gpus.length > 0 && containerStatus == 'running') {
					console.log('CONTAINER: ', container.name)
					// Scale to zero if not using
					if (process.env.CHECK_GPU_INACTIVITY == 'true') {
						let nodeName = container.computed.node
						let node = null
						if (nodeCache[nodeName] == undefined) {
							let _node = await Class.Node.GetOne({
								name: nodeName,
								zone: process.env.ZONE
							})
							if (_node.err == null && _node.data.length == 1) {
								node = new Class.Node(_node.data[0])
								nodeCache[nodeName] = node
							}
						} else {
							node = nodeCache[nodeName]
						}
	
						if (node !== null) {
							let usedGpus = node.areGpusUsed(container.computed.gpus)
							let lastUpdate = container.observed.lastSeen
							let minutesFromLastUpdate = (new Date() - new Date(lastUpdate)) / 1000 / 60
							console.log(lastUpdate, minutesFromLastUpdate, 'm', minutesFromLastUpdate / 60, 'h')						
							if (!usedGpus.map((g) => {return g.used }).includes(true)) {
								console.log('---> Not using all the GPUS', usedGpus.filter((v) => {return v.used == true}).length, '/', usedGpus.length)
							} else {
								usedGpus.forEach((g) => {
									saveUsageDate(g.uuid)
								})
								console.log('--->  Using at least one GPU', usedGpus.filter((v) => {return v.used == true}).length, '/', usedGpus.length)
							}
							if (minutesFromLastUpdate > (process.env.MAX_GPU_INITIAL_INACTIVITY_TIME_M || 60)) {
								let usedArray = []
								usedGpus.forEach((g) => {
									usedArray.push(checkUsageDate(g.uuid))
								})			
								if (usedArray.filter((g) => {return g == false}).length == 0) {
									console.log('--->  IS TO KILL', container.name)	
									let allwk = await Class.Workload.Get({
										zone: process.env.ZONE,
										workspace: container.workspace
									})								
									for (var j = 0; j < allwk.data.length; j += 1) {
										let wk = allwk.data[j]
										if (wk.id.toString() == container.workload_id.toString()) {
											console.log('---> Draining', wk.name, 'of', user.name)
											let wkInstance = new Class.Workload(wk)
											let wkResource = wkInstance.resource()
											if (wkResource !== undefined && wkResource.replica !== undefined) {
												wkResource.replica.count = 0
												wkInstance.set('resource', wkResource)
												await wkInstance.updateResource()
											}
										}
									}								
								} 			 
							}  						
						}
					}
					////////////////////////////////////////////////
					// Credits
					if (pipeline.data.resourceCredits[container.computed.gpuKind] !== undefined) {
						let creditsPerHour = pipeline.data.resourceCredits[container.computed.gpuKind].resource.credit.per.hour
						let creditToAdd = container.computed.gpus.length * creditsPerHour * (SliceTime / (3600 * 1000))
						creditToAddForUser += creditToAdd
					}
				} 
			}
		}
		if (creditToAddForUser !== 0) {
			let usercredit = await Class.Usercredit.Get({
				zone: process.env.ZONE,
				name: user.name
			}, false)
			if (usercredit.err == null && usercredit.data.length == 0) {
				// First time
				let newUserCredit = new Class.Usercredit({
					kind: 'usercredit',
					zone: process.env.ZONE,
					name: user.name
				})
				newUserCredit.set('computed', {
					total: creditToAddForUser,
					weekly: creditToAddForUser,
					resetDate: null,
					outOfCredit: false
				})
				console.log('ADD', user.name, creditToAddForUser, 0)
				await newUserCredit.apply()
			} else if (usercredit.data.length == 1) {
				let userCredit = new Class.Usercredit(usercredit.data[0])

				let computed = userCredit.computed()
				computed.total += creditToAddForUser
				computed.weekly += creditToAddForUser
				console.log('ADD', user.name, creditToAddForUser, computed.weekly)
				if (endDate.getDay() == (process.env.RESET_CREDIT_DAY || 0)
					&& (computed.resetDate == undefined 
						|| computed.resetDate == null 
						|| computed.resetDate.toString() !== (endDate.toISOString().split('T')[0].toString()) ) ) {
					computed.weekly = 0
					console.log('* RESETTING', user.name)
					computed.resetDate = endDate.toISOString().split('T')[0].toString()
					computed.outOfCredit = false
					
				}

				userCredit.set('computed', computed)
				await userCredit.updateComputed()
				
				// let find the credit limit for this zone
				let limit = null
				user.resource.credits.forEach((c) => {
					if (c.zone == process.env.ZONE && c.weekly !== undefined && isNaN(c.weekly) == false) {
						limit = c.weekly
					}
				}) 
				if (limit !== null && computed.weekly > limit) {
					// Drain all wk
					computed.outOfCredit = true
					userCredit.set('computed', computed)
					await userCredit.updateComputed()
					let allwk = await Class.Workload.Get({
						zone: process.env.ZONE
					})
					for (var j = 0; j < allwk.data.length; j += 1) {
						let wk = allwk.data[j]
						if (wk.owner == user.name) {
							console.log('Draining', wk.name, 'of', user.name)
							let wkInstance = new Class.Workload(wk)
							let wkResource = wkInstance.resource()
							wkResource.replica.count = 0
							wkInstance.set('resource', wkResource)
							await wkInstance.updateResource()
						}
					}
 				}
			}
		}
	}
	pipeline.next()
})

scheduler.run({
    name: 'creditsys',
    run: {
        onEvent: 'start',
        everyMs: SliceTime
    }
})

scheduler.log(false)
scheduler.emit('start')