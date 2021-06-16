'use strict'

let BaseResource = require('./base')

class Zone extends BaseResource {
	static Kind = BaseResource.Interface.Kind.Zone
	static IsZoned = false
}

module.exports = Zone