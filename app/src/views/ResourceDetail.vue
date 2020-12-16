<template>
    <div class="resource">
            <v-container fluid>
                <v-card v-if="resource !== undefined" class="mainbackground lighten-1 elevation-12">
                    <v-card-title>
                        <b>{{$route.params.kind}}</b>/{{resource.metadata.name}}
                        <v-spacer></v-spacer>
                        <v-menu
                          left
                          bottom
                        >
                          <template v-slot:activator="{ on, attrs }">
                            <v-btn
                              text
                              color="green"
                              v-bind="attrs"
                              v-on="on"
                            >
                             Actions
                            <v-icon
                              right
                              dark
                            >
                              mdi-format-text-variant-outline
                            </v-icon>
                            </v-btn>
                          </template>
                    
                          <v-list v-if="$store.state.user.groups !== undefined">
                            <v-list-item 
                              v-for="action in resourceActions"
                              :key="action"
                              v-on:click="execActions(action)"
                            >
                              <v-list-item-title>{{ action }}</v-list-item-title>
                            </v-list-item>
                          </v-list>
                        </v-menu>
                    </v-card-title>
                    <v-card-text v-if="resource !== undefined">
                        <v-row>
                            <v-col col="4" v-if="resource.status !== undefined">
                                <v-timeline align-top dense>
                                    <v-timeline-item
                                      :color="(status.status == 'RUNNING' || status.status == 'CREATED') ?  'green' : 'orange'"
                                      small
                                      v-for="status in resource.status"
                                      :key="status.status + status.data"
                                    >
                                      <v-row class="pt-1">
                                        <v-col cols="3">
                                          <strong>{{status.status}}</strong>
                                        </v-col>
                                        <v-col>
                                          <strong>{{status.reason}}</strong>
                                          <div class="caption">
                                            
                                            {{status.data.split('T')[0]}} <br>{{status.data.split('T')[1]}}
                                          </div>
                                        </v-col>
                                      </v-row>
                                    </v-timeline-item>
                                </v-timeline>
                            </v-col>
                            <v-col col="8">
                              <v-col col="12" v-if="resource.kind == 'Workload'">
                                <h3>Image: {{resource.spec.image.image}}</h3>
                              </v-col>
                              <v-col col="12">
                                  <h3> Metadata </h3>
                                  Name: {{resource.metadata.name}}
                                  Group: {{resource.metadata.group}}
                              </v-col>
                              <v-col col="12">
                                  <h3> Spec </h3>
                                  {{resourceSpec}}
                              </v-col>
                              <v-col col="12" v-if="resource.kind == 'Workload' && (resource.scheduler !== undefined && (resource.scheduler.gpu !== undefined || resource.scheduler.cpu !== undefined))">
                                  <h3> Assigned resources </h3>
                                  <div v-if="resource.scheduler.gpu !== undefined">
                                    <div v-for="gpu in resource.scheduler.gpu">
                                      {{gpu.uuid}}
                                    </div>
                                  </div>
                                  <div v-if="resource.scheduler.cpu !== undefined">
                                    <div v-for="cpu in resource.scheduler.cpu">
                                      {{cpu.uuid}}
                                    </div>
                                  </div>
                              </v-col>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>

                <v-card v-if="resource.kind == 'User'" style="margin-top: 15px" class="mainbackground lighten-1 elevation-12">
                    <v-card-title>
                     Permissions
                    
                    <v-spacer></v-spacer>
                    <v-spacer></v-spacer>
                    <v-text-field
                      v-model="searchUser"
                      append-icon="mdi-magnify"
                      label="Search"
                      single-line
                      hide-details
                    ></v-text-field>
                    </v-card-title>
                    <v-row>
                        <v-col>
                            <v-btn color="green" text v-on:click="applyPermissionDialog = true"> Apply </v-btn>
                        </v-col>
                        <v-col>
                            <v-btn color="green" text v-on:click="newPermissionDialog = true"> New </v-btn>
                        </v-col>
                        <v-col>
                            <v-btn color="green" text v-on:click="tokenPermissionDialog = true"> Generate token </v-btn>
                        </v-col>
                    </v-row>
                    <v-data-table
                        :search="searchUser"
                        :headers="['group', 'resource', 'verb', 'delete'].map((header) => { return {text: header, align: 'start', value: header, sortable: true} })"
                        :items="computeUserPermission()"
                        class="elevation-1"
                    >
                      <template v-slot:item.delete="{ item }">
                        <v-simple-checkbox
                          v-model="item.delete"
                        ></v-simple-checkbox>
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
            <v-dialog v-model="newPermissionDialog" width="50vw">
              <v-card class="elevation-12">
                <v-toolbar
                  color="green" dark flat>
                  <v-toolbar-title>New permission</v-toolbar-title>
                  <v-spacer></v-spacer>
                </v-toolbar>
                <v-card-text>
                    <v-row>
                        <v-col cols="12">
                          <!--<v-combobox
                            v-model="newPermissionGroups"
                            :items="resource.spec.groups.map((group) => { return group.name })"
                            label="On groups"
                            multiple
                          ></v-combobox>
                        </v-col>
                        <v-col cols="12">
                          <v-combobox
                            v-model="newPermissionResource"
                            :items="resource.spec.groups.map((group) => { return group.name })"
                            label="On resource"
                            multiple
                          ></v-combobox>-->
                        </v-col>
                    </v-row>
                </v-card-text>
                <v-card-actions>
                    <v-btn text @click="stopItemDialog = false">Cancel</v-btn>
                    <v-btn text color="orange" @click="confirmStop">Stop</v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
            <v-dialog v-model="applyPermissionDialog" width="50vw">
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
            <v-dialog v-model="tokenPermissionDialog" width="50vw">
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
    </div>
</template>

<script>
// @ is an alias to /src
import axios from 'axios'
import yaml from 'js-yaml'

export default {
    name: 'Resource',
    props: ['item'],
    components: {
        yaml
    },
    watch: {
        $route(to, from) { 
            if (to !== from) { 
                this.resourceKind = this.$route.params.kind
                this.toDeleteItem = null
                this.toStopItem = null
                this.fetch() 
            } 
        }
    },
    data: function () {
        return {
            terminalDialog: false,
            deleteItemDialog: false,
            stopItemDialog: false,
            applyPermissionDialog: false,
            newPermissionDialog: false,
            tokenPermissionDialog: false,
            toDeleteItem: null,
            fetchInterval: undefined,
            search: '',
            resourceKind: this.$route.params.kind,
            resource: undefined,
            resourceActions: [],
            resourceSpec: '',
            searchUser: '',
            // new Permission
            newPermissionGroups: []
        }
    },
    methods: {
        fetch () {
            this.$store.dispatch('describe', {
                kind: this.item.kind, 
                name: this.item.name, 
                group: this.item.group, 
                cb: function (data) {
                this.resourceActions = []
                this.resource = data
                this.resourceActions.push('Delete')
                if (this.$route.params.kind.toLowerCase() == 'workload') {
                    this.resourceActions.push('Stop')
                    this.resourceActions.push('Connect')
                } 
                if (this.resource.status !== undefined) {
                    this.resource.status = JSON.parse(JSON.stringify(this.resource.status)).reverse()
                }
                this.resourceSpec = yaml.safeDump(this.resource.spec)
            }.bind(this)}) 
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
            this.$router.push({name: 'Shell', path: '/shell/' + item.name, params: {item: item}})
        },
        execActions (actionName) {
            switch (actionName) {
                case 'Connect':
                    this.connect(this.item)
                    break 
                case 'Stop':
                    this.stopItem(this.item)
                    break 
                case 'Delete':
                    this.deleteItem(this.item)
                    break 
            }
        },
        computeUserPermission () {
            this.resourceSet = new Set()
            let userGroups = this.resource.spec.groups
            let permissions = []
            userGroups.forEach((group) => {
                Object.keys(group.policy).forEach((resource) => {
                    let policy = group.policy[resource]
                    if (typeof policy !== 'string') {
                        policy.forEach((verb) => {
                            permissions.push({group: group.name, resource: resource, verb: verb, delete: false})
                        })       
                    }             
                })
            })
            return permissions
        }
    },
    mounted () {
        this.fetch()
    },
    beforeDestroy () {
        
    }
}
</script>
