'use strict'

const BS_INSERTED = 'INSERTED'
const BS_UNSCHEDULABLE = 'UNSCHEDULABLE'
const BS_SCHEDULED = 'SCHEDULED'
const BS_PLANNED = 'PLANNED'

class ScheduleUnit {
    constructor (time, internalTime, maxResources) {
        this.time = time
        this.internalTime = internalTime
        this.maxResources = maxResources
        this.consumers = []
    }

    isInternalTimeDefined () {
        return this.internalTime !== null && this.internalTime !== undefined
    }

    timeUnit () {
        return this.internalTime + this.time
    }

    used () {
        if (this.consumers.length == 0) {
            return 0
        }
        if (this.maxResources == null) {
            return 0
        }        
        return (this.consumers.map((c) => {
            return c.resourceCount
        }).reduce((a,b) => { return a + b }))
    }

    free () {
        if (this.maxResources == null) {
            return 0
        }        
        return this.maxResources - this.used()
    }

    init (maxResources, maxContiguousResources) {
        this.maxResources = maxResources
        this.contiguousFree = maxContiguousResources
    }

    addConsumer (consumer) {
        this.consumers.push(consumer) 
    }

    removeConsumer (consumer) {
        let indexToRemove = -1
        this.consumers.some(function (c, idx) {
            if (consumer.name == c.name) {
                indexToRemove = idx
                return true
            }
        })
        this.consumers.splice(indexToRemove, 1)
    }
}


class SchedulerPool {
    constructor (name) {
        this._name = name
        this._resources = []
        this._resourceCount = 0
        this._maxUnitResourceCount = 0
        this._consumers = []
        this._internalTime = 0
        this._maxWorstTotalTime = null
        this._schedule = []
    }

    setInternalTime (time) {
        this._internalTime = time
    }    

    addResourceUnit (node) {
        if (node.resourceCount > this._maxUnitResourceCount) {
            this._maxUnitResourceCount = node.resourceCount
        }
        this._resources.push(node)
    }

    computeResource () {
        this._resources.forEach(function (node) {
            this._resourceCount += node.resourceCount
        }.bind(this))
    }

    addConsumer (consumer) {
        this._consumers.push(consumer)
    }

    schedule () {
        if (this._consumers.length == 0) {
            this._schedule = []
            return
        }
        // Build the schedule length up to the max possible (worst) length
        let maxWorstTotalTime = this._consumers.map((c) => {
            return c.resourceCount * c.minRunTime
        }).reduce((a, b) => { return a + b})      
        this._maxWorstTotalTime = maxWorstTotalTime
        if (this._schedule.length == 0) {
            for (var i = 0; i < maxWorstTotalTime; i += 1) {
                this._schedule.push(new ScheduleUnit(i, this._internalTime, this._resourceCount))
            }
        }  else if (this._schedule.length < maxWorstTotalTime) { 
            // Check we are not out of bounds, in case append
            for (var i = this._schedule.length; i < maxWorstTotalTime; i += 1) {
                this._schedule.push(new ScheduleUnit(i, this._internalTime, this._resourceCount))
            }            
        } else if (this._schedule.length > maxWorstTotalTime) {
            for (var i = maxWorstTotalTime; i < this._schedule.length; i += 1) {
                this._schedule.pop()
            }               
        }


        // Compute priority, lower is better
        this._consumers.forEach((c) => {
            if (c.priority == undefined) {
                c.priority = c.minRunTime * c.resourceCount
            }
        })

        // Sort by priority
        let _consumers = this._consumers.sort((a, b) => a.priority - b.priority) 
        
        this._cleanPlannedUnits()
        this._cleanEndedUnits()
        for (var i = 0; i < _consumers.length; i += 1) {
            this._scheduleOne(_consumers, i)
        }
    }

    // Do this to try to reschedule things that are not already running 
    _cleanPlannedUnits () {
        this._consumers.forEach(function (c, index) {
            if (c.status == BS_PLANNED) {
                for (var k = c.startTime; k < c.endTime; k += 1) {
                    this._schedule[k - c.startTime].removeConsumer(k)
                }
            }
        }.bind(this))
    }


    // Do this to try to reschedule things that are not already running 
    _cleanEndedUnits () {
        let consumersToRemove = []
        this._consumers.forEach(function (c, index) {
            if (c.status == BS_SCHEDULED && this._internalTime >= c.endTime) {
                // for (var k = c.startTime; k < c.endTime; k += 1) {
                //     this._schedule[k].removeConsumer(k)
                // }
                consumersToRemove.push(index)   
            }
        }.bind(this))
        for (var i = 0; i < consumersToRemove.length; i+= 1) {
            this._consumers.splice(consumersToRemove[i], 1)
        }
    }    

    _scheduleOne (consumers, i) {
        let consumer = consumers[i]
        if (consumer.startTime != undefined && consumer.startTime != null && this._internalTime > consumer.startTime) {
            return
        }
        if (this._resourceCount < consumer.resourceCount) {
            consumer.status = BS_UNSCHEDULABLE
            return
        }
        if (this._maxUnitResourceCount < consumer.resourceCount) {
            consumer.status = BS_UNSCHEDULABLE
            return
        }  
        // Check if from internalTime to the minRunTime there are some
        // free slots
        
        let breaks = []
        let startFreeSlot = 0
        let endFreeSlot = 0
        let freeSlotCount = 0 
        let availableSlots = []
        // console.log(this._schedule.length)
        for (var i = 0; i < this._schedule.length; i += 1) {
            if (this._schedule[i].free == null) {
                // First init
                this._schedule[i].init(this._resourceCount, this._maxUnitResourceCount)
            }
            if (this._schedule[i].free() != null) { // was this._schedule[i].contiguousFree
                if (this._schedule[i].free() < consumer.resourceCount) { // was this._schedule[i].contiguousFree
                    freeSlotCount = 0
                    breaks.push(this._internalTime + i)
                } else {
                    freeSlotCount += 1
                }
            } else {
                freeSlotCount += 1
            }
            if (freeSlotCount == consumer.minRunTime) {
                if (breaks.length == 0) {
                    startFreeSlot = this._internalTime + 0
                    endFreeSlot = this._internalTime + i + 1
                } else {
                    startFreeSlot = breaks[breaks.length - 1] + 1
                    endFreeSlot = this._internalTime + i + 1
                }
                availableSlots.push([startFreeSlot, endFreeSlot])
                startFreeSlot = endFreeSlot
                freeSlotCount = 0 
                break
            }
        }
        // console.log("--> ", consumer.name, availableSlots)
        if (availableSlots.length > 0) {
            let slot = availableSlots[0]
            consumer.startTime = slot[0]
            consumer.endTime = slot[1]
            if (consumer.startTime <= this._internalTime) {
                consumer.status = BS_SCHEDULED
            } else {
                consumer.status = BS_PLANNED
            }
            for (var i = slot[0]; i < slot[1]; i+= 1) {
                this._schedule[i - this._internalTime].addConsumer(consumer)
            }
        }
    }
}

class BackfillScheduler {
    constructor () {
        this._internalTime = 0
        this._nodes = []
        this._pools = {}
    }

    setInternalTime (time) {
        this._internalTime = time
    }

    setComputeResources (nodes) {
        this._nodes = nodes
        return this
    }

    computeResourcePools () {
        this._pools = {}
        this._nodes.forEach(function (node) {
            let poolId = node.resourceKind
            if (this._pools[poolId] == undefined) {
                this._pools[poolId] = new SchedulerPool(poolId)
            } 
            this._pools[poolId].addResourceUnit(node)
        }.bind(this))
        Object.values(this._pools).forEach(function (pool) {
            pool.computeResource()
        })
    }

    addConsumers (consumersAry) {
        consumersAry.forEach(function (consumer) {
            this.addConsumer(consumer)
        }.bind(this))
    }

    addConsumer (consumer) {
        if (this._pools[consumer.pool] == undefined) {
            return
        } else {
            if (consumer.status == undefined) {
                consumer.status = BS_INSERTED 
            }
            if (consumer.insertedAtInternalTime == undefined) {
                consumer.insertedAtInternalTime == this._internalTime 
            }            
            this._pools[consumer.pool].addConsumer(consumer)
        }
    }

    schedule () {
        Object.values(this._pools).forEach(function (pool) {
            pool.setInternalTime(this._internalTime)
            pool.schedule()
        }.bind(this))
    }
}

class BackfillSchedulerUtility {
    constructor (backfillSchedulerInstance) {
        this._bs = backfillSchedulerInstance
    }

    printPools () {
        console.log(`Pools:`)
        console.log("\t Kind\t Resources\t Count")
        console.log("\t ----------------------------")
        Object.values(this._bs._pools).forEach((pool) => {
            console.log("\t", pool._name,"\t", pool._resources.length, "\t\t", pool._resourceCount)
        })
        console.log("\n")
    }

    printNodes () {
        console.log(`Resources:`)
        console.log("\t Name\t\t Resource\t Count")
        console.log("\t --------------------------------------")
        Object.values(this._bs._pools).forEach((pool) => {
            pool._resources.forEach((node) => {
                console.log("\t", node.name,"\t", node.resourceKind, "\t\t", node.resourceCount)
            })    
        })        
        console.log("\n")
    } 

    printConsumers () {
        console.log(`Consumers:`)
        console.log("\t Name\t\t Pool\t\t Count\t\t MinRunTime\t StartTime\t EndTime \tStatus")
        console.log("\t -------------------------------------------------------------------------------------------------------------")
        Object.values(this._bs._pools).forEach((pool) => {
            pool._consumers.forEach((consumer) => {
                console.log("\t", consumer.name,"\t\t", pool._name, "\t\t", consumer.resourceCount, "\t\t", consumer.minRunTime, "\t\t", consumer.startTime || '-', "\t", consumer.endTime || '-', "\t", consumer.status || "-")
            })    
        })        
        console.log("\n")
    }

    printSchedule () {
        console.log(`Schedule: `)
        let internalTime = this._bs._internalTime
        Object.values(this._bs._pools).forEach((pool) => {
            let poolSchedule = pool._schedule
            if (pool._schedule.length !== 0) {
                console.log(`\t Pool: ${pool._name} ${pool._schedule.length}`)
                let str = ''
                let zeroUsed = 0
                let indexToBreak = 0
                poolSchedule.some((psc, idx) => {
                    if (psc.timeUnit() > internalTime) {
                        let used = psc.used()
                        if (used.length == 1) {
                            str += used + ' '
                        } else {
                            str += used + '  '
                        }
                        
                        if (used == 0) {
                            zeroUsed += 1
                        }
                        if (zeroUsed > 0) {
                            indexToBreak = idx 
                            return true
                        }
                    }
                })
                console.log(`\t\t\t ${str}`)                
                pool._consumers.forEach((c) => {
                    str = `\t Wk: ${c.name}  \t `
                    poolSchedule.some((psc, idx) => {                        
                        if (psc.timeUnit() >= internalTime) {
                            if (psc.consumers.filter((c) => {return c.status ==BS_SCHEDULED}).map((scheduledConsumers) => {
                                return scheduledConsumers.name
                            }).includes(c.name)) {
                                str += '#  '
                            } else {
                                str += '-  '
                            }
                            if (indexToBreak == idx) {
                                return true
                            }
                        } 
                    })   
                    str += c.status
                    console.log(str)   
                })
                          
             
            }
        })
    }
}


module.exports.BackfillScheduler = BackfillScheduler
module.exports.BackfillSchedulerUtility = BackfillSchedulerUtility