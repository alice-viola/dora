<template>
    <div>
      <v-container class="fill-height" fluid>
        <v-row>

          <v-col class="col-12 col-md-4 col-lg-4">
            <v-card outlined>
              <v-card-title class="overline">Active GPUS</v-card-title>
              <v-card-text>
                <VueApexCharts v-if="charts.gpus.series[0].data.length > 0" type="line" width="100%" :options="lineOptions" :series="charts.gpus.series"></VueApexCharts>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col class="col-12 col-md-4 col-lg-4">
            <v-card outlined>
              <v-card-title class="overline">GPU VRAM Used</v-card-title>
              <v-card-text>
                <VueApexCharts v-if="charts.gpumemused.series[0].data.length > 0" type="line" width="100%" :options="lineOptions" :series="charts.gpumemused.series"></VueApexCharts>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col class="col-12 col-md-4 col-lg-4">
            <v-card outlined>
              <v-card-title class="overline">Node RAM Used</v-card-title>
              <v-card-text>
                <VueApexCharts v-if="charts.mem.series[0].data.length > 0" type="line" width="100%" :options="lineOptions" :series="charts.mem.series"></VueApexCharts>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col class="col-12 col-md-4 col-lg-4">
            <v-card outlined>
              <v-card-title class="overline">Node CPU Load</v-card-title>
              <v-card-text>
                <VueApexCharts v-if="charts.cpusload.series[0].data.length > 0" type="line" width="100%" :options="lineOptions" :series="charts.cpusload.series"></VueApexCharts>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col class="col-12 col-md-4 col-lg-4">
            <v-card outlined>
              <v-card-title class="overline">Active Nodes</v-card-title>
              <v-card-text>
                <VueApexCharts v-if="charts.nodes.series[0].data.length > 0" type="line" width="100%" :options="lineOptions" :series="charts.nodes.series"></VueApexCharts>
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
            mem: {series: [{data: []}, {data: []}]},
            gpumemused: {series: [{data: []}]},
            cpusload: {series: [{data: []}]},
          },
          lineOptions: {
            chart: {
              id: 'area',
              zoom: {
                autoScaleYaxis: true
              }
            },
            dataLabels: {
              enabled: false
            },
            xaxis: {
              type: 'datetime',
              tickAmount: 1,
            },
            yaxis: {
              
              type: 'datetime',
              tickAmount: 2,
            },
            stroke: {
              colors: ['#F96F5D', '#F96F5D']
            },
            fill: {
              type: 'gradient',
              colors: ['#F96F5D', '#F96F5D'],
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
    methods: {
        fetch () {
          this.deletedResources = []
          this.$store.dispatch('stat', {period: '1h', cb: function (data) {
            this.stat = data
            this.computeCharts()
          }.bind(this)}) 
        },
        computeCharts () {
          this.charts.nodes.series[0].data = this.stat.map((stat) => {
            return [( new Date(stat.date)).getTime(), stat.counters.nodes]
          })
          this.charts.gpus.series[0].data = this.stat.map((stat) => {
            return [( new Date(stat.date)).getTime(), stat.usage.gpusused]
          })
          this.charts.mem.series[0].data = this.stat.map((stat) => {
            return [( new Date(stat.date)).getTime(), parseInt(stat.usage.memused)]
          })
          this.charts.mem.series[1].data = this.stat.map((stat) => {
            return [( new Date(stat.date)).getTime(), parseInt(stat.counters.mem)]
          })
          this.charts.gpumemused.series[0].data = this.stat.map((stat) => {
            return [( new Date(stat.date)).getTime(), parseInt(stat.usage.gpusmemused)]
          })
          this.charts.cpusload.series[0].data = this.stat.map((stat) => {
            return [( new Date(stat.date)).getTime(), parseInt(stat.usage.cpusload)]
          })
        }
    },
    mounted () {
      this.fetch()
      this.fetchInterval = setInterval(this.fetch, 5000)
    },
    beforeDestroy () {
        if (this.fetchInterval) {
            clearInterval(this.fetchInterval)
        }
    }
}
</script>
