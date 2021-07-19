<template>
    <div class="resource">
        <v-row class="pa-0 pt-0">
            <v-col class="col-12" v-if="$store.state.smallViewport == true"
                ciao
            </v-col>
            <v-col class="col-12 col-md-3 col-lg-3 pa-0 pl-4 pt-1">
                <v-card class="grey darken-3 elevation-2">
                    <v-card-title class="overline pt-0 pb-0">Workloads ({{workloads.length }})  </v-card-title>
                </v-card>

                <div v-if="workloads.length > 0">
                    <draggable
                        :list="workloads"
                        class="dragArea list-group"
                        
                        :group="{ name: 'torun', pull: 'clone', put: false }"
                        @start="draggingWk = true"
                        @end="draggingWk = false"    
                        @change="logDragWk"    
                    >              
                       
                        <div v-for="c in workloads" v-bind:key="c.name">
                            <div>
                                <WorkloadCard color="#607d8b" class="ma-2 mt-1 blue-grey" v-if="highlightedWk == c.name" :workload="c"/>
                                <WorkloadCard color="#607d8b" class="ma-2 mt-1" v-else :workload="c"/>
                            </div>
                        </div>
                    
                    </draggable>
                    
                    <v-card class="mx-auto ma-2 mt-1">
                        <v-card-title class="pa-0">
                          <v-btn text color="primary" style="width: 100%" @click="createNew"> Create new </v-btn>
                        </v-card-title>
                    </v-card>
                    
                </div>
                <div v-else>
                    <v-card class="mx-auto ma-2 mt-1">
                        <v-card-title class="pa-3 pt-4">
                          <v-btn text color="primary" style="width: 100%" @click="createNew"> Create the first workload </v-btn>
                        </v-card-title>
                    </v-card>
                </div>
            </v-col>

            <v-col class="col-12 col-md-9 col-lg-0 pa-0 pb-0 pl-3 pr-6">
                <v-row class="pa-0 mt-0">
                    <!-- Queue -->
                    <v-col class="col-12 col-md-3 col-lg-3 pa-1 pt-1">
                        <v-card class="teal--text grey darken-3 elevation-2">
                            <v-card-title class="overline pt-0 pb-0">To run ({{unknownContainers.length }}) </v-card-title>
                        </v-card>
                    <draggable
                        :list="unknownContainers"
                        :disabled="false"
                        class="dragArea list-group"
                        group="torun"  
                        @change="logDragWk"
                        
                    >                           
                        <div v-if="unknownContainers.length > 0">
                            <div v-for="c in unknownContainers">
                                <div @click="highlightWkFromContainer(c.name)">
                                    <ContainerCard class="ma-2 mt-1 teal" v-if="c.name.includes(highlightedWk)" :container="c" color="#009688"/>
                                    <ContainerCard class="ma-2 mt-1" v-else :container="c" color="#009688"/>
                                </div>
                            </div>
                        </div>
                        <div v-else>
                            <v-card class="mx-auto ma-2 elevation-2 mt-1">
                                <v-card-title>
                                  <span class="overline font-weight-light">Nothing to show</span>
                                </v-card-title>
                            </v-card>
                        </div>
                    </draggable>
                    </v-col>
        
                    <!-- Running -->
                    <v-col class="col-12 col-md-3 col-lg-3 pa-1 pt-1">
                        <v-card class="green--text grey darken-3  elevation-2">
                            <v-card-title class="overline pt-0 pb-0">Running ({{runningContainers.length }}) </v-card-title>
                        </v-card>
                        <div v-if="runningContainers.length > 0">
                            <div v-for="c in runningContainers">
                                <div @click="highlightWkFromContainer(c.name)">
                                    <ContainerCard class="ma-2 mt-1 green" v-if="c.name.includes(highlightedWk)" :container="c" color="#4CAF50"/>
                                    <ContainerCard class="ma-2 mt-1" v-else :container="c" color="#4CAF50"/>
                                </div>
                            </div>
                        </div>
                        <div v-else>
                            <v-card class="mx-auto ma-2 elevation-2 mt-1">
                                <v-card-title>
                                  <span class="overline font-weight-light">Nothing to show</span>
                                </v-card-title>
                            </v-card>
                        </div>
                    </v-col>
        
                    <!-- Completed -->
                    <v-col class="col-12 col-md-3 col-lg-3 pa-1 pt-1">
                        <v-card class="blue--text grey darken-3 lighten-1 elevation-2">
                            <v-card-title class="overline pt-0 pb-0">Completed ({{completedContainers.length}})</v-card-title>
                        </v-card>
                                            
                        <div v-if="completedContainers.length > 0">
                            <div v-for="c in completedContainers">
                                <div @click="highlightWkFromContainer(c.name)">
                                    <ContainerCard class="ma-2 mt-1 blue" v-if="c.name.includes(highlightedWk)" :container="c" />
                                    <ContainerCard class="ma-2 mt-1" v-else :container="c" />
                                </div>
                            </div>                            
                            <!--<ContainerCard class="ma-2 mt-1 " v-for="c in completedContainers" :container="c"/>-->
                        </div>
                        <div v-else>
                            <v-card class="mx-auto ma-2 mt-1  elevation-2">
                                <v-card-title>
                                  <span class="overline font-weight-light">Nothing to show</span>
                                </v-card-title>
                            </v-card>
                        </div>
                    </v-col>

                    <!-- Failed -->
                    <v-col class="col-12 col-md-3 col-lg-3 pa-1 pt-1">
                        <v-card class="error--text grey darken-3 lighten-1  elevation-2">
                            <v-card-title class="overline pt-0 pb-0">Failed ({{failedContainers.length}})</v-card-title>
                        </v-card>
                        <div v-if="failedContainers.length > 0">
                            <div v-for="c in failedContainers">
                                <div @click="highlightWkFromContainer(c.name)">
                                    <ContainerCard class="ma-2 mt-1  error lighten-1" v-if="c.name.includes(highlightedWk)" :container="c" color="#FF5252"/>
                                    <ContainerCard class="ma-2 mt-1 " v-else :container="c" color="#FF5252"/>
                                </div>
                            </div>
                        </div>
                        <div v-else>
                            <v-card class="mx-auto ma-2 mt-1 elevation-2">
                                <v-card-title>
                                  <span class="overline font-weight-light">Nothing to show</span>
                                </v-card-title>
                            </v-card>
                        </div>
                    </v-col>

                </v-row>
            </v-col>
        </v-row>
        <v-dialog fullscreen v-model="createNewWorkloadDialog" >
          <WorkloadEditor :_workload="null" :keywwk="newWkKey" v-on:close-dialog="createNewWorkloadDialog = false" v-if="createNewWorkloadDialog"/>
        </v-dialog>
    </div>
</template>

<script>
// @ is an alias to /src
import axios from 'axios'
import EditResource from '@/components/EditResource.vue'
import Search from 'search-json'
import CreateResource from '@/components/CreateResource.vue'
import ResourceDetail from '@/views/ResourceDetail.vue'
import MonitorResource from '@/components/MonitorResource.vue'
import WorkloadEditor from '@/components/WorkloadEditor.vue'

import ContainerCard from '@/components/ContainerCard.vue'
import WorkloadCard from '@/components/WorkloadCard.vue'
import draggable from 'vuedraggable'


export default {
    name: 'ResourceCardWk',
    components: {
        EditResource, CreateResource, ResourceDetail, MonitorResource, ContainerCard, WorkloadCard, draggable, WorkloadEditor
    },
    watch: {
        $route(to, from) { 
            if (to !== from) { 
                this.$store.commit('search', {filter: ''})
                this.displayResource = []
                this.itemToEdit = {}
                this.resourceKind = this.$route.params.name
                this.toDeleteItem = null
                this.toStopItem = null
                this.fetch() 
            } 
        },
        '$store.state.search.filter' (to, from) {
            this.filterResource()
        },
        '$store.state.search.page' (to, from) {
            this.filterResource()
        },
        selectedWorkload (to, from) {
            this.setWk(to)
        }
    },
    data: function () {
        return {
            containers: [],
            filteredContainers: [],
            workloads: [],

            runningContainers: [],
            unknownContainers: [],
            completedContainers: [],
            failedContainers: [],


            highlightedWk: null,
            selectedWorkload: null,
            newWkKey: 0,

            createNewWorkloadDialog: false,


            cliname: 'doracli',
            cliHelperItem: {},
            itemToEdit: {},
            itemToMonitor: {},
            newResourceDialog: false,
            filesToUpload: [],
            volumeUploadDownload: 0,
            copiedDialog: false,
            uploadDialog: false,
            showResourceDetailDialog: false,
            editDialog: false,
            commitDialog: false,
            terminalDialog: false,
            deleteItemDialog: false,
            monitorDialog: false,
            stopItemDialog: false,
            cliHelperDialog: false,
            resourceToInspect: {},
            toDeleteItem: null,
            fetchInterval: undefined,
            search: '',
            resourceKind: this.$route.params.name,
            resource: [],
            displayResource: [],
            headers: [],
            commit: {repo: '-', tag: null, mode: 0},


            draggingWk: false
        }
    },
    computed: {
        wkDragOptions() {
          return {
            animation: 200,
            group: "description",
            disabled: false,
            ghostClass: "ghost"
          }
        }        
    },
    methods: {
        logDragContainerToStop (evt) {

        },
        logDragWk (evt) {
            if (evt.added !== undefined) {
                this.scaleUp(evt.added.element)
            }
        },
        closeDialog: function() {
            this.createNewWorkloadDialog = false
        },  
        createNew () {
            this.newWkKey = Math.random()
            this.createNewWorkloadDialog = true
        },
        scaleDown () {
            let wks = this.workloads.filter(function (wk) {
                return wk.name == this.highlightedWk
            }.bind(this))
            if (wks.length == 1) {
                let wk = wks[0]
                this.$store.dispatch('describe', {name: wk.name, workspace: wk.workspace, kind: 'Workload', cb: function (data) {
                  if (data.length == 1) {
                    let newWk = {}
                    newWk.kind = 'Workload'
                    newWk.metadata = {name: wk.name, workspace: wk.workspace}
                    newWk.spec = data[0].resource  
                    if (parseInt(newWk.spec.replica.count) > 0) {
                        newWk.spec.replica.count = parseInt(newWk.spec.replica.count) - 1    
                    }
                    this.$store.dispatch('apply', newWk)
                  }
                }.bind(this)})                 
            }
        },
        scaleUp (wk) {
            console.log(wk)
            this.$store.dispatch('describe', {name: wk.name, workspace: wk.workspace, kind: 'Workload', cb: function (data) {
              if (data.length == 1) {
                let newWk = {}
                newWk.kind = 'Workload'
                newWk.metadata = {name: wk.name, workspace: wk.workspace}
                newWk.spec = data[0].resource  
                newWk.spec.replica.count = parseInt(newWk.spec.replica.count) + 1
                this.$store.dispatch('apply', newWk)
              }
            }.bind(this)})                             
        },
        highlightWk (name) {
            this.highlightedWk == name ? this.highlightedWk = null : this.highlightedWk = name
        },
        highlightWkFromContainer (name) {
            let wks = this.workloads.filter(function (wk) {
                return name.includes(wk.name)
            }.bind(this))
            if (wks.length == 1) {
                this.highlightedWk == wks[0].name ? this.highlightedWk = null : this.highlightedWk = wks[0].name    
            }
        },
        setWk (name) {
            if (name == 'All') {
                this.filteredContainers = this.containers  
                this.runningContainers =  this.filteredContainers.filter((c) => {return c.status == 'running' })   
                this.unknownContainers =  this.filteredContainers.filter((c) => {return c.status !== 'running' && c.status !== 'failed' && c.status !== 'exited' && c.status !== 'draining' && c.status !== 'deleted' })
                this.completedContainers =  this.filteredContainers.filter((c) => {return c.status == 'exited' })
                this.failedContainers =  this.filteredContainers.filter((c) => {return c.status == 'failed' })
            } else {
                this.filteredContainers = this.containers.filter((c) => {return c.name.includes(name) })   
                this.runningContainers =  this.filteredContainers.filter((c) => {return c.status == 'running' })   
                this.unknownContainers =  this.filteredContainers.filter((c) => {return c.status !== 'running' && c.status !== 'failed' && c.status !== 'exited' && c.status !== 'draining' && c.status !== 'deleted' })
                this.completedContainers =  this.filteredContainers.filter((c) => {return c.status == 'exited' })
                this.failedContainers =  this.filteredContainers.filter((c) => {return c.status == 'failed' })
            }
        },
        openMonitor (item) {
          this.monitorDialog = true
          this.itemToMonitor = item
        },
        openCLIHelper (item) {
            this.cliHelperItem = item
            this.cliHelperDialog = true
        },
        fetch () {
            let workloadOrder = this.workloads.map((w) => {return w.name})
            this.$store.dispatch('resource', {name: 'Workload', cb: function (data) {
                if (this.draggingWk == true) {
                    return
                }
                let workloadOrderNew = data.map((w) => {return w.name})
                let appended = []
                this.workloads = []
                for (var i = 0; i < workloadOrder.length; i += 1) {
                    let newIndex = workloadOrderNew.indexOf(workloadOrder[i])
                    if (newIndex !== -1) {
                        this.workloads.push(data[newIndex])
                        appended.push(data[newIndex].name)
                    }
                }
                for (var i = 0; i < workloadOrderNew.length; i += 1) {
                    if (!appended.includes(workloadOrderNew[i])) {
                        this.workloads.push(data[i])
                    }
                }
                this.$store.commit('workloadOrder', this.workloads)
                
                this.$store.dispatch('resource', {name: 'Container', cb: function (data) {
                    this.containers = []
                    let containersNames = data.map((c) => {
                        let splited = c.name.split('.')
                        splited.pop()
                        return splited.join('.')
                    })
                    let map = {}
                    containersNames.forEach((name, index) => {
                        if (map[name] == undefined) {
                            map[name] = []
                            map[name].push(index)
                        } else {
                            map[name].push(index)
                        }
                    })

                    for (var i = 0; i < this.workloads.length; i += 1) {
                        if (map[this.workloads[i].name] == undefined) {
                            continue
                        }
                        for (var k = 0; k < map[this.workloads[i].name].length; k += 1) {
                            let cData = data[map[this.workloads[i].name][k]]
                            this.containers.push(cData)   
                        }
                    }
                    if (this.selectedWorkload == null) {
                        this.selectedWorkload = 'All'
                    }
                    this.setWk(this.selectedWorkload)
                }.bind(this)}, true)    
            }.bind(this)}, true)    
        },
        askCommit (item) {
            this.$store.dispatch('describe', {
                kind: item.kind, 
                name: item.name, 
                group: item.group, 
                cb: function (data) {
                let resourceSpec = data.spec
                let currentRepo = ''
                if (resourceSpec.image.repository !== undefined) {
                    currentRepo += resourceSpec.image.repository + '/'
                }
                currentRepo += resourceSpec.image.image.split(':')[0]
                this.commit = {repo: currentRepo, tag: null, item: item}
                if (resourceSpec.image.image.split(':').length > 1) {
                    this.commit.tag = resourceSpec.image.image.split(':')[1]
                }
                this.commitDialog = true  
            }.bind(this)}) 
        },
        confirmCommit () {
            let repo = ''
            if (this.commit.mode == 1) {
              if (this.commit.tag != null && this.commit.tag != '') {
                  repo += this.commit.repo + ':' + this.commit.tag
              } else {
                  repo += this.commit.repo
              }
            } else {
              repo = '-'
            }
            this.commitDialog = false
            this.$store.dispatch('commit', {name: this.commit.item.name, repo: repo, cb: function (data) {

            }.bind(this)})    
        },
        pause (item) {
            this.$store.dispatch('pause', item)  
        },
        resume (item) {
            this.$store.dispatch('resume', item)  
        },
        deleteItem (item) {
            this.deleteItemDialog = true
            this.toDeleteItem = item
        },
        stopItem (item) {
            this.stopItemDialog = true
            this.toStopItem = item
        },
        confirmDelete () {
            this.deleteItemDialog = false
            this.$store.dispatch('delete', this.toDeleteItem)  
        },
        confirmStop () {
            this.stopItemDialog = false
            this.$store.dispatch('stop', this.toStopItem)   
        },
        connect (item) {
            let routeData = this.$router.resolve({name: 'Shell', path: '/shell/', query: {item: JSON.stringify(item) }})
            window.open(routeData.href, item.name, "height=800,width=1024,toolbar=no,menubar=no,resizable=yes")
            // this.$router.push({name: 'Shell', path: '/shell/' + item.name, params: {item: item}})
        }
    },
    mounted () {
        if (this.$store.state.workloadOrder !== undefined) {
            this.workloads = this.$store.state.workloadOrder
        }
        if (this.fetchInterval == undefined) {
            this.fetch()
            this.fetchInterval = setInterval(function () {
                this.fetch()
            }.bind(this), 1000)
        }
    },
    beforeDestroy () {
        clearInterval(this.fetchInterval)
    }
}
</script>
<style>

</style>