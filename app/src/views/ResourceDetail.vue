<template>
    <div class="resource">
            <v-container fluid>
                <v-card v-if="resource !== undefined" outlined>
                    <v-card-title class="overline">
                        <b>{{resource.kind}}</b>/{{resource.metadata.name}}
                        <v-spacer></v-spacer>
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

                <v-card v-if="resource !== undefined && resource.kind == 'User'" style="margin-top: 15px" outlined>
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
                this.resourceKind = this.item.kind
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
            resourceKind: '',
            resource: undefined,
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
                this.resource = data
                if (this.resource.status !== undefined) {
                    this.resource.status = JSON.parse(JSON.stringify(this.resource.status)).reverse()
                }
                this.resourceSpec = yaml.safeDump(this.resource.spec)
            }.bind(this)}) 
        }
    },
    mounted () {
        this.fetch()
    }
}
</script>
