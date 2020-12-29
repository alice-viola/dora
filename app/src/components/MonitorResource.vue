<template>
  <v-card class="elevation-12">
    <v-card-title class="overline">GPU Monitor</v-card-title>
    <v-card-text v-if="charts.series[0].data.length > 0">
      <VueApexCharts  type="line" width="100%" height="350" :options="lineOptions" :series="charts.series"></VueApexCharts>
    </v-card-text>
    <v-card-text v-else>
      No data
    </v-card-text>
  </v-card>
</template>
<script>
import Vue from 'vue'
import VueApexCharts from 'vue-apexcharts'

export default {
  name: "MonitorResource",
  props: ['resource'],
  components: {
    VueApexCharts
  },
  data: () => ({
    resourceDetail: {},
    stats: {},
    charts: {series: [{data: []}]},
    lineOptions: {
      chart: {
        type: 'line',
        toolbar: {
          show: false
        },
        id: 'monitor',
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
  }),
  methods: {
    fetch () {
      this.stats = {}
      this.$store.dispatch('describe', {
          kind: this.resource.kind, 
          name: this.resource.name, 
          group: this.resource.group, 
          cb: function (data) {
            if (data !== null && data.scheduler !== undefined) {
              data.scheduler.gpu.forEach(function (gpu) {
                this.$store.dispatch('stat', {period: '5m', type: 'gpus', name: gpu.uuid, cb: function (data) {
                  this.stats[gpu.uuid] = data
                  this.computeCharts()
                }.bind(this)}) 
              }.bind(this))
            }
      }.bind(this)}) 
    },
    computeCharts () {
      this.lineOptions = JSON.parse(JSON.stringify(this.lineOptions))
      let index = 0
      Object.keys(this.stats).forEach(function (key) {
        if (this.charts.series.length < index) {
          this.charts.series[index].push({data: []})
        } 
        this.charts.series[index].data = this.stats[key].map((stat) => {
          let res = stat.fb_memory_usage
          index += 1
          return res
        })
      }.bind(this))
    }
  },
  beforeMount () {
    this.fetch()
    this.fetchInterval = setInterval(function () {
      this.fetch()
    }.bind(this), 10000)
  },
  beforeDestroy () {
    if (this.fetchInterval !== null && this.fetchInterval !== undefined) {
      clearInterval(this.fetchInterval)
    }
  }
}
</script>