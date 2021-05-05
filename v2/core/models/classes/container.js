'use strict'

let BaseResource = require('./base')

class Container extends BaseResource {
	static Kind = BaseResource.Interface.Kind.Container
}

module.exports = Container