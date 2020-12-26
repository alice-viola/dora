<template>
    <div>
          <v-container class="fill-height" fluid v-if="resources == null">
            <v-row align="center" justify="center">
              <v-col cols="12" sm="12" md="12">
                <v-progress-circular 
                    indeterminate
                    color="primary"
                ></v-progress-circular>
              </v-col>
            </v-row>
          </v-container>
          <v-container class="fill-height" v-else fluid>
                <v-row>
                    <v-col cols="12">
                      <h1> ProM Workload Manager <v-badge  color="info"  top content="v0.3.6"></v-badge> </h1>
                    </v-col>
                
                    <v-col cols="12">
                      <v-btn class="primary--text" v-on:click="openDoc()"> Documentation </v-btn>
                      <v-btn class="secondary--text ml-2" v-on:click="openCliDownload()"> CLI  </v-btn>
                    </v-col>
                    <v-col cols="12">
                      <h3> Exec </h3>
                    </v-col>
                    <v-col cols="12">
                      <v-btn class="primary--text" v-on:click="newResourceDialog = true"> Launch Workload </v-btn>
                      <v-btn class="secondary--text ml-2" v-on:click="$router.push('/resource/Workload')"> Inspect workloads  </v-btn>
                    </v-col>
                    <v-col cols="12">
                      <h3> Your account ({{$store.state.user.name}})</h3>
                    </v-col>
                    <v-col class="col-12 col-md-4 col-lg-4">
                      <v-card class="mainbackground lighten-1 elevation-1">
                        <v-list-item>
                            <v-list-item-content class="pb-0">
                                <v-expansion-panels flat>
                                    <v-expansion-panel class="mainbackground lighten-1">
                                        <v-expansion-panel-header class="pa-0">
                                            <v-card-title class="pa-0 ma-0">
                                            <v-list-item-subtitle class="grey--text"></v-list-item-subtitle>
                                            <v-list-item-title class="overline mb-1">
                                                Weekly credits usage  {{(resources.Account.account.credits.weekly / resources.Account.limits.credits.weekly * 100).toFixed(1)}} %
                                            </v-list-item-title>
                                            </v-card-title>
                                        </v-expansion-panel-header>
                                        <v-expansion-panel-content class="pa-0">
                                            <p>Used: {{resources.Account.account.credits.weekly.toFixed(1) }} </p>
                                            <p> Weekly limit: <b style="padding-left: 5px">{{resources.Account.limits.credits.weekly}}</b> </p> 
                                            ({{(resources.Account.account.credits.weekly / resources.Account.limits.credits.weekly * 100).toFixed(1)}}%)</b>
                                        </v-expansion-panel-content>
                                    </v-expansion-panel>
                                </v-expansion-panels>
                            </v-list-item-content>
                        </v-list-item>  
                      </v-card>
                    </v-col>
                    <v-col class="col-12 col-md-4 col-lg-4">
                      <v-card class="mainbackground lighten-1 elevation-1">
                        <v-list-item>
                            <v-list-item-content class="pb-0">
                                <v-expansion-panels flat>
                                    <v-expansion-panel class="mainbackground lighten-1">
                                        <v-expansion-panel-header class="pa-0">
                                            <v-card-title class="pa-0 ma-0">
                                            <v-list-item-subtitle class="grey--text"></v-list-item-subtitle>
                                            <v-list-item-title class="overline mb-1">
                                                Limits
                                            </v-list-item-title>
                                            </v-card-title>
                                        </v-expansion-panel-header>
                                        <v-expansion-panel-content class="pa-0">
                                          <div v-if="resources.Account.limits !== undefined 
                                            && resources.Account.limits.resources !== undefined 
                                            && resources.Account.limits.resources.nodes !== undefined
                                            && resources.Account.limits.resources.nodes.allow !== undefined">
                                            <b>Allowed nodes:</b> <i>{{resources.Account.limits.resources.nodes.allow.toString()}}</i><br>
                                          </div>
                                          <div v-if="resources.Account.limits !== undefined 
                                            && resources.Account.limits.resources !== undefined 
                                            && resources.Account.limits.resources.nodes !== undefined
                                            && resources.Account.limits.resources.nodes.deny !== undefined">
                                            <b>Denied nodes:</b> <i>{{resources.Account.limits.resources.nodes.deny.toString()}}</i><br>
                                          </div>
                                          <div v-if="resources.Account.limits !== undefined 
                                            && resources.Account.limits.resources !== undefined 
                                            && resources.Account.limits.resources.gpus !== undefined
                                            && resources.Account.limits.resources.gpus.perWorkload !== undefined">
                                            <b>GPUs per workload:</b> {{resources.Account.limits.resources.gpus.perWorkload}}<br>
                                          </div>
                                          <div v-if="resources.Account.limits !== undefined 
                                            && resources.Account.limits.resources !== undefined 
                                            && resources.Account.limits.resources.cpus !== undefined
                                            && resources.Account.limits.resources.cpus.perWorkload !== undefined">
                                            <b>CPUs per workload:</b> {{resources.Account.limits.resources.cpus.perWorkload}}<br>
                                          </div>
                                          <div v-if="resources.Account.limits !== undefined 
                                            && resources.Account.limits.resources !== undefined 
                                            && resources.Account.limits.resources.workloads !== undefined
                                            && resources.Account.limits.resources.workloads.concurrently !== undefined">
                                            <b>Concurrent workloads:</b> {{resources.Account.limits.resources.workloads.concurrently}}
                                          </div>
                                        </v-expansion-panel-content>
                                    </v-expansion-panel>
                                </v-expansion-panels>
                            </v-list-item-content>
                        </v-list-item>  
                      </v-card>
                    </v-col>

                    <v-col class="col-12 col-md-4 col-lg-4">
                      <v-card class="mainbackground lighten-1 elevation-1">
                        <v-list-item>
                            <v-list-item-content class="pb-0">
                                <v-expansion-panels flat>
                                    <v-expansion-panel class="mainbackground lighten-1">
                                        <v-expansion-panel-header class="pa-0">
                                            <v-card-title class="pa-0 ma-0">
                                            <v-list-item-subtitle class="grey--text"></v-list-item-subtitle>
                                            <v-list-item-title class="overline mb-1">
                                                Credits per resource
                                            </v-list-item-title>
                                            </v-card-title>
                                        </v-expansion-panel-header>
                                        <v-expansion-panel-content class="pa-0">
                                          <b>GPU Volta V100</b>  Credits per hour: <b>2.5</b><br>
                                          <b>GPU RTX6000</b>  Credits per hour: <b>2</b><br>
                                          <b>GPU GeForce GTX 1080</b> Credits per hour: <b>0.5</b><br>
                                        </v-expansion-panel-content>
                                    </v-expansion-panel>
                                </v-expansion-panels>
                            </v-list-item-content>
                        </v-list-item>  
                      </v-card>
                    </v-col>
                

                  <v-col cols="12">
                    <h3> Your Workloads </h3>
                  </v-col>
                </v-row>
                <v-row>
                    <v-col class="col-lg-3 col-md-3 col-12">
                        <v-card class="mainbackground lighten-1 elevation-1">
                            <v-card-title class="overline">
                                Running
                            </v-card-title>
                            <v-card-text>
                                <v-chip
                                  class="ma-2"
                                  color="success"
                                >
                                  <h3>{{resources.Workload.filter((wk) => { return wk.status == 'RUNNING'}).length }}</h3>
                                </v-chip>
                            </v-card-text>
                        </v-card>
                    </v-col>
                    <v-col class="col-lg-3 col-md-3 col-12">
                        <v-card class="mainbackground lighten-1 elevation-1">
                            <v-card-title class="overline">
                                Queue
                            </v-card-title>
                            <v-card-text>
                                <v-chip v-if="resources.Workload.filter((wk) => { return wk.status == 'QUEUED'}).length !== 0"
                                    class="ma-2"
                                    color="warning"
                                >
                                  <h3>{{resources.Workload.filter((wk) => { return wk.status == 'QUEUED'}).length }}</h3>
                                </v-chip>
                                <v-chip v-else
                                  class="ma-2"
                                  color="success"
                                >
                                  <h3>{{0}}</h3>
                                </v-chip>
                            </v-card-text>
                        </v-card>
                    </v-col>
                    <v-col class="col-lg-3 col-md-3 col-12">
                        <v-card class="mainbackground lighten-1 elevation-1">
                            <v-card-title class="overline">
                                Exited
                            </v-card-title>
                            <v-card-text>
                                <v-chip
                                  class="ma-2"
                                  color="gray"
                                >
                                  <h3>{{resources.Workload.filter((wk) => { return wk.status == 'EXITED'}).length }}</h3>
                                </v-chip>
                            </v-card-text>
                        </v-card>
                    </v-col>
                    <v-col class="col-lg-3 col-md-3 col-12">
                        <v-card class="mainbackground lighten-1 elevation-1">
                            <v-card-title class="overline">
                                Denied
                            </v-card-title>
                            <v-card-text>
                                <v-chip
                                  class="ma-2"
                                  color="gray"
                                >
                                  <h3>{{resources.Workload.filter((wk) => { return wk.status == 'DENIED'}).length }}</h3>
                                </v-chip>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>
          </v-container>
          <v-dialog v-model="cliDownload" width="40vw">
              <v-card class="mainbackground lighten-1 elevation-12">
                <v-card-title> CLI Download </v-card-title>
              
                <v-card-actions style="text-align: center">
                  <v-btn @click="downloadCLI('linux-x64')" text class="primary--text"> Linux X64 </v-btn>
                  <v-btn @click="downloadCLI('macos-x64')" text class="secondary--text"> MacOS X64 </v-btn>
                </v-card-actions>
              </v-card>
          </v-dialog>
          <v-dialog v-model="newResourceDialog" >
            <CreateResource />
          </v-dialog>
    </div>
</template>

<script>
// @ is an alias to /src
import CreateResource from '@/components/CreateResource.vue'

export default {
    name: 'Home',
    components: {
        CreateResource
    },
    data: function () {
        return {
          newResourceDialog: false,
          cliDownload: false,
          deletedResources: {},
          fetchInterval: null,
          resources: null,
        }
    },
    methods: {
        downloadCLI (osVersion) {
          window.open('https://pwm.promfacility.eu/downloads/vlatest/' + osVersion + '/cli/pwmcli')
        },
        openCliDownload () {
          this.cliDownload = true
          
        },
        openDoc () {
          window.open('https://pwm.promfacility.eu')
        },
        fetch () {
            this.deletedResources = []
            this.$store.dispatch('userStatus', {cb: function (data) {
                this.resources = data
                this.resources.DeletedResource.forEach(function (deletedResource) {
                    if (this.deletedResources[deletedResource.spec.resource.created.split('T')[0]] == undefined) {
                        this.deletedResources[deletedResource.spec.resource.created.split('T')[0]] = 1
                    } else {
                        this.deletedResources[deletedResource.spec.resource.created.split('T')[0]] += 1
                    }
                }.bind(this))
            }.bind(this)}) 
        }
    },
    mounted () {
        this.fetch()
        this.fetchInterval = setInterval(this.fetch, 60000)
    },
    beforeDestroy () {
        if (this.fetchInterval) {
            clearInterval(this.fetchInterval)
        }
    }
}
</script>
