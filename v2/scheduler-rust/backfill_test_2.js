'use strict'

let BackfillScheduler = require('./backfill_scheduler').BackfillScheduler
let BackfillSchedulerUtility = require('./backfill_scheduler').BackfillSchedulerUtility
let bs = new BackfillScheduler()
let bsu = new BackfillSchedulerUtility(bs)

let nodes = [
    {
        name: 'lambda01',
        resourceKind: 'RTX',
        resourceCount: 8
    },
    {
        name: 'nvidiadgx01',
        resourceKind: 'V100',
        resourceCount: 5
    },
    {
        name: 'nvidiadgx02',
        resourceKind: 'V100',
        resourceCount: 5
    }    
]

// Setup the pool
bs.setComputeResources(nodes).computeResourcePools()

// Add the wks
let consumers = [
    {
        name: 'wk01',
        pool: 'V100',
        resourceCount: 2,        
        minRunTime: 5
    },
    {
        name: 'wk02',
        pool: 'V100',
        resourceCount: 3,        
        minRunTime: 3
    },
    {
        name: 'wk03',
        pool: 'V100',
        resourceCount: 4,        
        minRunTime: 2
    },
    {
        name: 'wk04',
        pool: 'RTX',
        resourceCount: 2,        
        minRunTime: 4
    },   
    {
        name: 'wk05',
        pool: 'V100',
        resourceCount: 3,        
        minRunTime: 4
    },  
    {
        name: 'wk06',
        pool: 'V100',
        resourceCount: 3,        
        minRunTime: 2
    },   
    {
        name: 'wk07',
        pool: 'V100',
        resourceCount: 2,        
        minRunTime: 2
    },   
    {
        name: 'wk08',
        pool: 'V100',
        resourceCount: 5,        
        minRunTime: 10
    },   
    {
        name: 'wk09',
        pool: 'RTX',
        resourceCount: 1,        
        minRunTime: 10
    },                                        
]

bs.addConsumers(consumers)
//bsu.printConsumers()

let i = 0
let MAX_I = 20


let loopInterval = setInterval(() => {
    console.clear() 
    console.log("IT:", i)
    
    bs.setInternalTime(i)
    
    bs.schedule()

    bsu.printSchedule()
    bsu.printConsumers()
    i += 1    

    if (i >= MAX_I) {
        clearInterval(loopInterval) 
    } 
}, 1000)

//console.log(bs._pools["V100"]._consumers)