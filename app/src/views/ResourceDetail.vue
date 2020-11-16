<template>
    <div class="resource">
        <v-main>
            <v-container>
                <v-card v-if="resource !== undefined">
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
                                <v-row>
                                    <v-row>
                                        <v-col>
                                            <h3>Image: {{resource.spec.image.image}}</h3>
                                        </v-col>
                                    </v-row>
                                    <v-col>
                                        <h3> Metadata </h3>
                                        Name: {{resource.metadata.name}}
                                        Group: {{resource.metadata.group}}
                                    </v-col>
                                    <v-col>
                                        <h3> Spec </h3>
                                        {{resourceSpec}}
                                    </v-col>
                                </v-row>
                            </v-col>
                        </v-row>
                        
                    </v-card-text>
                </v-card>
            </v-container>
        </v-main>  
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
            toDeleteItem: null,
            fetchInterval: undefined,
            search: '',
            resourceKind: this.$route.params.kind,
            resource: undefined,
            resourceActions: [],
            resourceSpec: ''
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
        }
    },
    mounted () {
        this.fetch()
    },
    beforeDestroy () {
        
    }
}
</script>
