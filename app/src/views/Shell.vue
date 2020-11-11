<template>
    <div class="resource">
        <v-main>
            <v-container>
                <v-card class="elevation-12 black">
                    <v-card-title>Workload/<b class="green--text">{{item.name}}</b></v-card-title>
                    <v-card-text>
                        <div id="terminal-container" style="margin-top: 25px"></div>
                    </v-card-text>
                </v-card>
            </v-container>
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
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
let querystring = require('querystring')
let DockerClient = require('@/js/web-socket-docker-client')
import '../../node_modules/xterm/css/xterm.css'

export default {
    name: 'Shell',
    props: ['item'],
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
        connect (item) {
            async function connectTo (containerId, nodeName, authToken) {
                let url = webSocketForApiServer() + '/pwm/cshell' + '?' + querystring.stringify({
                  tty: 'true',
                  command: '/bin/bash',
                  container: containerId,
                  node: nodeName,
                  token: authToken.data
                })

                var client = new DockerClient({
                    url: webSocketForApiServer() + '/pwm/cshell',
                    tty: true,
                    command: '/bin/bash',
                    container: containerId,
                    node: nodeName,
                    token: authToken.data
                })
                return await client.execute().then(() => {
                    let terminalContainer = document.getElementById('terminal-container')
                    let term = new Terminal({cursorBlink: true, screenKeys: true, useStyle: true, rows: 34})
                    const fitAddon = new FitAddon()
                    term.loadAddon(fitAddon)
                    term.focus()
                    fitAddon.fit()
                    term.onData(function(data) {
                        client.stdin.write(data)
                    })
                    term.open(terminalContainer, true)
                    client.stdout.on('data', function (data) {
                        term.write(String.fromCharCode.apply(null, data))
                    })
                    client.stderr.on('data', function (data) {
                        term.write(String.fromCharCode.apply(null, data))
                    })
                    client.on('exit', function (code) {
                        term.writeln('\r\nProcess exited with code ' + code + '\r\n')
                    })
                })
            }

            apiRequest(this.$store.state.apiServer, 'post', this.$store.state.user.token, {kind: 'authtoken', apiVersion: 'v1', metadata: {}}, 
                'get', (resAuth) => {
                if (resAuth) {
                    console.log('Waiting connection...')
                    try {
                        this.terminalDialog = true
                        connectTo(item.c_id, item.node, resAuth)   
                    } catch (err) {}
                }
            })
            
        }
    },
    mounted () {
        this.connect(this.item)
    }
}
</script>
