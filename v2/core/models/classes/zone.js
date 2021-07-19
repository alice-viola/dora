'use strict'

let BaseResource = require('./base')

class Zone extends BaseResource {
	static Kind = BaseResource.Interface.Kind.Zone
	static IsZoned = false

	async drain (Class) {
		this._p.desired = 'drain'
		let allWorkloadsInZone = await Class.Workload.Get({
			zone: process.env.ZONE
		}) 
		let allStorageInZone = await Class.Storage.Get({
			zone: process.env.ZONE
		}) 	

		let allVolumeInZone = await Class.Volume.Get({
			zone: process.env.ZONE
		}) 

		let allNodeInZone = await Class.Node.Get({
			zone: process.env.ZONE
		}) 			
		let allResourceCreditInZone = await Class.Resourcecredit.Get({
			zone: process.env.ZONE
		}) 			
		for (var i = 0; i < allWorkloadsInZone.data.length; i += 1) {
			let wk = allWorkloadsInZone.data[i]
			let wkObj = new Class.Workload(wk)
			await wkObj.drain()
			await Class.Action.Insert({
				zone: process.env.ZONE,
				resource_kind: 'workload',
				resource_pk: {
					zone: process.env.ZONE,
					workspace: this.name(),
					name: wkObj.name(),
				},
				action_type: 'delete',
				origin: 'api',
				destination: 'replica-controller',
				insdate: (new Date()).toISOString()	
			})				
		} 
	
		for (var i = 0; i < allStorageInZone.data.length; i += 1) {
			let vol = allStorageInZone.data[i]
			let volObj = new Class.Storage(vol)
			await volObj.$delete()			
		} 
		for (var i = 0; i < allNodeInZone.data.length; i += 1) {
			let node = allNodeInZone.data[i]
			let nodeObj = new Class.Node(node)
			await nodeObj.$delete()			
		} 			
		for (var i = 0; i < allVolumeInZone.data.length; i += 1) {
			let vol = allVolumeInZone.data[i]
			let volObj = new Class.Volume(vol)
			await volObj.$delete()			
		} 				
		for (var i = 0; i < allResourceCreditInZone.data.length; i += 1) {
			let rc = allResourceCreditInZone.data[i]
			let rcObj = new Class.Resourcecredit(rc)
			await rcObj.$delete()			
		} 				

		return await this.$delete()
	} 		
}

module.exports = Zone