'use strict'

const EventEmitter = require('events').EventEmitter
let Piperunner = require('piperunner')
let Runner = Piperunner.Runner

class Scheduler {

	static LineState = {
		Inserted: 'inserted',
		Running: 'running',
		Ended: 'ended'
	}

	constructor () {
		this._lines = {}
		this.emitter = new EventEmitter()
	}

	line (name) {
		return this._lines[name]
	} 

	addLine (name, pipeline, jobs, opts) {
		this._lines[name] = {
			name: name,
			pipeline: pipeline,
			opts: opts,
			runLoop: null,
			state: Scheduler.LineState.Inserted,
			runner: new Runner ()
		}
		let line = this._lines[name]
		line.jobs = jobs
		line.pipeline.data.scheduler = this
		if (line.opts !== undefined && line.opts.runEveryMs !== undefined) {
			line.runLoop = setInterval (this._lineFunction(line), line.opts.runEveryMs)
		} 
		if (line.opts !== undefined && line.opts.runOnEvent !== undefined) {
			this.emitter.on(line.opts.runOnEvent, this._lineFunction(line))
		}
		if (line.opts !== undefined && line.opts.runOnEvents !== undefined) {
			line.opts.runOnEvents.forEach((event) => {
				this.emitter.on(event, this._lineFunction(line))
			})
		}
	}

	_lineFunction (line) {
		return () => {
			//console.log('Running Line', line.name, line.jobs.length)
			line.state = Scheduler.LineState.Running
			line.runner.jobs(line.jobs).pipe(line.pipeline, function () {
				//console.log(line.name, 'END')
				line.state = Scheduler.LineState.Ended
			}.bind(this))
		}
	}

	emit (event) {
		this.emitter.emit(event)
	}

	removeLine (name) {
		if (this._lines[name] !== undefined) {
			if (this._lines[name].runLoop !== null) {
				clearInterval(this._lines[name].runLoop)
			}
			delete this._lines[name]
		}
	}
}

module.exports = Scheduler