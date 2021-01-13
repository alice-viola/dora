<template>
    <div>
      <v-container class="fill-height" fluid>
        <v-row>
          <v-col class="col-12 col-md-2 col-lg-2 pt-0" v-if="$store.state.ui.isMobile == true">
          <v-spacer />
          <v-select
            class = 'pa-2'
            v-model="$store.state.ui.stat.type"
            label="Metric"
            outlined
            dense
            :items="['cluster', 'gpus']"
          ></v-select>      
          <v-select v-if="$store.state.ui.stat.filters.length > 0"
            class = 'pa-2'
            v-model="$store.state.ui.stat.filter"
            label="Filter"
            outlined
            dense
            :items="$store.state.ui.stat.filters"
          ></v-select>
          <v-select
            class = 'pa-2'
            v-model="$store.state.ui.stat.period"
            label="Period"
            outlined
            dense
            :items="['1m', '10m', '1h', '1d', '1w']"
          ></v-select>
          </v-col>
        </v-row>
        <v-row v-if="$store.state.ui.stat.type == 'cluster'">
          <v-col class="col-12 col-md-4 col-lg-4">
            <v-card outlined>
              <v-card-title class="overline">Used GPUS [count]</v-card-title>
              <v-card-text v-if="charts.gpus.series[0].data.length > 0">
                <VueApexCharts  type="line" width="100%" :options="lineOptions" :series="charts.gpus.series"></VueApexCharts>
              </v-card-text>
              <v-card-text v-else>
                No data in the last {{$store.state.ui.stat.period}}
              </v-card-text>
            </v-card>
          </v-col>

          <v-col class="col-12 col-md-4 col-lg-4">
            <v-card outlined>
              <v-card-title class="overline">GPU VRAM Used [GB]</v-card-title>
              <v-card-text v-if="charts.gpumemused.series[0].data.length > 0">
                <VueApexCharts type="line" width="100%" :options="lineOptions" :series="charts.gpumemused.series"></VueApexCharts>
              </v-card-text>
              <v-card-text v-else>
                No data in the last {{$store.state.ui.stat.period}}
              </v-card-text>
            </v-card>
          </v-col>

          <v-col class="col-12 col-md-4 col-lg-4">
            <v-card outlined>
              <v-card-title class="overline">Nodes RAM Used [GB]</v-card-title>
              <v-card-text v-if="charts.mem.series[0].data.length > 0">
                <VueApexCharts type="line" width="100%" :options="lineOptions" :series="charts.mem.series"></VueApexCharts>
              </v-card-text>
              <v-card-text v-else>
                No data in the last {{$store.state.ui.stat.period}}
              </v-card-text>
            </v-card>
          </v-col>

          <v-col class="col-12 col-md-4 col-lg-4">
            <v-card outlined>
              <v-card-title class="overline">Nodes CPU Load [%]</v-card-title>
              <v-card-text v-if="charts.cpusload.series[0].data.length > 0">
                <VueApexCharts type="line" width="100%" :options="lineOptions" :series="charts.cpusload.series"></VueApexCharts>
              </v-card-text>
              <v-card-text v-else>
                No data in the last {{$store.state.ui.stat.period}}
              </v-card-text>
            </v-card>
          </v-col>

          <v-col class="col-12 col-md-4 col-lg-4">
            <v-card outlined>
              <v-card-title class="overline">Active Nodes [count]</v-card-title>
              <v-card-text v-if="charts.nodes.series[0].data.length > 0">
                <VueApexCharts type="line" width="100%" :options="lineOptions" :series="charts.nodes.series"></VueApexCharts>
              </v-card-text>
              <v-card-text v-else>
                No data in the last {{$store.state.ui.stat.period}}
              </v-card-text>
            </v-card>
          </v-col>

          <v-col class="col-12 col-md-4 col-lg-4">
            <v-card outlined>
              <v-card-title class="overline">Running Workloads [count]</v-card-title>
              <v-card-text v-if="charts.workloads.series[0].data.length > 0">
                <VueApexCharts type="line" width="100%" :options="lineOptions" :series="charts.workloads.series"></VueApexCharts>
              </v-card-text>
              <v-card-text v-else>
                No data in the last {{$store.state.ui.stat.period}}
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-row v-if="$store.state.ui.stat.type == 'gpus'">
          <v-col class="col-12 col-md-3 col-lg-3" v-for="gpu in Object.keys(charts.gpusId)">
            <v-card outlined>
              <v-card-title class="overline">[VRAM GB USED] {{gpu}}</v-card-title>
              <v-card-text v-if="charts.gpusId[gpu].series[0].data.length > 0">
                <VueApexCharts type="line" width="100%" :options="lineOptionsLin" :series="charts.gpusId[gpu].series"></VueApexCharts>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

      </v-container>
    </div>
</template>

<script>
// @ is an alias to /src
import VueApexCharts from 'vue-apexcharts'
    
export default {
    name: 'Stat',
    components: {
        VueApexCharts
    },
    data: function () {
        return {
          stat: null,
          charts: { 
            nodes: {series: [{data: []}]},
            gpus: {series: [{data: []}]},
            mem: {series: [{data: []}]},
            gpumemused: {series: [{data: []}]},
            cpusload: {series: [{data: []}]},
            workloads: {series: [{data: []}]},
            gpusId: {},
          },
          lineOptions: {
            chart: {
              toolbar: {
                show: false
              },
              zoom: {
                autoScaleYaxis: false
              },
              type: 'line'
            },
            tooltip: {
              enabled: false,
              theme: this.$vuetify.theme.dark == true ? 'dark' : 'light'
            },
            dataLabels: {
              enabled: false
            },
            xaxis: {
              type: 'datetime',
              tickAmount: 5,
            },
            yaxis: {
              type: 'datetime',
              tickAmount: 3,
            },
            stroke: {
              width: 2,
              colors: ['#F96F5D', '#F96F5D']
            },
            fill: {
              type: 'gradient',
              colors: ['#F96F5D', '#F96F5D'],
              gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.8,
                opacityTo: 1,
                stops: [0, 0]
              }
            },
          },
          lineOptionsLin: {
            chart: {
              type: 'line',
              toolbar: {
                show: false
              },
              zoom: {
                autoScaleYaxis: true
              }
            },
            tooltip: {
              enabled: false,
            },
            dataLabels: {
              enabled: false
            },
            xaxis: {
              tickAmount: 1,
            },
            yaxis: {
              tickAmount: 2,
            },
            stroke: {
              width: 2,
              colors: ['#F96F5A', '#F96F5B', '#F96F5C', '#F96F5D', '#F96F5E', '#F96F5F', '#F96F6A', '#F96F6B'],
            },
            fill: {
              type: 'gradient',
              colors: ['#F96F5A', '#F96F5B', '#F96F5C', '#F96F5D', '#F96F5E', '#F96F5F', '#F96F6A', '#F96F6B'],
              gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.8,
                opacityTo: 1,
                stops: [0, 20]
              }
            },
          }

      }
    },
    computed: {
      type () {
        return this.$store.state.ui.stat.type
      },
      period () {
        return this.$store.state.ui.stat.period
      },
      filter () {
        return this.$store.state.ui.stat.filter
      },
    },
    watch: {
      period (to, from) {
        this.fetch()
      },
      type () {
        this.$store.state.ui.stat.filters = []
        this.$store.state.ui.stat.filter = ''
        this.fetch()
      },
      filter () {
        this.charts.gpusId = {}
        this.fetch()
      }
    },
    methods: {
        fetch () {
          this.$store.dispatch('stat', {period: this.$store.state.ui.stat.period, type: this.$store.state.ui.stat.type, cb: function (data) {
            this.stat = data
            this.computeCharts()
          }.bind(this)}) 
        },
        computeCharts () {
          if (this.$store.state.ui.stat.type == 'cluster') {
            this.lineOptions = JSON.parse(JSON.stringify(this.lineOptions))
            this.charts.nodes.series[0].data = this.stat.map((stat) => {
              return [( new Date(stat.date)).getTime(), stat.counters.nodes]
            })
            this.charts.gpus.series[0].data = this.stat.map((stat) => {
              return [( new Date(stat.date)).getTime(), stat.usage.gpusused]
            })
            this.charts.mem.series[0].data = this.stat.map((stat) => {
              return [( new Date(stat.date)).getTime(), parseInt(stat.usage.memused)]
            })
            this.charts.gpumemused.series[0].data = this.stat.map((stat) => {
              return [( new Date(stat.date)).getTime(), parseInt(stat.usage.gpusmemused)]
            })
            this.charts.cpusload.series[0].data = this.stat.map((stat) => {
              return [( new Date(stat.date)).getTime(), parseInt(stat.usage.cpusload)]
            })
            this.charts.workloads.series[0].data = this.stat.map((stat) => {
              return [( new Date(stat.date)).getTime(), parseInt(stat.counters.workloads == undefined ? 0 : stat.counters.workloads.running)]
            })
          } else if (this.$store.state.ui.stat.type == 'gpus') {
            this.lineOptionsLin = JSON.parse(JSON.stringify(this.lineOptionsLin))
            let lastStat = this.stat[this.stat.length - 1] 
            
            this.$store.state.ui.stat.filters = [...new Set(Object.values(lastStat).map((stat) => { return stat.node }))] 
            if (this.$store.state.ui.stat.filter == '') {
              this.$store.state.ui.stat.filter = this.$store.state.ui.stat.filters[0]
            }
            this.stat.forEach (function (gpusStat) {
              Object.keys(gpusStat).forEach(function (uuid) {
                if (gpusStat[uuid].node == this.$store.state.ui.stat.filter || this.$store.state.ui.stat.filter == '') {
                  if (this.charts.gpusId[uuid] == undefined) {
                    this.charts.gpusId[uuid] = {series: [{data: []}]}
                  }
                  this.charts.gpusId[uuid].series[0].data = this.stat.map((stat) => {
                    if (stat[uuid] == undefined) {
                      return 0
                    } else {
                      return parseInt(stat[uuid].fb_memory_usage)  
                    }
                  })
                }
              }.bind(this))
            }.bind(this))
            this.$forceUpdate()
          }
        }
    },
    mounted () {
      this.fetch()
      //this.fetchInterval = setInterval(this.fetch, 5000)
    },
    beforeDestroy () {
        if (this.fetchInterval) {
            clearInterval(this.fetchInterval)
        }
    }
}
</script>
