'use strict'

let R = require('./resource')
const mongoose = require('mongoose')
const { Schema } = mongoose


module.exports = class Workload extends R.Resource {

    static _model = null

    model () {
        return Workload._model
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
                    gpu: Object,
                    node: Object,
                    label: String
                },
                image: Object,
                volumes: Array,
                config: Object,
                plugins: Object
            },
            created: {type: Date, default: new Date()},
            status: Array,
            currentStatus: String,
            wants: {type: String, default: 'RUN'},
            scheduler: Object,
            locked: {type: Boolean, default: false}
        }
    }

    status () {
        return this._p.currentStatus
    }

    isGroupRelated () {
        return true
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
        this._p.wants = 'STOP'
    }

    hasGpuAssigned () {
        return this._p.scheduler !== undefined && this._p.scheduler.gpu !== undefined
    }

    hasCpuAssigned () {
        return this._p.scheduler !== undefined && this._p.scheduler.cpu !== undefined
    }

    ended () {
        return this._p.currentStatus == R.GE.WORKLOAD.ENDDED 
        || this._p.currentStatus == R.GE.WORKLOAD.EXITED 
        || this._p.currentStatus == R.GE.WORKLOAD.DELETED 
        || this._p.currentStatus == R.GE.WORKLOAD.CRASHED
        || this._p.currentStatus == R.GE.ERROR.PULL_FAILED
    }

    releaseGpu () {
        this._p.scheduler.gpu = []
    }

    releaseCpu () {
        this._p.scheduler.cpu = []
    }

    unlock () {
        this._p.locked = false
    }

    assignedGpu () {
        return this._p.scheduler.gpu.map((gpu) => {return gpu.uuid})    
    }

    assignedCpu () {
        return this._p.scheduler.cpu.map((cpu) => {return cpu.uuid})    
    }

    assignedCpuExtended () {
        return this._p.scheduler.cpu
    }

    _formatRes (res) {
        let result = []
        res.forEach((r) => {
            result.push(this._formatOneRes(r))
        })
        return result
    }

    _formatOneRes (res) {
        if (res == null) {
            return {error: 'Resource not exist'}
        }
        function millisToMinutesAndSeconds(millis) {
            let minutes = Math.floor(millis / 60000)
            let seconds = ((millis % 60000) / 1000).toFixed(0)
            if (minutes > 60) {
                let hours = (minutes / 60).toFixed(0)
                if (hours > 24) {
                    return (hours / 24).toFixed(0) + ' d' 
                } else {
                    return hours + ' h' 
                }
            } else {
                return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
            }
        }
        function lastUnchangedStatus () {
            let toReturn = res.status[0] 
            let last = res.status[res.status.length - 1]
            for (var i = res.status.length - 1; i = 0; i -= 1) {
                if (res.status[i].status !== last.status) {
                    toReturn = res.status[i]
                    break
                } 
            }
            return toReturn
        }
        let cpu_id = '********'
        let gpu_type = '********'
        let gpu_id = '********'
        let workloadType = null
        if (res.scheduler !== undefined && res.scheduler.cpu !== undefined) {
            if (res.scheduler.cpu.length > 0) {
                workloadType = 'cpu'
                cpu_id = res.scheduler.cpu.length + 'x ' + res.scheduler.cpu[0].product_name
            } 
        }
        if (res.scheduler !== undefined && res.scheduler.gpu !== undefined) {
            if (res.scheduler.gpu.length > 0) {
                workloadType = 'gpu'
                gpu_type = res.scheduler.gpu.map((g) => {return g.product_name})
                gpu_id = res.scheduler.gpu.map((g) => {return g.uuid})
            } 
        }
        return {
            kind: res.kind,
            group: res.metadata.group,
            name: res.metadata.name,
            node: res.scheduler !== undefined ? res.scheduler.node : '',
            c_id: (res.scheduler !== undefined && res.scheduler.container !== undefined && res.scheduler.container.id !== undefined) ? res.scheduler.container.id.substring(0, 4) : '',
            resource: workloadType == 'gpu' ? gpu_id : cpu_id,
            /*cpu_type: cpu_id,
            gpu_type: gpu_type,
            gpu_id: gpu_id,*/
            time: res.status.length !== 0 ? millisToMinutesAndSeconds(new Date() - new Date(lastUnchangedStatus().data)) : null,
            reason: res.status.length !== 0 ? res.status[res.status.length - 1].reason : '',
            status: res.currentStatus,
        }
    }

    _describeOneRes (res) { 
        let base = this._formatOneRes(res)
        base.locked = res.locked,
        base.volumes = res.spec.volumes
        base.container = res.scheduler.container
        base.status = res.status
        return base
    }
} 

