'use strict'

let R = require('./resource')

module.exports = class Workload extends R.Resource {

	validate () {
		let validationResult = {global: true, steps: []}
		this._validate(this._p.kind, R.RV.EQUAL, this._kind, validationResult)
		this._validate(this._p.metadata, R.RV.NOT_EQUAL, undefined, validationResult)
		this._validate(this._p.metadata.name, R.RV.NOT_EQUAL, undefined, validationResult)
		this._validate(this._p.metadata.group, R.RV.NOT_EQUAL, undefined, validationResult)
		this._validate(this._p.spec, R.RV.NOT_EQUAL, undefined, validationResult)
		this._valid = validationResult
		return this
	}

	setStatus (status) {
		this._p.currentStatus = status
		this._p.status.push(status.status(status.WORKLOAD.INSERTED))
		return this
	}

} 


