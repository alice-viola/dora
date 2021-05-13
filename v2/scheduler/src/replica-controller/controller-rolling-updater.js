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
		let newContainer = new Class.Container({
			kind: 'container',
			zone: this._zone,
			workspace: workload.workspace(),
			name: workload.name() + '.' + ri,
			resource: workload.resource(),
			workload_id: workload.id()
		})

		// Delete old container
		await this._c.drain()
	}
}

module.exports = ControllerRollingUpdater

