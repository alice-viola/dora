'use strict'

let api = {v1: require('../../api')}
let Volume = require ('../../models/volume')
let WorkingDir = require ('../../models/workingdir')
let Node = require ('../../models/node')

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()

scheduler.pipeline('fetchDataFromDb').step('node', (pipe, job) => {
	api['v1']._get({kind: 'Node'}, (err, _nodes) => {
		let nodes = _nodes.map((node) => { return new Node(node) })
		pipe.data.nodes = nodes.filter((node) => {return node.isMaintenance() == false})
		pipe.next()
	})
})

scheduler.pipeline('fetchDataFromDb').step('volume', (pipe, job) => {
	api['v1']._get({kind: 'Volume'}, (err, _volumes) => {
		pipe.data.volumes = _volumes.map((volume) => { return new Volume(volume) })
		pipe.next()
	})
})

scheduler.pipeline('fetchDataFromDb').step('workingdir', (pipe, job) => {
	api['v1']._get({kind: 'WorkingDir'}, (err, _volumes) => {
		pipe.data.workingdir = _volumes.map((volume) => { return new WorkingDir(volume) })
		pipe.end()
	})
})


module.exports = scheduler