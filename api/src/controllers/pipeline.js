'use strict'

class Pipeline {
	constructor (args) {
		this.jobs = args
		this.steps = []
		this.fns = {}
		this._jobIndex = 0
		this._stepIndex = 0
	}

	define (key, fn) {
		this.steps.push([key, fn])
	}

	on (key, fn) {
		this.fns[key] = fn
	}

	emit (key, args) {
		this.fns[key](this.jobs[this._jobIndex], this, args)
	}

	run () {
		this._jobIndex = 0
		this._stepIndex = 0
		this.steps[this._stepIndex][1](this.jobs[this._jobIndex], this)
	}

	next () {
		// console.log(this._jobIndex, this._stepIndex)
		this._stepIndex += 1
		this.steps[this._stepIndex][1](this.jobs[this._jobIndex], this)
	}

	goto (key) {
		this.steps.some ((step) => {
			if (step[0] == key) {
				step[1](this.jobs[this._jobIndex], this)	
				return true		
			}
		})
	}

	end () {
		console.log('End job')
		this._jobIndex += 1
		if (this._jobIndex == this.jobs.length) {
			console.log('End all jobs')
			this.reset()
		} else {
			this._stepIndex = 0
			this.steps[this._stepIndex][1](this.jobs[this._jobIndex], this)
		}
	}

	reset () {
		this._jobIndex = 0
		this._stepIndex = 0
		return this
	}
}

module.exports = Pipeline