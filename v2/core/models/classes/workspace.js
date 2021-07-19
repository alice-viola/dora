'use strict'

let BaseResource = require('./base')

class Workspace extends BaseResource {
	static Kind = BaseResource.Interface.Kind.Workspace
	static IsZoned = false


	async drain (Class) {
		this._p.desired = 'drain'
		let allWorkloadsInWorkspace = await Class.Workload.Get({
			zone: process.env.ZONE,
			workspace: this.name()
		}) 
		let allVolumesInWorkspace = await Class.Volume.Get({
			zone: process.env.ZONE,
			workspace: this.name()
		}) 		
		for (var i = 0; i < allWorkloadsInWorkspace.data.length; i += 1) {
			let wk = allWorkloadsInWorkspace.data[i]
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
	
		for (var i = 0; i < allVolumesInWorkspace.data.length; i += 1) {
			let vol = allVolumesInWorkspace.data[i]
			let volObj = new Class.Volume(vol)
			await volObj.$delete()			
		} 		

		return await this.$delete()
	}

}

module.exports = Workspace