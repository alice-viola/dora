'use strict'

module.exports.DEFAULT_API_VERSION = 'v1'

module.exports.api = {}
module.exports.api.request = () => {}

module.exports.api.version = (cb) => {
	self.api.request({
		type: 'post',
		resource: 'api',
		group: '-',
		verb: 'version'
	}, (err, data) => {
		cb(err, data)
	})	
}

module.exports.api.compatibility = () => {

}

module.exports.api.apply = {}
module.exports.api.apply.one = (doc, options, cb) => {
	self.api.request({
		type: 'post',
		resource: doc.kind,
		group: options.group,
		verb: 'apply',
		body: doc
	}, (err, data) => {
		cb(err, data)
	})	
}

module.exports.api.apply.batch = (docs, options, cb) => {
	self.api.request({
		type: 'post',
		resource: 'batch',
		group: options.group,
		verb: 'apply',
		body: docs
	}, (err, data) => {
		cb(err, data)
	})	
}

module.exports.api.remove = {}
module.exports.api.remove.one = (doc, options, cb) => {
	self.api.request({
		type: 'post',
		resource: doc.kind,
		group: options.group,
		verb: 'delete',
		body: doc
	}, (err, data) => {
		cb(err, data)
	})	
}

module.exports.api.remove.batch = (docs, options, cb) => {
	self.api.request({
		type: 'post',
		resource: 'batch',
		group: options.group,
		verb: 'delete',
		body: docs
	}, (err, data) => {
		cb(err, data)
	})
}

module.exports.api.remove.named = (kind, name, options, cb) => {
	self.api.request({
		type: 'post',
		resource: kind,
		group: options.group,
		verb: 'delete',
		body: {
			kind: kind, 
			apiVersion: self.DEFAULT_API_VERSION, 
			metadata: {name: name}}
	}, (err, data) => {
		cb(err, data)
	})
}

module.exports.api.stop = {}
module.exports.api.stop.one = (doc, options, cb) => {
	self.api.request({
		type: 'post',
		resource: doc.kind,
		group: options.group,
		verb: 'cancel',
		body: doc
	}, (err, data) => {
		cb(err, data)
	})	
}

module.exports.api.stop.batch = (docs, options, cb) => {
	self.api.request({
		type: 'post',
		resource: 'batch',
		group: options.group,
		verb: 'cancel',
		body: docs
	}, (err, data) => {
		cb(err, data)
	})
}

module.exports.api.stop.named = (name, options, cb) => {
	self.api.request({
		type: 'post',
		resource: 'Workload',
		group: options.group,
		verb: 'cancel',
		body: {
			kind: 'Workload', 
			apiVersion: self.DEFAULT_API_VERSION, 
			metadata: {name: name}}
	}, (err, data) => {
		cb(err, data)
	})
}


module.exports.api.get = {}
module.exports.api.get.one = (kind, options, cb) => {
	self.api.request({
		type: 'post',
		resource: kind,
		group: options.group,
		verb: 'get'
	}, (err, data) => {
		cb(err, data)
	})	
}

module.exports.api.get.named = (kind, name, options, cb) => {
	self.api.request({
		type: 'post',
		resource: kind,
		group: options.group,
		verb: 'getOne',
		body: {
			kind: kind, 
			apiVersion: self.DEFAULT_API_VERSION, 
			metadata: {name: name, group: options.group}}
	}, (err, data) => {
		cb(err, data)
	})
}

module.exports.api.get.stat = (type, name, options, cb) => {
	self.api.request({
		type: 'post',
		resource: 'cluster',
		group: options.group,
		verb: 'stat',
		body: {
			apiVersion: self.DEFAULT_API_VERSION, 
			period: options.period || '1m', 
			type: type, name: name}
	}, (err, data) => {
		cb(err, data)
	})
}

module.exports.api.describe = {}
module.exports.api.describe.one = (kind, name, options, cb) => {
	self.api.request({
		type: 'post',
		resource: kind,
		group: options.group,
		verb: 'describe',
		body: {
			kind: kind, 
			apiVersion: self.DEFAULT_API_VERSION, 
			metadata: {name: name, group: options.group}}
	}, (err, data) => {
		cb(err, data)
	})

}

module.exports.api.pause = {}
module.exports.api.pause.one = (name, options, cb) => {
	self.api.request({
		type: 'post',
		resource: 'Workload',
		group: options.group,
		verb: 'pause',
		body: {
			kind: 'Workload', 
			apiVersion: self.DEFAULT_API_VERSION, 
			metadata: {name: name, group: options.group}}
	}, (err, data) => {
		cb(err, data)
	})
}

module.exports.api.resume = {}
module.exports.api.resume.one = (name, options, cb) => {
	self.api.request({
		type: 'post',
		resource: 'Workload',
		group: options.group,
		verb: 'unpause',
		body: {
			kind: 'Workload', 
			apiVersion: self.DEFAULT_API_VERSION, 
			metadata: {name: name, group: options.group}}
	}, (err, data) => {
		cb(err, data)
	})
}

module.exports.api.inspect = {}
module.exports.api.inspect.one = (name, options, cb) => {
	self.api.request({
		type: 'post',
		resource: 'Workload',
		group: options.group,
		verb: 'inspect/' + encodeURIComponent(name) + '/'
	}, (err, data) => {
		cb(err, data)
	})
}

module.exports.api.logs = {}
module.exports.api.logs.one = (name, options, cb) => {
	self.api.request({
		type: 'post',
		resource: 'Workload',
		group: options.group,
		verb: 'logs/' + encodeURIComponent(name) + '/'
	}, (err, data) => {
		cb(err, data)
	})
}

module.exports.api.top = {}
module.exports.api.top.one = (name, options, cb) => {
	self.api.request({
		type: 'post',
		resource: 'Workload',
		group: options.group,
		verb: 'top/' + encodeURIComponent(name) + '/'
	}, (err, data) => {
		cb(err, data)
	})
}

module.exports.api.commit = {}
module.exports.api.commit.one = (name, repo, options, cb) => {
	self.api.request({
		type: 'post',
		resource: 'Workload',
		group: options.group,
		verb: 'commit/' + encodeURIComponent(name) + '/' + encodeURIComponent(repo || '-') + '/'
	}, (err, data) => {
		cb(err, data)
	})
}

module.exports.api.token = {}
module.exports.api.token.create = (userGroup, user, defaultGroup, id, cb) => {
	self.api.request({
		type: 'post',
		resource: 'token',
		group: 'pwm.all', //TODO, change to shared events
		verb: 'create',
		body: {
			kind: 'token', 
			apiVersion: self.DEFAULT_API_VERSION, 
			user: user, userGroup: userGroup, defaultGroup: defaultGroup, id: id}
	}, (err, data) => {
		cb(err, data)
	})
}

module.exports.api.sync = (doc, options, cb) => {

}

module.exports.api.cp = (doc, options, cb) => {

}

module.exports.api.download = (doc, options, cb) => {

}

module.exports.api.shell = {}
module.exports.api.shell.terminal = (doc, options, cb) => {

}

module.exports.api.shell.xterm = (doc, options, cb) => {

}

var self = module.exports






