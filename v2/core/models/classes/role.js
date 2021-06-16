'use strict'

let BaseResource = require('./base')

class Role extends BaseResource {
	static Kind = BaseResource.Interface.Kind.Role
 	static IsZoned = false
}

module.exports = Role