'use strict'

let fs = require('fs')
let Piperunner = require('piperunner')
let DockerDriver = require('../../../../core/index').Driver.Docker
let DockerDb = require('../../../../core/index').Driver.DockerDb

let scheduler = new Piperunner.Scheduler()
let Pipe = new Piperunner.Pipeline()
let pipeline = scheduler.pipeline('clean')

pipeline.step('prune-images', async (pipe, job) => {
    await DockerDriver.pruneImages()
    pipe.next()
})

pipeline.step('prune-images', async (pipe, job) => {
    if (process.env.ENABLE_VOLUMES_PRUNE == true || process.env.ENABLE_VOLUMES_PRUNE == 'true') {
        await  DockerDriver.pruneVolumes()
    }
    pipe.next()
})

module.exports.getScheduler = () => { return scheduler }
module.exports.set = (args) => {
	db = args.db
} 