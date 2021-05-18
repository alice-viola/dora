'use strict'

let Core = require('../../../core/index')
let ApiInterface = Core.Api.Interface
let Class = Core.Model.Class

class ControllerRollingUpdater {
	constructor (container) {
		this._c = container.container
		this._wk = container.workload
	}

	async update () {
		// Create New container
		//let newContainer = new Class.Container({
		//	kind: 'container',
		//	zone: this._zone,
		//	workspace: this._wk.workspace(),
		//	name: this._wk.name() + '.' + ri,
		//	resource: this._wk.resource(),
		//	workload_id: this._wk.id()
		//})

		// Delete old container
		let res = await this._c.drain()
		console.log(res)
	}
}

module.exports = ControllerRollingUpdater

