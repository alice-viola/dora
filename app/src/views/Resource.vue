<template>
    <div class="resource">
        <v-main>
            <v-container>
                <v-card class="elevation-12"  v-if="resource == undefined || resource[0] == undefined">
                    <v-toolbar
                      color="gray" dark flat>
                      <v-toolbar-title>Empty</v-toolbar-title>
                      <v-spacer></v-spacer>
                    </v-toolbar>
                    <v-card-text>
                      <h3 class="pa-md-4 mx-lg-auto">There are no data here, try with another group or create new one</h3>
                    </v-card-text>
                    <v-card-actions>
                        <v-btn text color="green">Create {{resourceKind}}</v-btn>
                    </v-card-actions>
                </v-card>
                <v-card v-else>
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
                        :items-per-page="10"
                        class="elevation-1"
                    >
                    <template v-slot:item.status="{ item }">
                      <v-btn
                        text
                        :color="((item.status == 'RUNNING' && item.reason == null) || item.status == 'READY' || (item.status == 'CREATED' && item.kind == 'Volume')) ? 'green' : 'orange'"
                        dark
                      >
                        {{ item.status }}
                      </v-btn>
                    </template>
                    <template v-slot:item.stop="{ item }">
                        <v-icon color="green" v-if="$route.params.name == 'Workload'" @click="stopItem(item)">
                            mdi-stop
                        </v-icon>
                    </template>
                    <template v-slot:item.connect="{ item }"> <!-- TODO: CORREGGERE: visualizzare possibilità di connessione solo se user = user -->
                        <v-icon color="green" v-if="$route.params.name == 'Workload' && item.status == 'RUNNING' && item.reason == null && item.group == $store.state.user.selectedGroup" @click="connect(item)">
                            mdi-lan-connect
                        </v-icon>
                      <v-icon color="orange" v-else>
                        mdi-lan-disconnect
                      </v-icon>
                    </template>
                    <template v-slot:item.actions="{ item }">
                      <v-icon color="green" v-if="item.status != 'RUNNING'" @click="deleteItem(item)">
                        mdi-delete
                      </v-icon>
                      <v-icon color="orange" v-else>
                        mdi-delete
                      </v-icon>
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
        </v-main>  
    </div>
</template>

<script>
// @ is an alias to /src
import axios from 'axios'

export default {
    name: 'Resource',
    components: {
        
    },
    watch: {
        $route(to, from) { 
            if (to !== from) { 
                this.resourceKind = this.$route.params.name
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
            resourceKind: this.$route.params.name,
            resource: {},
            headers: []
        }
    },
    methods: {
        selectedResourceRow (item) {
            console.log('/resource/' + item.kind + '/' + item.name)
            this.$router.push({name: 'ResourceDetail', params: {item: item, kind: item.kind, name: item.name}})
        },
        fetch () {
            this.$store.dispatch('resource', {name: this.$route.params.name, cb: function (data) {
                this.resource = data
                if (this.resource[0] !== undefined) {
                    this.headers = Object.keys(this.resource[0]).map((v) => {return {text: v, value: v}})
                    
                    if (this.$route.params.name.toLowerCase() == 'workload') {
                        this.headers.push({text: 'connect', value: 'connect'})
                        this.headers.push({text: 'stop', value: 'stop'})
                    }
                    this.headers.push({text: 'delete', value: 'actions'})
                    this.headers.push({text: 'inspect', value: 'inspect'})
                }
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
