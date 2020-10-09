'use strict'

let R = require('./resource')
const mongoose = require('mongoose')
const { Schema } = mongoose


module.exports = class CPUWorkload extends R.Resource {

    static _model = null

    model () {
        return CPUWorkload._model
    }

    static makeModel (kind) {
        if (this._model == null) {
            this._model = mongoose.model(kind, this.schema())
        }
    }

    static schema () {
        return {
            apiVersion: String,
            kind: String,
            metadata: {name: String, group: String},
            spec: {
                driver: String,
                selectors: {
                    cpu: Object,
                    node: Object,
                    label: String
                },
                image: Object,
                workingdirs: Array,
                config: Object
            },
            created: {type: Date, default: new Date()},
            status: Array,
            currentStatus: String,
            scheduler: Object,
            locked: {type: Boolean, default: false}
        }
    }

    status () {
        return this._p.currentStatus
    }

    validate () {
        let validationResult = {global: true, steps: []}
        this._validate(this._p.kind, R.RV.EQUAL, this._kind, validationResult)
        this._validate(this._p.metadata, R.RV.NOT_EQUAL, undefined, validationResult)
        this._validate(this._p.metadata.name, R.RV.NOT_EQUAL, undefined, validationResult)
        this._validate(this._p.metadata.group, R.RV.NOT_EQUAL, undefined, validationResult)
        this._validate(this._p.spec, R.RV.NOT_EQUAL, undefined, validationResult)
        this._valid = validationResult
        return this
    }

    cancel () {
        this._p.currentStatus = 'REQUESTED_CANCEL'
    }

    hasCpuAssigned () {
        return this._p.scheduler !== undefined && this._p.scheduler.cpu !== undefined
    }

    ended () {
        return this._p.currentStatus == 'EXITED'
    }

    releaseCpu () {
        this._p.scheduler.cpu = []
    }

    unlock () {
        this._p.locked = false
    }

    assignedCpu () {
        return this._p.scheduler.cpu.map((cpu) => {return cpu.uuid})    
    }

    _formatRes (res) {
        let result = []
        res.forEach((r) => {
            result.push(this._formatOneRes(r))
        })
        return result
    }

    _formatOneRes (res) {
        if (res.scheduler !== undefined) {
            
        }
        function millisToMinutesAndSeconds(millis) {
          let minutes = Math.floor(millis / 60000)
          let seconds = ((millis % 60000) / 1000).toFixed(0)
          return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
        }
        let cpu_id = ''
        if (res.scheduler !== undefined && res.scheduler.cpu !== undefined) {
            if (res.scheduler.cpu.length > 1) {
                cpu_id = res.scheduler.cpu.length + 'x ' + res.scheduler.cpu[0].uuid.slice(0, -1)
            } else {
                cpu_id = res.scheduler.cpu.map((g) => {return g.uuid})
            }
        }
        return {
            kind: res.kind,
            name: res.metadata.name,
            group: res.metadata.group,
            cpu_id: cpu_id,
            cpu_usage: res.scheduler !== undefined ? res.scheduler.cpu.map((g) => {return g.fb_memory_usage}) : '',
            node: res.scheduler !== undefined ? [res.scheduler.node] : '',
            c_id: (res.scheduler !== undefined && res.scheduler.container !== undefined && res.scheduler.container.id !== undefined) ? res.scheduler.container.id.substring(0, 4) : '',
            locked: res.locked,
            status: res.currentStatus,
            reason: res.status.length !== 0 ? res.status[res.status.length - 1].reason : '',
            time: res.status.length !== 0 ? millisToMinutesAndSeconds(new Date() - new Date(res.status[res.status.length - 1].data)) : null
        }
    }
} 