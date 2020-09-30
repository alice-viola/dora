'use strict'

class Scheduler {
	constructor () {
		this.pipelines = []
	}

	run () {
		this.pipelines.forEach(function (pipe) {
			pipe.run()
		})
	}
}

module.exports = Scheduler