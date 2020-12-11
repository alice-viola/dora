'use strict'

const GE = require('../../../../libcommon').events
let api = {v1: require('../../../../libcommon').api}
let Models = require('../../../../libcommon').models
let Workload = Models.Workload
let User = Models.User
let Bind = Models.Bind
let Group = Models.Group
let fn = require ('../../fn/fn')
let async = require ('async')
let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('createUser')

let request = require('../../fn/request')

async function statusWriter(user, status, err) {
	if (user._p.status.length == 0 || user._p.status[user._p.status.length -1].reason !== err || workload._p.currentStatus !== status) {
		user._p.currentStatus = status
		user._p.status.push(GE.status(status, err))
		await user.update()
	}
}

pipe.step('checkGroupUser', async (pipe, data) => {
	if (data == undefined || data.users == undefined) {
		pipe.endRunner()
		return
	}
	let queue = []
	pipe.data.userGroup = []
	for (var i = 0; i < data.users.length; i += 1) {
		let user = data.users[i]
		if (user._p.metadata.group !== undefined) {
			queue.push((cb) => {
				api['v1']._getOneModel({kind: 'Group', metadata: {name: user._p.metadata.group}}, (err, group) => {
					pipe.data.userGroup.push({group: group, user: user})
					cb(null)
				})
			}) 
		} else {
			await statusWriter(user, GE.USER.INSERTED, GE.ERROR.NO_GROUP_SPECIFIED)
		}
	}
	async.parallel(queue, (err, result) => {
		if (err) {
			console.log('ERROR IN ASSIGN USER IN GROUP FETCH')
			pipe.end()
		} else {
			pipe.next()
		}
	})
})

pipe.step('initUser', async (pipe, data) => {
	for (var userIndexKey = 0; userIndexKey < pipe.data.userGroup.length; userIndexKey += 1) {
		let groupForUser = pipe.data.userGroup[userIndexKey].group
		if (groupForUser == null || groupForUser._p._id == null) {
			await statusWriter(pipe.data.userGroup[userIndexKey].user, GE.USER.INSERTED, GE.ERROR.NO_GROUP_MATCH)
		} else {
			let user = pipe.data.userGroup[userIndexKey].user
			if (user._p.currentStatus == undefined) {
				user._p.currentStatus = GE.USER.INSERTED
				if (user._p.status == undefined) {
					user._p.status = []
				}
				user._p.status.push(GE.status(GE.USER.INSERTED))
				await user.update()	
			} else if (user._p.currentStatus == GE.USER.INSERTED) {
				user._p.locked = true
				user._p.currentStatus = GE.USER.CREATED
				if (user._p.status == undefined) {
					user._p.status = []
				}
				user._p.status.push(GE.status(GE.USER.CREATED))
				await user.update()	
				Bind.Create(groupForUser, user)
			}
		}
	}
	pipe.end()
})

module.exports = scheduler




