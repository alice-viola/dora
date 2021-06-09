'use strict'

let BaseResource = require('./base')

class User extends BaseResource {
	static Kind = BaseResource.Interface.Kind.User

	static IsReplicated = false
	static IsZoned = false
	static IsWorkspaced = false

	async workspaces (RoleClass) {
		let userSpec = this.resource()
		let data = userSpec
		data.tree = {zone: {}}
		
		for (var i = 0; i < userSpec.resources.length; i += 1) {
			if (userSpec.resources[i].workspace !== null && userSpec.resources[i].workspace !== undefined) {
				let res = await RoleClass.GetOne({
					name: userSpec.resources[i].role
				})
				let resSpec = userSpec.resources[i]
				let role = res.data[0]
				data.resources[i].permission = role.resource.permission
				if (data.tree.zone[resSpec.zone] == undefined) {
					data.tree.zone[resSpec.zone] = {
						workspace: {}
					}
				}
				if (data.tree.zone[resSpec.zone].workspace[resSpec.workspace] == undefined) {
					data.tree.zone[resSpec.zone].workspace[resSpec.workspace] = resSpec.workspace
				}
				if (resSpec.kind == 'All') {
					data.tree.zone[resSpec.zone].workspace[resSpec.workspace] = role.resource.permission
				} else {
					data.tree.zone[resSpec.zone].workspace[resSpec.workspace][resSpec.kind] = role.resource.permission[resSpec.kind]
				}
				
			}
		}
		return data
	}
}

module.exports = User