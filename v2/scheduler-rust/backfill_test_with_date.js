'use strict'

let BackfillScheduler = require('./backfill_scheduler_2').BackfillScheduler
let BackfillSchedulerUtility = require('./backfill_scheduler_2').BackfillSchedulerUtility
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
        resourceCount: 4
    },
    {
        name: 'nvidiadgx02',
        resourceKind: 'V100',
        resourceCount: 4
    }    
]

// Setup the pool
bs.setComputeResources(nodes).computeResourcePools()

// Add the wks
let consumers = [
    {
        name: 'wk01',
        pool: 'V100',
        resourceCount: 4,        
        minRunTime: 4,
        userWeekUsage: 1
    },
    {
        name: 'wk02',
        pool: 'V100',
        resourceCount: 4,        
        minRunTime: 4,
        userWeekUsage: 1
    },    
    {
        name: 'wk03',
        pool: 'V100',
        resourceCount: 1,        
        minRunTime: 3,
        userWeekUsage: 1
    },
    {
        name: 'wk04',
        pool: 'V100',
        resourceCount: 1,        
        minRunTime: 15,
        userWeekUsage: 1 
    },                                                       
    {
        name: 'wk05',
        pool: 'V100',
        resourceCount: 1,        
        minRunTime: 2,
        userWeekUsage: 6
    },    
    {
        name: 'wk06',
        pool: 'V100',
        resourceCount: 1,        
        minRunTime: 2,
        userWeekUsage: 1
    },    
    {
        name: 'wk07',
        pool: 'V100',
        resourceCount: 1,        
        minRunTime: 2,
        userWeekUsage: 1
    },            
]

bs.addConsumers(consumers)
//bsu.printConsumers()


let ITERATIONS = 1
let UPDATE_INTERVAL = 1000 //ms
let MAX_I = ITERATIONS * (Math.floor(1000 / UPDATE_INTERVAL))
let i = 0

let loopInterval = setInterval(() => {
    let date = new Date()
    let seconds = Math.floor(date.getTime() / 1000)
    console.clear() 
    console.log("IT:", i, seconds)

    bs.setCurrentTime(seconds)

    bs.schedule()
    bsu.printSchedule()
    bsu.printConsumers()

    i += 1   

    if (i >= MAX_I) {
        clearInterval(loopInterval) 
    } 
}, UPDATE_INTERVAL)

//console.log(bs._pools["V100"]._consumers)