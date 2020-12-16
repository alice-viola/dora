<template>
    <div class="home">
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
          <v-container v-else>
                <!--<v-row>
                  <v-col col="12">
                      <v-alert
                        border="left"
                        colored-border
                        color="warning accent-4"
                        elevation="12"
                      >
                      <h2> Update </h2>
                      Update will appen on Wendsdey 16, December 2020 starting from 20:00 
                      </v-alert>
                    </v-col>
                </v-row>-->
                <v-row>
                    <v-col col="12">
                        <v-card class="mainbackground lighten-1 elevation-12">
                            <v-row v-if="resources.Account !== undefined">
                              <v-col col="4">
                                <v-card-title>
                                    Weekly credits usage
                                </v-card-title>
                                 <v-card-text v-if="resources.Account.account.credits.weekly !== undefined">
                                     <v-chip v-if="resources.Account.account.status.outOfCredit == false"
                                       class="ma-2"
                                       color="success"
                                     >
                                   Used {{resources.Account.account.credits.weekly.toFixed(1) }} of <b style="padding-left: 5px">{{resources.Account.limits.credits.weekly}} ({{(resources.Account.account.credits.weekly / resources.Account.limits.credits.weekly * 100).toFixed(1)}}%)</b>
                                   </v-chip>
                                     <v-chip v-else
                                       class="ma-2"
                                       color="error"
                                     >
                                   Used  {{resources.Account.account.credits.weekly.toFixed(1) }} of <b style="padding-left: 5px">{{resources.Account.limits.credits.weekly}} (100%)</b>
                                   </v-chip>
                                 </v-card-text>
                              </v-col>
                              <v-col col="4">
                                <v-card-title>
                                    Limits
                                </v-card-title>
                                <v-card-text>
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
                                </v-card-text>
                              </v-col>
                              <v-col col="4">
                                <v-card-title>
                                    Credits per resource
                                </v-card-title>
                                <v-card-text>
                                  <b>GPU Volta V100</b>  Credits per hour: <b>2.5</b><br>
                                  <b>GPU RTX6000</b>  Credits per hour: <b>2</b><br>
                                  <b>GPU GeForce GTX 1080</b> Credits per hour: <b>0.5</b><br>
                                </v-card-text>
                              </v-col>
                            </v-row>
                        </v-card>
                    </v-col>
                </v-row>
                <v-row>
                    <v-col col="6" 
                    v-for="key in Object.keys(resources)" 
                    v-if="key !== 'DeletedResource' && key !== 'Account' && key !== 'ResourceCredit'"
                    :key="key"
                    >
                        <v-card v-if="key == 'Node'" class="mainbackground lighten-1 elevation-12">
                            <v-card-title>
                                {{key}}
                            </v-card-title>
                            <v-card-text>
                                <v-chip v-if="resources[key].filter((node) => { return node.status == 'READY'}).length == resources[key].length"
                                  class="ma-2"
                                  color="success"
                                >
                                <h3>{{resources[key].length}}</h3>
                                </v-chip>
                                <v-chip v-else
                                  class="ma-2"
                                  color="warning"
                                >
                                <h3>{{resources[key].filter((node) => { return node.status == 'READY'}).length}} / {{resources[key].length}}</h3>
                                </v-chip>
                            </v-card-text>
                        </v-card>
                        <v-card v-if="key !== 'Node'" class="mainbackground lighten-1 elevation-12">
                            <v-card-title>
                                {{key}}
                            </v-card-title>
                            <v-card-text>
                                <v-chip
                                  class="ma-2"
                                  color="success"
                                >
                                  <h3>{{resources[key].length}}</h3>
                                </v-chip>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>

                <v-row>
                    <v-col col="6">
                        <v-card class="mainbackground lighten-1 elevation-12">
                            <v-card-title>
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
                    <v-col col="6">
                        <v-card class="mainbackground lighten-1 elevation-12">
                            <v-card-title>
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
                    <v-col col="6">
                        <v-card class="mainbackground lighten-1 elevation-12">
                            <v-card-title>
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
                </v-row>
                <!--<h2> Workload frequency </h2>
                <v-sparkline
                  :value="Object.values(deletedResources)"
                  :gradient="gradient"
                  :smooth="radius || false"
                  :padding="padding"
                  :line-width="width"
                  :stroke-linecap="lineCap"
                  :gradient-direction="gradientDirection"
                  :fill="fill"
                  :type="type"
                  :auto-line-width="autoLineWidth"
                  auto-draw
                  bar
                ></v-sparkline>-->
          </v-container>
    </div>
</template>

<script>
// @ is an alias to /src

const gradients = [
  ['#222'],
  ['#42b3f4'],
  ['red', 'orange', 'yellow'],
  ['purple', 'violet'],
  ['#00c6ff', '#F0F', '#FF0'],
  ['#f72047', '#ffd200', '#1feaea'],
]

export default {
    name: 'Home',
    components: {
        
    },
    data: function () {
        return {
            deletedResources: {},
            fetchInterval: null,
            resources: null,

            width: 2,
            radius: 10,
            padding: 8,
            lineCap: 'round',
            gradient: gradients[5],
            gradientDirection: 'top',
            gradients,
            fill: true,
            type: 'trend',
            autoLineWidth: false,
        }
    },
    methods: {
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
