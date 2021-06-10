<template>
    <div class="resource">
        <v-row class="pa-2 pt-0">
            <v-col class="col-12 col-md-2 col-lg-2 pa-2 pl-4">
                <v-card class="blue-grey">
                    <v-card-title class="overline pt-5 pb-4">Workloads ({{workloads.length }}) </v-card-title>
                </v-card>
               <div v-if="workloads.length > 0">
                    <div v-for="c in workloads">
                        <div @click="highlightWk(c.name)">
                            <WorkloadCard color="#607d8b" class="ma-2 blue-grey" v-if="highlightedWk == c.name" :workload="c"/>
                            <WorkloadCard color="#607d8b" class="ma-2" v-else :workload="c"/>
                        </div>
                    </div>
                </div>
                <div v-else>
                    <v-card class="mx-auto ma-2">
                        <v-card-title>
                          <span class="text-h6 font-weight-light">Create new workload</span>
                        </v-card-title>
                    </v-card>
                </div>
            </v-col>

            <v-col class="col-12 col-md-10 col-lg-0 pa-2 pb-0 pl-3 pr-6">
                <v-row class="pa-0 mt-0">
                    <v-col class="col-12 col-md-12 col-lg-12 pa-0 pl-1 pr-1">
                        <v-card class="blue-grey">
                            <v-card-title class="overline pt-0 pb-0">Containers ({{containers.length}})</v-card-title>
                        </v-card>
                    </v-col>
                    <!-- Queue -->
                    <v-col class="col-12 col-md-3 col-lg-3 pa-1 pt-1">
                        <v-card class="teal">
                            <v-card-title class="overline pt-0 pb-0">In queue ({{unknownContainers.length }}) </v-card-title>
                        </v-card>
                        <div v-if="unknownContainers.length > 0">
                            <div v-for="c in unknownContainers">
                                <div @click="highlightWkFromContainer(c.name)">
                                    <ContainerCard class="ma-2 teal" v-if="c.name.includes(highlightedWk)" :container="c" color="#009688"/>
                                    <ContainerCard class="ma-2" v-else :container="c" color="#009688"/>
                                </div>
                            </div>
                        </div>
                        <div v-else>
                            <v-card class="mx-auto ma-2">
                                <v-card-title>
                                  <span class="overline font-weight-light">Nothing to show</span>
                                </v-card-title>
                            </v-card>
                        </div>
                    </v-col>
        
                    <!-- Running -->
                    <v-col class="col-12 col-md-3 col-lg-3 pa-1 pt-1">
                        <v-card class="green">
                            <v-card-title class="overline pt-0 pb-0">Running ({{runningContainers.length }}) </v-card-title>
                        </v-card>
                        <div v-if="runningContainers.length > 0">
                            <div v-for="c in runningContainers">
                                <div @click="highlightWkFromContainer(c.name)">
                                    <ContainerCard class="ma-2 green" v-if="c.name.includes(highlightedWk)" :container="c" color="#4CAF50"/>
                                    <ContainerCard class="ma-2" v-else :container="c" color="#4CAF50"/>
                                </div>
                            </div>
                        </div>
                        <div v-else>
                            <v-card class="mx-auto ma-2">
                                <v-card-title>
                                  <span class="text-h6 font-weight-light">Create one</span>
                                </v-card-title>
                            </v-card>
                        </div>
                    </v-col>
        
                    <!-- Failed -->
                    <v-col class="col-12 col-md-3 col-lg-3 pa-1 pt-1">
                        <v-card class="error lighten-1">
                            <v-card-title class="overline pt-0 pb-0">Failed ({{failedContainers.length}})</v-card-title>
                        </v-card>
                        <div v-if="failedContainers.length > 0">
                            <div v-for="c in failedContainers">
                                <div @click="highlightWkFromContainer(c.name)">
                                    <ContainerCard class="ma-2 error lighten-1" v-if="c.name.includes(highlightedWk)" :container="c" color="#FF5252"/>
                                    <ContainerCard class="ma-2" v-else :container="c" color="#FF5252"/>
                                </div>
                            </div>
                        </div>
                        <div v-else>
                            <v-card class="mx-auto ma-2">
                                <v-card-title>
                                  <span class="overline font-weight-light">Nothing to show</span>
                                </v-card-title>
                            </v-card>
                        </div>
                    </v-col>
                    <!-- Completed -->
                    <v-col class="col-12 col-md-3 col-lg-3 pa-1 pt-1">
                        <v-card class="blue lighten-1">
                            <v-card-title class="overline pt-0 pb-0">Completed ({{completedContainers.length}})</v-card-title>
                        </v-card>
                        <div v-if="completedContainers.length > 0">
                            <ContainerCard class="ma-2" v-for="c in completedContainers" :container="c"/>
                        </div>
                        <div v-else>
                            <v-card class="mx-auto ma-2">
                                <v-card-title>
                                  <span class="overline font-weight-light">Nothing to show</span>
                                </v-card-title>
                            </v-card>
                        </div>
                    </v-col>

                </v-row>
            </v-col>
        </v-row>
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

import ContainerCard from '@/components/ContainerCard.vue'
import WorkloadCard from '@/components/WorkloadCard.vue'
import draggable from 'vuedraggable'


export default {
    name: 'ResourceCardWk',
    components: {
        EditResource, CreateResource, ResourceDetail, MonitorResource, ContainerCard, WorkloadCard, draggable
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
            console.log(to)
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
            commit: {repo: '-', tag: null, mode: 0}
        }
    },
    methods: {
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
                this.unknownContainers =  this.filteredContainers.filter((c) => {return c.status == 'unknown' })
                this.failedContainers =  this.filteredContainers.filter((c) => {return c.status == 'failed' })
            } else {
                this.filteredContainers = this.containers.filter((c) => {return c.name.includes(name) })   
                this.runningContainers =  this.filteredContainers.filter((c) => {return c.status == 'running' })   
                this.unknownContainers =  this.filteredContainers.filter((c) => {return c.status == 'unknown' })
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
        getCLICommandsForResource () {
            let commands = []
            if (this.cliHelperItem.group == undefined) {
                this.cliHelperItem.group = ''
            }
            switch (this.cliHelperItem.kind) {
                case 'Workload':
                    commands = [
                        {
                            key: 'To connect', 
                            value: this.cliname + ' shell wk ' + this.cliHelperItem.name + ' -g ' + this.cliHelperItem.group
                        },
                        {
                            key: 'To delete', 
                            value: this.cliname + ' delete wk ' + this.cliHelperItem.name + ' -g ' + this.cliHelperItem.group
                        },
                        {
                            key: 'To pause', 
                            value: this.cliname + ' pause wk ' + this.cliHelperItem.name + ' -g ' + this.cliHelperItem.group
                        },
                        {
                            key: 'To resume', 
                            value: this.cliname + ' resume wk ' + this.cliHelperItem.name + ' -g ' + this.cliHelperItem.group
                        },
                        {
                            key: 'To get', 
                            value: this.cliname + ' get wk ' + this.cliHelperItem.name + ' -g ' + this.cliHelperItem.group
                        },
                        {
                            key: 'To describe', 
                            value: this.cliname + ' describe wk ' + this.cliHelperItem.name + ' -g ' + this.cliHelperItem.group
                        }]
                    break

                default: 
                    commands = [
                        {
                            key: 'To delete', 
                            value: this.cliname + ' delete ' +  this.cliHelperItem.kind + ' ' + this.cliHelperItem.name + ' -g ' + this.cliHelperItem.group
                        },
                        {
                            key: 'To get', 
                            value: this.cliname + ' get ' +  this.cliHelperItem.kind + ' ' + this.cliHelperItem.name + ' -g ' + this.cliHelperItem.group
                        },
                        {
                            key: 'To describe', 
                            value: this.cliname + ' describe ' +  this.cliHelperItem.kind + ' ' + this.cliHelperItem.name + ' -g ' + this.cliHelperItem.group
                        }]
            }
            return commands
        },
        copyCLICommand (cmd) {
            navigator.clipboard.writeText(cmd)
            this.copiedDialog = true
        },
        onUploadToVolume () {
            this.$store.dispatch('upload', {files: this.filesToUpload, volumeName: 'home', cb: function (data) {}})
        },
        selectedResourceRow (item) {
            this.showResourceDetailDialog = true
            this.resourceToInspect = item
            //this.$router.push({name: 'ResourceDetail', params: {item: item, kind: item.kind, name: item.name}})
        },
        editResourceRow (item) {
            this.itemToEdit = item
            this.editDialog = true
        },
        fetch () {

            this.$store.dispatch('resource', {name: 'Workload', cb: function (data) {
                this.workloads = data
                //this.workloads.unshift({name: 'All'})
                this.$store.dispatch('resource', {name: 'Container', cb: function (data) {
                    this.containers = data
                    if (this.selectedWorkload == null) {
                        this.selectedWorkload = 'All'
                    }
                    this.setWk(this.selectedWorkload)
                }.bind(this)}, true)    
            }.bind(this)}, true)    
        },
        filterResource () {
            let elementsPerPage = 16
            if (this.displayResource.length == 0) {
                this.displayResource = this.resource    
            }
            this.$store.commit('search', {pages: Math.ceil(this.resource.length / elementsPerPage)})
            if (this.$store.state.search.page > this.$store.state.search.pages) {
                this.$store.commit('search', {page: 1})
            }
            let start = (this.$store.state.search.page - 1) * elementsPerPage
            let end = this.$store.state.search.page * elementsPerPage

            this.displayResource = Search.search(this.$store.state.search.filter, this.resource, {deep: true})
            this.$store.commit('search', {pages: Math.ceil(this.displayResource.length / elementsPerPage)})
            this.displayResource = this.displayResource.slice(start, end)
            if (this.$store.state.search.page > this.$store.state.search.pages) {
                this.$store.commit('search', {page: 1})
            }
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