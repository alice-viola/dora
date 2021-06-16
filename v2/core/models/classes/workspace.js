'use strict'

let BaseResource = require('./base')

class Workspace extends BaseResource {
	static Kind = BaseResource.Interface.Kind.Workspace
	static IsZoned = false
}

module.exports = Workspace