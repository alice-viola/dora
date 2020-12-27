<template>
    <div class="resource">
            <v-container fluid>
                <v-card class="mainbackground lighten-1 elevation-1"  v-if="resource == undefined || resource[0] == undefined">
                    <v-toolbar
                      color="warning darker-1" dark flat>
                      <v-toolbar-title>Empty</v-toolbar-title>
                      <v-spacer></v-spacer>
                    </v-toolbar>
                    <v-card-text>
                      <h3 class="pa-md-4 mx-lg-auto">There are no data here, try with another group or create new one</h3>
                    </v-card-text>
                </v-card>
                <v-card class="mainbackground lighten-1 elevation-1" v-else>
                    <v-card-title>
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
                        class="mainbackground lighten-1  elevation-0"
                        dense
                    >
                    <template v-slot:item.status="{ item }">
                      <v-btn
                        text
                        :color="((item.status == 'RUNNING' && item.reason == null) || item.status == 'READY' || (item.status == 'CREATED')) ? 'success' : 'warning'"
                        dark
                      >
                        {{ item.status }}
                      </v-btn>
                    </template>

                    <template v-slot:item.actions="{ item }">
                          <v-list class="elevation-0 pa-0" style="background: rgba(0,0,0,0)">
                            <v-list-item>
                                <!-- Connect -->
                                <v-list-item-content v-if="$route.params.name == 'Workload'">
                                    <v-icon small color="success" v-if="item.status == 'RUNNING' && item.reason == null && item.group == $store.state.user.selectedGroup" @click="connect(item)">
                                        fas fa-terminal
                                    </v-icon>
                                    <v-icon small  color="orange" v-else>
                                      fas fa-terminal
                                    </v-icon>
                                </v-list-item-content>

                                <!-- Commit -->
                                <v-list-item-content class="pl-4" v-if="$route.params.name == 'Workload'">
                                    <v-icon small  color="success" v-if="item.status == 'RUNNING' && item.reason == null && item.group == $store.state.user.selectedGroup" @click="askCommit(item)">
                                        mdi-content-save
                                    </v-icon>
                                    <v-icon small  color="warning" v-else>
                                      mdi-content-save-alert
                                    </v-icon>
                                </v-list-item-content>

                                <!-- Pause -->
                                <v-list-item-content class="pl-4" v-if="$route.params.name == 'Workload'">
                                    <v-icon small color="success" v-if="item.status == 'RUNNING' && item.reason == null && item.group == $store.state.user.selectedGroup" @click="pause(item)">
                                        mdi-pause
                                    </v-icon>
                                    <v-icon small color="success" v-if="item.status == 'PAUSED' && item.reason == null && item.group == $store.state.user.selectedGroup" @click="resume(item)">
                                      mdi-play-circle
                                    </v-icon>
                                </v-list-item-content>

                                <!-- Delete -->
                                <v-list-item-content class="pl-4">
                                    <v-icon small color="primary" @click="deleteItem(item)">
                                        mdi-delete
                                    </v-icon>
                                </v-list-item-content>

                                <!-- Edit -->
                                <v-list-item-content class="pl-4">
                                    <v-icon small color="primary" @click="editResourceRow(item)">
                                        mdi-pencil
                                    </v-icon>
                                </v-list-item-content>     

                                <!-- Inspect -->
                                <v-list-item-content class="pl-4">
                                    <v-icon small color="primary" @click="selectedResourceRow(item)">
                                        mdi-eye-check-outline
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

            <!-- Edit -->

            <v-dialog v-model="editDialog" >
                <EditResource :originalResource="itemToEdit" v-if="Object.keys(itemToEdit) !== 0"/>
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

    </div>
</template>

<script>
// @ is an alias to /src
import axios from 'axios'
import EditResource from '@/components/EditResource.vue'

export default {
    name: 'Resource',
    components: {
        EditResource
    },
    watch: {
        $route(to, from) { 
            if (to !== from) { 
                this.itemToEdit = {}
                this.resourceKind = this.$route.params.name
                this.toDeleteItem = null
                this.toStopItem = null
                this.fetch() 
            } 
        }
    },
    data: function () {
        return {
            itemToEdit: {},
            filesToUpload: [],
            volumeUploadDownload: 0,
            uploadDialog: false,
            editDialog: false,
            commitDialog: false,
            terminalDialog: false,
            deleteItemDialog: false,
            stopItemDialog: false,
            toDeleteItem: null,
            fetchInterval: undefined,
            search: '',
            resourceKind: this.$route.params.name,
            resource: {},
            headers: [],
            commit: {repo: '', tag: null} 
        }
    },
    methods: {
        onUploadToVolume () {
            this.$store.dispatch('upload', {files: this.filesToUpload, volumeName: 'home', cb: function (data) {}})
        },
        selectedResourceRow (item) {
            this.$router.push({name: 'ResourceDetail', params: {item: item, kind: item.kind, name: item.name}})
        },
        editResourceRow (item) {
            this.itemToEdit = item
            this.editDialog = true
        },
        fetch () {
            this.$store.dispatch('resource', {name: this.$route.params.name, cb: function (data) {
                this.resource = data
                if (this.resource[0] !== undefined) {
                    this.headers = Object.keys(this.resource[0]).map((v) => {return {text: v, value: v}})
                    this.headers.push({text: 'actions', value: 'actions'})
                }
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
            window.open(routeData.href, item.name, "height=1024,width=1024,toolbar=no,menubar=no,resizable=yes")
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
