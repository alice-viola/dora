'use strict'

let Core = require('../../../core/index')
let ApiInterface = Core.Api.Interface
let Class = Core.Model.Class

class DrainController {
	constructor (container) {
		this._c = container
	}

	async drain () {
		if (this._c.observed() == null || (this._c.observed().state !== 'running' && this._c.observed().state !== 'creating')) {
			await this._c.$delete()
		}
	}
}

module.exports = DrainController

