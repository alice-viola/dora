'use strict'

let BaseResource = require('./base')

/**

kind: user
name: amedeo.setti
resource: 
	workspaces:
		- name: amedeo.setti
		  default: true
		  role: user
		- name: All
		  role: admin
	zones:
		- name: dc-rov-01
		  role: admin
		  limits: 
		  	credits:
		  		weekly: 500
	

*/

class User extends BaseResource {
	static Kind = BaseResource.Interface.Kind.User
}

module.exports = User