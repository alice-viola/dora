'use strict'

let BaseResource = require('./base')

class Role extends BaseResource {
	static Kind = BaseResource.Interface.Kind.Role
}

module.exports = Role