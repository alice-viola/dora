'use strict'

let BaseResource = require('./base')

class Workspace extends BaseResource {
	static Kind = BaseResource.Interface.Kind.Workspace
}

module.exports = Workspace