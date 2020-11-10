<template>
    <div class="resource">
        <v-main>
            <v-container>
                <div id="terminal-container"></div>
                <v-card>
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
                    <v-data-table v-if="resource !== undefined && resource[0] !== undefined"
                        :search="search"
                        :headers="headers"
                        :items="resource"
                        :items-per-page="10"
                        class="elevation-1"
                    >
                    <template v-slot:item.status="{ item }">
                      <v-chip
                        outlined
                        :color="(item.status == 'RUNNING' || item.status == 'READY') ? 'green' : 'orange'"
                        dark
                      >
                        {{ item.status }}
                      </v-chip>
                    </template>
                    <template v-slot:item.actions="{ item }">
                      <v-icon small @click="deleteItem(item)">
                        mdi-delete
                      </v-icon>
                     <v-icon small v-if="$route.params.name == 'Workload'" @click="connect(item)">
                        mdi-lan-connect
                      </v-icon>
                    </template>
                    </v-data-table>
                    
                </v-card>
            </v-container>
            <v-dialog v-model="deleteItemDialog" width="50vw">
              <v-card class="elevation-12">
                <v-toolbar
                  color="orange" dark flat>
                  <v-toolbar-title>Confirm deletion</v-toolbar-title>
                  <v-spacer></v-spacer>
                </v-toolbar>
                <v-card-text>
                  <h3 class="pa-md-4 mx-lg-auto">Are you sure you want to delete this item?</h3>
                </v-card-text>
              </v-card>
            </v-dialog>
            <!--<v-dialog fullscreen v-model="terminalDialog" width="500px">-->
                
            <!--</v-dialog>-->
        </v-main>  
    </div>
</template>

<script>
// @ is an alias to /src
import axios from 'axios'

function webSocketForApiServer () {
    return 'ws://localhost:3000'
}

function apiRequest (apiServer, type, token, resource, verb, cb) {
    let body, query = null
    if (type == 'get') {
        query = resource
    } else {
        body = resource
    }
    try {
        axios.defaults.headers.common = {'Authorization': `Bearer ${token}`}
        axios[type](`${apiServer}/v1/${resource.kind}/${verb}`, 
            {data: body,
            }, query, {timeout: 1000}).then((res) => {
            cb(res)
        }).catch((err) => {
            if (err.code == 'ECONNREFUSED') {
                cb('Error connecting to API server')
            } else {
                if (err.response !== undefined && err.response.statusText !== undefined) {
                    cb('Error in response from API server: ' + err.response.statusText)
                } else {
                    cb('Error in response from API server: Unknown')    
                }
            }
        })          
    } catch (err) {
        console.log('err', err)
    }
}

import { Terminal } from 'xterm'
import { AttachAddon } from 'xterm-addon-attach'
var querystring = require('querystring')
let DockerClient = require('@/js/web-socket-docker-client')


export default {
    name: 'Resource',
    components: {
        
    },
    watch: {
        $route(to, from) { 
            if (to !== from) { 
                this.resourceKind = this.$route.params.name
                this.fetch() 
            } 
        }
    },
    data: function () {
        return {
            terminalDialog: false,
            deleteItemDialog: false,
            fetchInterval: undefined,
            search: '',
            resourceKind: this.$route.params.name,
            resource: {},
            headers: []
        }
    },
    methods: {
        fetch () {
            this.$store.dispatch('resource', {name: this.$route.params.name, cb: function (data) {
                this.resource = data
                this.headers = Object.keys(this.resource[0]).map((v) => {return {text: v, value: v}})
                this.headers.push({text: 'actions', value: 'actions'})

            }.bind(this)})    
        },
        deleteItem (item) {
            this.deleteItemDialog = true
        },
        connect (item) {
            function main (containerId, nodeName, authToken) {
                let url = webSocketForApiServer() + '/pwm/cshell' + '?' + querystring.stringify({
                  tty: 'true',
                  command: '/bin/bash',
                  container: containerId,
                  node: nodeName,
                  token: authToken.data
                })
                let term = new Terminal()

                term.open(document.getElementById('terminal-container'))
                const socket = new WebSocket(url)
                const attachAddon = new AttachAddon(socket)
                term.loadAddon(attachAddon)
                process.stdin.setRawMode(true)
                process.stdin.pipe(term.stdin)
                term.pipe(process.stdout)
                term.pipe(process.stderr)
                term.on('key', (key, ev) => {
                    console.log(key.charCodeAt(0))
                    if (key.charCodeAt(0) == 13)
                        term.write('\n')
                    term.write(key)
                })
                
                //var client = new DockerClient({
                //    url: webSocketForApiServer() + '/pwm/cshell',
                //    tty: true,
                //    command: 'bash',
                //    container: containerId,
                //    node: nodeName,
                //    token: authToken.data
                //})
                //var term = new Terminal()
                //term.open(document.getElementById('terminal-container'))
                ////term.write('Hello from \x1B[1;3;31mxterm.js\x1B[0m $ ')
                //return client.execute().then(() => {
                //    const attachAddon = new AttachAddon(client.socket)
                //    terminal.loadAddon(attachAddon)
                //})
                //return client.execute().then(() => {
                //    term.on('data', function(data) {
                //      client.stdin.write(data)
                //    })
                //
                //    term.on('title', function(title) {
                //      document.title = title
                //    })
                //    term.open(document.body)
                //    client.stdout.on('data', function (data) {
                //      term.write(String.fromCharCode.apply(null, data))
                //    })
                //    client.stderr.on('data', function (data) {
                //      term.write(String.fromCharCode.apply(null, data))
                //    })
                //
                //    client.on('exit', function (code) {
                //      term.write('\r\nProcess exited with code ' + code + '\r\n')
                //    })
                //    client.on('resumed', function () {
                //      term.write('\x1b[31mReady\x1b[m\r\n')
                //    })
                //})
            }

            apiRequest(this.$store.state.apiServer, 'post', this.$store.state.user.token, {kind: 'authtoken', apiVersion: 'v1', metadata: {}}, 
                'get', (resAuth) => {
                if (resAuth) {
                    console.log('Waiting connection...')
                    try {
                        this.terminalDialog = true
                        main(item.c_id, item.node, resAuth)   
                    } catch (err) {}
                }
            })
            
        }
    },
    mounted () {
        this.fetch()
        if (this.fetchInterval == undefined) {
            this.fetchInterval = setInterval(function () {
                this.fetch()
            }.bind(this), 5000)
        }
    },
    beforeDestroy () {
        clearInterval(this.fetchInterval)
    }
}
</script>
