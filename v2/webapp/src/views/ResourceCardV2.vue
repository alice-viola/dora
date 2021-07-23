<template>
    <div class="resource">
            <!-- Table view  -->
            <v-container class="fill-height pa-2" fluid>
                <v-row v-if="resource.length == 0" class="pa-2">
                    <v-col class="col-12 col-md-12 col-lg-12">
                        <v-card>
                            <v-card-title class="overline">
                                {{resourceKind}}
                            </v-card-title>
                            <v-card-subtitle>
                                No data here!
                            </v-card-subtitle>
                            <v-card-actions>
                                <v-btn text color="primary" @click="newResourceDialog = true "> Create </v-btn>
                            </v-card-actions>
                        </v-card>
                    </v-col>
                </v-row>
                <v-card class="elevation-0" v-else>
                    <v-card-title class="overline">
                        {{$route.params.name}}
                        <v-spacer></v-spacer>
                        <v-text-field
                            v-model="search"
                            append-icon="mdi-magnify"
                            label="Search"
                            single-line
                            hide-details
                        ></v-text-field>
                    </v-card-title>

                    <v-data-table
                        :search="search"
                        :headers="headers"
                        :items="resource"
                        :items-per-page="12"
                        class="elevation-0"
                        dense
                        style="width: 100vw"
                    >
                    <template v-slot:item.status="{ item }">
                      <v-btn
                        text
                        :color="((item.status == 'running' && item.reason == null) || item.status == 'READY' || (item.status == 'CREATED') || (item.status == 'FREE')) ? 'success' : 'warning'"
                        dark
                      >
                        {{ item.status }}
                      </v-btn>
                    </template>
                    <template v-slot:item.zone="{ item }"> <b class="info--text">{{ item.zone }}</b> </template>
                    <template v-slot:item.workspace="{ item }"> <b class="secondary--text">{{ item.workspace }}</b> </template>
                    <template v-slot:item.name="{ item }"> <b class="primary--text">{{ item.name }}</b> </template>
                    <template v-slot:item.node="{ item }"> <b class="secondary--text">{{ item.node }}</b> </template>
                    <template v-slot:item.product_name="{ item }"> <b class="primary--text">{{ item.product_name }}</b> </template>
                    <template v-slot:item.actions="{ item }">
                          <v-list class="elevation-0 pa-0" style="background: rgba(0,0,0,0)">
                            <v-list-item>
                                <!-- Connect -->
                                <!--<v-list-item-content v-if="$route.params.name == 'Container'">
                                    <v-icon small color="success" v-if="item.status == 'running' && item.reason == null" @click="connect(item)">
                                        fas fa-terminal
                                    </v-icon>
                                    <v-icon small  color="orange" v-else>
                                      fas fa-terminal
                                    </v-icon>
                                </v-list-item-content>-->


                                <!-- Delete -->
                                <!--<v-list-item-content class="pl-4">
                                    <v-icon small color="primary" @click="deleteItem(item)">
                                        mdi-delete
                                    </v-icon>
                                </v-list-item-content>-->

                                <!-- Edit -->
                                <v-list-item-content class="pl-4">
                                    <v-icon small color="primary" @click="editResourceRow(item)">
                                        mdi-pencil
                                    </v-icon>
                                </v-list-item-content>     
                        


                            </v-list-item>
                          </v-list>
                        </v-menu>
                    </template>

                    <template v-slot:item.inspect="{ item }">
                      <v-icon color="gray" @click="selectedResourceRow(item)">
                        mdi-eye-check-outline
                      </v-icon>
                    </template>
                    </v-data-table>
                </v-card>
            </v-container>



 

            <!-- CLI Helper -->
            <v-dialog v-model="cliHelperDialog" width="50vw">
              <v-card class="elevation-12">
                <v-toolbar
                  color="mainbackground lighten-1" flat>
                  <v-toolbar-title>CLI</v-toolbar-title>
                  <v-spacer></v-spacer>
                </v-toolbar>
                <v-card-text>
                    <h4 class="mt-4"> Click to copy </h4>
                    <div class="mt-2">
                        <div v-for="item in getCLICommandsForResource()">
                            {{item.key}}
                            <p class="clicommand mainbackground pa-1 ma-1" style="cursor: pointer; border-radius: 5px" @click="copyCLICommand(item.value)" :ref="item.value"> {{item.value}} </p>
                        </div>                 
                    </div>
                </v-card-text>
                <v-card-actions>
                    <v-btn text color="success" @click="cliHelperDialog = false">Done</v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>

            <!-- Edit -->
            <v-dialog v-model="editDialog" >
                <EditResourceAsYaml :originalResource="itemToEdit" v-if="Object.keys(itemToEdit) !== 0"/>
            </v-dialog>


        <v-dialog max-width="600px" v-model="newResourceDialog" >
          <!--<CreateResource />-->
          <EditResourceAsYaml v-if="newResourceDialog == true"/>
        </v-dialog>
    </div>
</template>

<script>
// @ is an alias to /src
import axios from 'axios'
import EditResource from '@/components/EditResource.vue'
import EditResourceAsYaml from '@/components/EditResourceAsYaml.vue'
import Search from 'search-json'
import CreateResource from '@/components/CreateResource.vue'
import ResourceDetail from '@/views/ResourceDetail.vue'
import MonitorResource from '@/components/MonitorResource.vue'

export default {
    name: 'Resource',
    components: {
        EditResource, EditResourceAsYaml, CreateResource, ResourceDetail, MonitorResource
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
        }
    },
    data: function () {
        return {
            cliname: 'dora',
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
        connect (item) {
            console.log(item)
          item.kind = 'Container'
          let routeData = this.$router.resolve({name: 'Shell', path: '/shell/' + item.name , query: {item: JSON.stringify(item), shellKind: '/bin/bash', workspace: this.$store.state.    selectedWorkspace, zone: this.$store.state.selectedZone, apiServer: this.$store.state.apiServer }})
          console.log(location.origin)
          window.open(location.origin + '/shell/' +  item.name + routeData.href, item.name, "height=600,width=1024,toolbar=no,menubar=no,resizable=yes")
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
            this.$store.dispatch('resource', {name: this.$route.params.name, cb: function (data) {
                this.resource = data
                this.filterResource()
                if (this.resource[0] !== undefined) {
                    this.headers = Object.keys(this.resource[0]).map((v) => {return {text: v, value: v}})
                    this.headers.push({text: 'actions', value: 'actions'})
                    this.headers = this.headers.filter((h) => { return h.text !== 'kind'})
                }
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
    },
    mounted () {
        if (this.fetchInterval == undefined) {
            this.fetch()
            this.fetchInterval = setInterval(function () {
                this.fetch()
            }.bind(this), 2000)
        }
    },
    beforeDestroy () {
        clearInterval(this.fetchInterval)
    }
}
</script>