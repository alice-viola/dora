<template>
    <div class="home">
        <v-main>
          <v-container v-if="resources == null">
            <v-progress-circular 
                indeterminate
                color="primary"
            ></v-progress-circular>
          </v-container>
          <v-container v-else >
                <h2> Available resources </h2>
                <v-row>
                    <v-col col="6" 
                    v-for="key in Object.keys(resources)" 
                    v-if="key !== 'DeletedResource'"
                    :key="key"
                    >
                        <v-card v-if="key == 'Node'">
                            <v-card-title>
                                {{key}}
                            </v-card-title>
                            <v-card-text>
                                <v-chip v-if="resources[key].filter((node) => { return node.status == 'READY'}).length == resources[key].length"
                                  class="ma-2"
                                  color="green"
                                >
                                <h3>{{resources[key].length}}</h3>
                                </v-chip>
                                <v-chip v-else
                                  class="ma-2"
                                  color="orange"
                                >
                                <h3>{{resources[key].filter((node) => { return node.status == 'READY'}).length}} / {{resources[key].length}}</h3>
                                </v-chip>
                            </v-card-text>
                        </v-card>
                        <v-card v-if="key !== 'Node'">
                            <v-card-title>
                                {{key}}
                            </v-card-title>
                            <v-card-text>
                                <v-chip
                                  class="ma-2"
                                  color="green"
                                >
                                  <h3>{{resources[key].length}}</h3>
                                </v-chip>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>
                <h2> Workload status </h2>
                <v-row>
                    <v-col col="6">
                        <v-card >
                            <v-card-title>
                                Running
                            </v-card-title>
                            <v-card-text>
                                <v-chip
                                  class="ma-2"
                                  color="green"
                                >
                                  <h3>{{resources.Workload.filter((wk) => { return wk.status == 'RUNNING'}).length }}</h3>
                                </v-chip>
                            </v-card-text>
                        </v-card>
                    </v-col>
                    <v-col col="6">
                        <v-card >
                            <v-card-title>
                                Queue
                            </v-card-title>
                            <v-card-text>
                                <v-chip v-if="resources.Workload.filter((wk) => { return wk.status == 'QUEUED'}).length !== 0"
                                    class="ma-2"
                                    color="orange"
                                >
                                  <h3>{{resources.Workload.filter((wk) => { return wk.status == 'QUEUED'}).length }}</h3>
                                </v-chip>
                                <v-chip v-else
                                  class="ma-2"
                                  color="green"
                                >
                                  <h3>{{0}}</h3>
                                </v-chip>
                            </v-card-text>
                        </v-card>
                    </v-col>
                    <v-col col="6">
                        <v-card >
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
                <h2> Workload frequency </h2>
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
                ></v-sparkline>
          </v-container>
        </v-main>  
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
                //deletedResource.spec.resource.created.split('T')[0]
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
