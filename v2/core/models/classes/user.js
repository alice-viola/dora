'use strict'

let BaseResource = require('./base')

class User extends BaseResource {
	static Kind = BaseResource.Interface.Kind.User
}

module.exports = User