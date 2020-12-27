<template>
    <div class="resource">
            <v-container class="fill-height" fluid>
                <v-row v-if="$store.state.ui.isMobile == true" class="pa-2" style="text-align: center">
                    <v-col cols="12" class="pa-0" v-if="$store.state.search.pages !== 0">
                        <v-text-field class="mainbackground pa-0"
                            :label="'Search in ' + $route.params.name + 's'"
                            solo
                            dense
                            v-model="$store.state.search.filter"
                            hide-details="auto"
                        ></v-text-field>
                    </v-col>
                    <v-col cols="12" class="pa-0" v-if="$store.state.search.pages !== 0">
                        <v-pagination v-if="$store.state.search.pages > 1"
                          class="mainbackground pa-0"
                          circle
                          v-model="$store.state.search.page"
                          :length="$store.state.search.pages"
                          :total-visible="6"
                        ></v-pagination>
                    </v-col>
                </v-row>
                <v-row align="center">
                    <v-col class="col-12 col-md-12 col-lg-12" v-if="resource.length == 0">
                        <v-card outlined>
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
                    <v-col class="col-12 col-md-4 col-lg-3" v-for="item in displayResource">
                        <v-card outlined>
                            <v-list-item v-if="item.status !== undefined">
                                <v-list-item-content class="pb-0">
                                    <v-row class="pa-0">
                                        <v-col cols="12" class="pt-0 pb-0">
                                            <div class="overline mb-4" :class="((item.status == 'RUNNING' && item.reason == null) || item.status == 'READY' || (item.status == 'CREATED')) ? 'success--text' : 'warning--text'">
                                                {{item.status}}
                                            </div>
                                        </v-col>
                                    </v-row>
                                    <div class="overline mb-4" v-if="item.reason !== null && item.reason !== undefined">
                                        {{item.reason}}
                                    </div>
                                </v-list-item-content>
                            </v-list-item>  
                            <v-card-text class="pt-0">
                                <v-expansion-panels flat>
                                    <v-expansion-panel>
                                        <v-expansion-panel-header class="pa-0">
                                            <v-card-title class="pa-0 ma-0">
                                            <v-list-item-subtitle class="grey--text">{{item.group}}</v-list-item-subtitle>
                                            <v-list-item-title class="title mb-1" v-if="item.product_name == undefined">
                                                {{item.name.substring(0,20)}}
                                            </v-list-item-title>
                                            <v-list-item-title class="title mb-1" v-else>
                                                {{item.product_name.substring(0,20)}}
                                            </v-list-item-title>
                                            </v-card-title>
                                        </v-expansion-panel-header>
                                        <v-expansion-panel-content class="pa-0">
                                        <p class="pa-0 ma-0" v-for="key in Object.keys(item)"><b class="grey--text">{{key}}:</b> {{item[key]}}</p>
                                        </v-expansion-panel-content>
                                    </v-expansion-panel>
                                </v-expansion-panels>
                            </v-card-text>
                            <v-card-actions class="pa-0">
                                <v-row>
                                    <v-col cols="12" class="pa-0" style="text-align: left">
                                        <v-list class="elevation-0 pa-0" style="background: rgba(0,0,0,0)">
                                            <v-list-item>
                                                <!-- copy CLI commands -->
                                                <v-list-item-content>
                                                    <v-tooltip bottom>
                                                      <template v-slot:activator="{ on, attrs }">
                                                        <v-icon v-bind="attrs" v-on="on" small color="info" @click="openCLIHelper(item)">fas fa-clipboard-list</v-icon>
                                                      </template>
                                                      <span>Open CLI commands</span>
                                                    </v-tooltip>
                                                </v-list-item-content>

                                                <!-- Inspect -->
                                                <v-list-item-content>
                                                    <v-tooltip bottom>
                                                      <template v-slot:activator="{ on, attrs }">
                                                        <v-icon v-bind="attrs" v-on="on" small color="info"  @click="selectedResourceRow(item)"> mdi-eye-check-outline </v-icon>
                                                      </template>
                                                      <span>Show history</span>
                                                    </v-tooltip>
                                                </v-list-item-content>                                

                                                <!-- Edit -->
                                                <v-list-item-content>
                                                    <v-tooltip bottom>
                                                      <template v-slot:activator="{ on, attrs }">
                                                        <v-icon v-bind="attrs" v-on="on" small color="primary" @click="editResourceRow(item)"> mdi-pencil </v-icon>
                                                      </template>
                                                      <span>Edit</span>
                                                    </v-tooltip>
                                                </v-list-item-content>   
                                            
                                                <!-- Delete -->
                                                <v-list-item-content>
                                                    <v-tooltip bottom>
                                                      <template v-slot:activator="{ on, attrs }">
                                                        <v-icon v-bind="attrs" v-on="on" small color="primary" @click="deleteItem(item)"> mdi-delete </v-icon>
                                                      </template>
                                                      <span>Delete</span>
                                                    </v-tooltip>
                                                </v-list-item-content>
                    
                                                <!-- Commit -->
                                                <v-list-item-content v-if="$route.params.name == 'Workload'">
                                                    <v-tooltip bottom>
                                                      <template v-slot:activator="{ on, attrs }">
                                                        <v-icon small v-bind="attrs" v-on="on" color="primary" v-if="item.status == 'RUNNING' && item.reason == null && item.group == $store.state.user.selectedGroup" @click="askCommit(item)"> mdi-content-save </v-icon>
                                                        <v-icon small v-bind="attrs" v-on="on" color="warning" v-else> mdi-content-save-alert </v-icon>
                                                      </template>
                                                      <span>Commit</span>
                                                    </v-tooltip>
                                                </v-list-item-content>
                    
                                                <!-- Pause -->
                                                <v-list-item-content v-if="$route.params.name == 'Workload'">
                                                    <v-tooltip bottom>
                                                      <template v-slot:activator="{ on, attrs }">
                                                        <v-icon small v-bind="attrs" v-on="on" color="primary" v-if="item.status == 'RUNNING' && item.reason == null && item.group == $store.state.user.selectedGroup" @click="pause(item)"> mdi-pause </v-icon>
                                                        <v-icon small v-bind="attrs" v-on="on" color="primary" v-if="item.status == 'PAUSED' && item.reason == null && item.group == $store.state.user.selectedGroup" @click="resume(item)"> mdi-play-circle </v-icon>
                                                      </template>
                                                      <span>Resume/Pause</span>
                                                    </v-tooltip>
                                                </v-list-item-content>

                                                <!-- Connect -->
                                                <v-list-item-content v-if="$route.params.name == 'Workload'">
                                                    <v-tooltip bottom>
                                                      <template v-slot:activator="{ on, attrs }">
                                                        <v-icon v-bind="attrs" v-on="on" small color="success" v-if="item.status == 'RUNNING' && item.reason == null && item.group == $store.state.user.selectedGroup" @click="connect(item)"> fas fa-terminal </v-icon>
                                                        <v-icon v-bind="attrs" v-on="on" small color="warning" v-else> fas fa-terminal </v-icon>
                                                      </template>
                                                      <span>Open shell</span>
                                                    </v-tooltip>

                                                </v-list-item-content>
                                            </v-list-item>
                                        </v-list>
                                    </v-col>
                                </v-row>

                            </v-card-actions>
            
                        </v-card>
                    </v-col>
                </v-row>
            </v-container>

            <!-- Dialogs -->
            <v-dialog v-model="deleteItemDialog" width="50vw">
              <v-card class="elevation-12">
                <v-toolbar
                  color="red" dark flat>
                  <v-toolbar-title>Confirm deletion</v-toolbar-title>
                  <v-spacer></v-spacer>
                </v-toolbar>
                <v-card-text>
                  <h3 class="pa-md-4 mx-lg-auto">Are you sure you want to delete this item?</h3>
                </v-card-text>
                <v-card-actions>
                    <v-btn text @click="deleteItemDialog = false">Cancel</v-btn>
                    <v-btn text color="red" @click="confirmDelete">Delete</v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
            <v-dialog v-model="stopItemDialog" width="50vw">
              <v-card class="elevation-12">
                <v-toolbar
                  color="orange" dark flat>
                  <v-toolbar-title>Confirm stop</v-toolbar-title>
                  <v-spacer></v-spacer>
                </v-toolbar>
                <v-card-text>
                  <h3 class="pa-md-4 mx-lg-auto">Are you sure you want to stop this item?</h3>
                </v-card-text>
                <v-card-actions>
                    <v-btn text @click="stopItemDialog = false">Cancel</v-btn>
                    <v-btn text color="orange" @click="confirmStop">Stop</v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
            <v-dialog v-model="commitDialog" width="50vw">
              <v-card class="elevation-12">
                <v-toolbar
                  color="success" dark flat>
                  <v-toolbar-title>Commit options</v-toolbar-title>
                  <v-spacer></v-spacer>
                </v-toolbar>
                <v-card-text>
                    <br>
                    <p> Current image repository and tag: </p>
                    <div class="row">
                        <div class="col-6">
                            <v-text-field v-model="commit.repo" label="Repository"></v-text-field>
                        </div>
                        <div class="col-6">
                            <v-text-field v-model="commit.tag" label="Tag"></v-text-field>
                        </div>
                    </div>
                </v-card-text>
                <v-card-actions>
                    <v-btn text @click="commitDialog = false">Cancel</v-btn>
                    <v-btn text color="success" @click="confirmCommit">Commit</v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>

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
                <EditResource :originalResource="itemToEdit" v-if="Object.keys(itemToEdit) !== 0"/>
            </v-dialog>

            <v-dialog v-model="copiedDialog" width="200px">
                <v-card class="elevation-12" @click="copiedDialog = false">
                    <v-card-title class="success--text"> Copied! </v-card-title>
                </v-card>
            </v-dialog>

            <!-- Upload Download -->
            <v-dialog v-model="uploadDialog" width="50vw">
                <v-card class="elevation-12">
                    <v-toolbar
                      color="primary"  flat>
                      <v-toolbar-title>Upload and Download</v-toolbar-title>
                      <v-spacer></v-spacer>
                    </v-toolbar>
                    <v-tabs
                      class="primary--text"
                      center-active
                      v-model="volumeUploadDownload"
                    >
                        <v-tab>Upload</v-tab>
                        <v-tab>Download</v-tab>
                    </v-tabs>
                    <div v-if="volumeUploadDownload == 0">
                        <v-card-text>
                            <br>
                            <p> Upload <b>files</b> to volume (<i>Upload of folders is not supported</i>) </p>
                            <div class="row">
                                <v-file-input 
                                    v-model="filesToUpload"
                                    multiple
                                    progress
                                    accept="*"
                                    type="file"
                                    label="Select Files" 
                                ></v-file-input>
                            </div>
                        </v-card-text>
                        <v-card-actions>
                            <v-btn text @click="uploadDialog = false">Cancel</v-btn>
                            <v-btn class="primary--text" text @click="onUploadToVolume">Upload</v-btn>
                            <!--<v-btn text color="success" @click="confirmUpload">Upload</v-btn>-->
                        </v-card-actions>
                    </div>
                </v-card>
            </v-dialog>
        <v-dialog max-width="600px" v-model="newResourceDialog" >
          <CreateResource />
        </v-dialog>
        <v-dialog max-width="800px" v-model="showResourceDetailDialog" >
          <ResourceDetail :item="resourceToInspect"/>
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

export default {
    name: 'Resource',
    components: {
        EditResource, CreateResource, ResourceDetail
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
            cliname: 'pwmcli',
            cliHelperItem: {},
            itemToEdit: {},
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
            commit: {repo: '', tag: null}
        }
    },
    methods: {

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
            this.$store.dispatch('resource', {name: this.$route.params.name, cb: function (data) {
                this.resource = data
                this.filterResource()
                if (this.resource[0] !== undefined) {
                    this.headers = Object.keys(this.resource[0]).map((v) => {return {text: v, value: v}})
                    this.headers.push({text: 'actions', value: 'actions'})
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
            if (this.commit.tag != null && this.commit.tag != '') {
                repo += this.commit.repo + ':' + this.commit.tag
            } else {
                repo += this.commit.repo
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
            }.bind(this), 2000)
        }
    },
    beforeDestroy () {
        clearInterval(this.fetchInterval)
    }
}
</script>