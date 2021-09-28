'use strict'

class Pool {
    constructor (name) {
        this.name = name
        this.nodes = []
        this.resourceCount = 0
        this.workloads = []
    }

    reset () {
        this.workloads = []
    }

    addNode (node) {
        this.nodes.push(node)
    }

    addRunningWorkload (wk) {
        wk.status = 'RUNNING'
        wk.estimatedRemainingTimeToStart = 0
        this.workloads.push(wk) 
    }
    
    addPlannedWorkload (wk) {
        wk.status = 'PLANNED'
        this.workloads.push(wk) 
    }    

    addScheduledWorkload (wk) {
        wk.status = 'SCHEDULED'
        wk.estimatedRemainingTimeToStart = 0
        this.workloads.push(wk) 
    }        

    findNodeForWorkload (wk) {
        let nodesResources = {}
        let validNode = null
        this.workloads.forEach(function (rwk) {
            if ((rwk.node !== undefined || rwk.node !== null) && wk.status == 'RUNNING') {
                if (nodesResources[rwk.node] == undefined) {
                    nodesResources[rwk.node] = 0
                }  
                nodesResources[rwk.node] += rwk.resourceCount
            }
        }.bind(this))
        this.nodes.some(function (node) {
            if (node.resourceCount - nodesResources[node.name] >= wk.resourceCount) {
                validNode = node.name
                return true
            }   
        })
        return validNode
    }

    findExpectedWaitTimeForWorkload (wk) {
        let nodesResources = {}
        this.workloads.forEach(function (rwk) {
            if (nodesResources[rwk.node] == undefined) {
                nodesResources[rwk.node] = []
            }  
            nodesResources[rwk.node].push(rwk)
        }.bind(this))   

        // TODO sort nodes is some way

        // Sort workloads by remaining time
        Object.values(nodesResources).forEach(function (nr) {
            nr.sort(function (a, b) {
                return a.remainingTime - b.remainingTime
            })
        })

        let maxWait = null
        let willBeFreeResourceCount = 0
        let numberOfResourcesToFree = wk.resourceCount
        let plannedNode = null
        let toSchedule = false

        let optionsPerNode = []
        this.nodes.some(function (node) {
            let rwkOnNode = nodesResources[node.name]
            maxWait = null
            plannedNode = null
            
            if (rwkOnNode == undefined) {
                rwkOnNode = []
            }

            if (rwkOnNode.length == 0) {
                toSchedule = true
                optionsPerNode.push({
                    toSchedule: toSchedule,
                    maxWait: maxWait,
                    plannedNode: node.name
                })
                return true                
            }

            // 1. First check if there free resources,
            // consider both running and planned 
            // -
            // 2. Then we loop to the running container
            // in order to see how many resources will be free and when.
            // -
            // 3. Next we will understand if we can schedule
            // or we need to plan it, because another
            // workload is already planned, with higher priority than this.

            // 1
            let usedAndPlannedResourcesOnNode = 0
            rwkOnNode.some(function (rwk) {
                usedAndPlannedResourcesOnNode += rwk.resourceCount
            })
            if (this.resourceCount - usedAndPlannedResourcesOnNode >= wk.resourceCount) {
                // Can schedule now
                toSchedule = true
                optionsPerNode.push({
                    toSchedule: toSchedule,
                    maxWait: maxWait,
                    plannedNode: node.name
                })
                return true                         
            }

            // 2
            let freeResourceConsideringOnlyRunningWorkload = false
            let resourcesUsedNow = 0
            rwkOnNode.some(function (rwk) {
                if (rwk.status == 'RUNNING' || rwk.status == 'SCHEDULED') {
                    resourcesUsedNow += rwk.resourceCount
                }   
            })
            if (this.resourceCount - resourcesUsedNow >= wk.resourceCount) {
                freeResourceConsideringOnlyRunningWorkload = true
            }

            let planFn = () => {
                
                let wkTime = 0
                let wkWaxTime = Infinity
                
               
                let rwkOnNodeOrderedByStartAndRemaing = rwkOnNode.sort((a, b) => {
                    return (a.remainingTime + a.estimatedRemainingTimeToStart) - (b.remainingTime + b.estimatedRemainingTimeToStart)
                })
                //console.log("###", rwkOnNodeOrderedByStartAndRemaing.map((wk) => { return wk.name}))
                let availableResources = node.resourceCount - rwkOnNodeOrderedByStartAndRemaing.map((wk) => {return wk.resourceCount}).reduce((previousValue, currentValue) => previousValue + currentValue)
                let nodeFreeResources = availableResources
                let freeedResources = 0                
                //console.log("Planning", wk.name, availableResources, rwkOnNodeOrderedByStartAndRemaing.map((wk) => { return wk.name}))   
                let index = 0             
                rwkOnNodeOrderedByStartAndRemaing.some(function (rwk) {
                    
                    wkTime = rwk.estimatedRemainingTimeToStart + rwk.remainingTime
                    //console.log("Planning", wk.name, availableResources, rwkOnNodeOrderedByStartAndRemaing.map((wk) => { return wk.name}))   
                    nodeFreeResources += rwk.resourceCount
                    freeedResources += rwk.resourceCount

                    //console.log("- considering", rwk.name, nodeFreeResources, nodeFreeResources >= wk.resourceCount, wkTime, freeedResources)
                    if (nodeFreeResources >= wk.resourceCount) {
                        wkWaxTime = wkTime
                        return true
                    }
                    index += 1
                })               
                optionsPerNode.push({
                    toSchedule: false,
                    maxWait: wkWaxTime,
                    plannedNode: node.name
                })                   
            }

            //console.log('#-#', this.resourceCount, resourcesUsedNow, wk.resourceCount, freeResourceConsideringOnlyRunningWorkload)
            if (freeResourceConsideringOnlyRunningWorkload == true) {
                // 3. Check we don't break planned workload
                let canBeScheduled = true
                rwkOnNode.some(function (rwk) {
                    if (rwk.status == 'PLANNED') {
                        if (rwk.estimatedRemainingTimeToStart < wk.maxRunTime) { 
                            canBeScheduled = false
                            return true
                        } 
                    }                              
                })   
                if (canBeScheduled) {
                    optionsPerNode.push({
                        toSchedule: true,
                        maxWait: maxWait,
                        plannedNode: node.name
                    })                        
                } else {
                    // Plan it // Must recompute as before
                    planFn()                  
                }             
            } else {
                // Plan it // Must recompute as before
                planFn()                            
            }
            

        }.bind(this))    
        
        // Find the best option
        optionsPerNode.sort(function (a, b) {
            return a.maxWait - b.maxWait
        })
        
        return optionsPerNode[0]
    }    

    computeCapability () {
        this.nodes.forEach(function (n) {
            this.resourceCount += n.resourceCount
        }.bind(this))
    }

    nodesLength () {
        return this.nodes.length
    }

    getRunningWorkloads () {
        return this.workloads.filter((wk) => {return wk.status == 'RUNNING'}).length
    }
}

class ClusterPool {
    constructor (resources) {
        this.resources = resources
        this.pools = {}
    }

    buildPools () {
        this.resources.forEach(function (p) {
            if (this.pools[p.resourceKind] == undefined) {
                this.pools[p.resourceKind] = new Pool(p.resourceKind)
            } 
            this.pools[p.resourceKind].addNode(p)
        }.bind(this))
        Object.values(this.pools).forEach(function (p) {
            p.computeCapability()   
        })
    }

    reset () {
        Object.values(this.pools).forEach((p) => { p.reset() })
    }

    // Alredy ordered by prority
    backfill (workloads, iterationCount) {
        let wks = []
        workloads.forEach(function (wk) {
            if (wk.status == 'SCHEDULED') {
                wk.remainingTime = wk.maxRunTime - iterationCount
            } else if (wk.status == 'PLANNED') {
                wk.remainingTime = wk.maxRunTime
            } else {
                wk.remainingTime = wk.maxRunTime
            }
            let res = this.pools[wk.pool].findExpectedWaitTimeForWorkload(wk)
            
            if (res.toSchedule == true) {
                this.pools[wk.pool].addScheduledWorkload({
                    name: wk.name,
                    resourceCount: wk.resourceCount,
                    maxRunTime: wk.maxRunTime,
                    remainingTime: wk.remainingTime,
                    estimatedRemainingTimeToStart: 0,
                    plannedNode: res.plannedNode,
                    node: res.plannedNode
                })     
                wks.push(this.pools[wk.pool].workloads[this.pools[wk.pool].workloads.length - 1])           
            } else {
                this.pools[wk.pool].addPlannedWorkload({
                    name: wk.name,
                    resourceCount: wk.resourceCount,
                    maxRunTime: wk.maxRunTime,
                    remainingTime: wk.remainingTime,
                    estimatedRemainingTimeToStart: res.maxWait,
                    plannedNode: res.plannedNode,
                    node: res.plannedNode
                })                   
                wks.push(this.pools[wk.pool].workloads[this.pools[wk.pool].workloads.length - 1])
            }
        }.bind(this))
        return wks     
    } 

    // Containers
    addRunningWorkload (workloads) {
        workloads.forEach(function (wk) {
            this.pools[wk.pool].addRunningWorkload(wk)
        }.bind(this))        
    }

    printPools () {
        console.log("POOL NAME      ", " RC     ", "NC", "     RWK      ")
        console.log("-----------------------------------------------")
        Object.values(this.pools).forEach(function (p) {
            console.log("POOL",  p.name, "\t", p.resourceCount, "\t", p.nodesLength(), "\t", p.getRunningWorkloads())
        })        
    }  

    printWorkloads () {
        console.log("-----------------------------------------------")
        Object.values(this.pools).forEach(function (p) {
            console.log("POOL", p.name, ":")
            p.workloads.forEach((wk) => {
                console.log("\t - ", "WORKLOAD",  wk.name, "\t", wk.status, "\t", wk.node || wk.plannedNode, "\t", wk.resourceCount, "\t", `${wk.maxRunTime - wk.remainingTime}/${wk.maxRunTime}`, "\t", `${wk.remainingTime}`,  "\t", wk.estimatedRemainingTimeToStart || '-')
            })
            console.log("\n")
            let buildChar = (char, count) => {
                let str = ""
                for (var i = 0; i < count; i += 1) {
                    str += char + ' '
                }
                return str
            }
            let printOccupatedResourcePerTime = (workloads, maxTime) => {
                let str = ''
                for (var i = 0; i < maxTime; i += 1) {
                    let timeResources = 0
                    workloads.forEach((wk) => {
                        if (i >= wk.estimatedRemainingTimeToStart && i < (wk.remainingTime + wk.estimatedRemainingTimeToStart)) {
                            timeResources += wk.resourceCount
                        }
                    })
                    str += timeResources + ' '
                }
                return str
            }
            let a = '🚀'
            let maxTime = 0
            p.workloads.forEach((wk) => {    
                if (wk.estimatedRemainingTimeToStart + wk.remainingTime > maxTime) {
                    maxTime = wk.estimatedRemainingTimeToStart + wk.remainingTime
                }
                console.log("\t - ", wk.name, `[ ${wk.resourceCount} - ${wk.node} ]`, `${buildChar('-', wk.estimatedRemainingTimeToStart)}${buildChar('#', wk.remainingTime)}`)
            })            
            console.log("\t - - - - - - - - - - - - ", `[ ${printOccupatedResourcePerTime(p.workloads, maxTime)} ]`)            
        })        
    }      
}

// Run
let nodes = [
    {
        name: 'lambda01',
        resourceKind: 'RTX',
        resourceCount: 8
    },

    {
        name: 'nvidiadgx01',
        resourceKind: 'V100',
        resourceCount: 8
    },    

    {
        name: 'naboo',
        resourceKind: 'GTX',
        resourceCount: 2
    },  
    
    {
        name: 'jakku',
        resourceKind: 'GTX',
        resourceCount: 2
    },  
    
    {
        name: 'tatooine',
        resourceKind: 'GTX',
        resourceCount: 2
    },      

    {
        name: 'endor',
        resourceKind: 'GTX',
        resourceCount: 2
    }
]

let cp = new ClusterPool(nodes)
cp.buildPools()

let wktr1 = [
    {
        name: 'wk1',
        pool: 'V100',
        resourceCount: 2,        
        maxRunTime: 20
    },
    {
        name: 'wk2',
        pool: 'V100',
        resourceCount: 6,        
        maxRunTime: 30
    },
    {
        name: 'wk3',
        pool: 'V100',
        resourceCount: 1,
        maxRunTime: 2
    },
    {
        name: 'wk4',
        pool: 'V100',
        resourceCount: 1,
        maxRunTime: 2
    },
    {
        name: 'wk5',
        pool: 'V100',
        resourceCount: 1,
        maxRunTime: 2
    },    

    {
        name: 'wk6',
        pool: 'V100',
        resourceCount: 4,
        maxRunTime: 10
    }, 
    {
        name: 'wk7',
        pool: 'V100',
        resourceCount: 1,
        maxRunTime: 2
    },                               
]

let wktr2 = [
    {
        name: 'wk1',
        pool: 'V100',
        resourceCount: 5,        
        maxRunTime: 5
    },
    {
        name: 'wk2',
        pool: 'V100',
        resourceCount: 5,        
        maxRunTime: 5
    },  
    {
        name: 'wk5',
        pool: 'V100',
        resourceCount: 1,        
        maxRunTime: 5
    },    
    {
        name: 'wk3',
        pool: 'V100',
        resourceCount: 5,        
        maxRunTime: 5
    },    
    {
        name: 'wk4',
        pool: 'V100',
        resourceCount: 5,        
        maxRunTime: 5
    },      
]

let i = 0
let MAX_I = 100

let loopInterval = setInterval(() => {
    console.clear() 
    console.log("IT:", i)
    cp.reset()
    cp.backfill(wktr2, i)
    cp.printWorkloads()   
    wktr2.push(    {
        name: 'wk' + i,
        pool: 'V100',
        resourceCount: 5,        
        maxRunTime: 5
    },  )
    i += 1
    if (i >= MAX_I) {
        clearInterval(loopInterval) 
    } 
}, 1000)
