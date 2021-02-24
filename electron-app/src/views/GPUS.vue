<template>
  <div>
    <!-- Empty workloads -->
    <v-container fluid v-if="$store.state.gpuNodeToShow == null" class="pa-2">
      <LeftNavigation pageNavigationName="gpus-nodes-explorer"/>
      <div>
        <v-card class="primary elevation-4">
          <v-card-title>
            No GPUs here
          </v-card-title>
        </v-card>
    </div>
    </v-container>

      <!-- Workloads -->
    <v-container fluid class="pa-6 pt-2" v-else>
      <v-container fluid class="pa-6 pt-2 fill-height" v-if="isLoading == true">
        <v-row align="center" justify="center" style="text-align: center; min-height: 90vh">
          <v-col cols="12" sm="12" md="12" align="center" justify="center" >
            <v-progress-circular 
              :size="50"
              :width="2"
              color="primary"
              indeterminate
              class="mt-12 mb-12"
            ></v-progress-circular>
          </v-col>
        </v-row>
      </v-container>

      <LeftNavigation pageNavigationName="gpus-nodes-explorer"/>
      <div v-if="isLoading == false">
        <h2 class="pl-4 pt-0 button" style="text-transform: capitalize;"> {{$store.state.gpuNodeToShow}}</h2>
        <h4 class="pl-4 button info--text">Used {{used}} of {{total}} </h4>
        <v-row v-if="Object.keys(dataToShow).length > 0 && dataToShow.series.length > 1" class="mt-2">
          <v-col class="col-12 col-md-12 col-lg-12">
            <v-card flat class="mainbackground">
              <v-card-title class="overline">
                {{total}} x {{gpuModelInfo.product_name}}
                <v-spacer />
                Last hour data
              </v-card-title>
              <v-card-text >
                <VueApexCharts type="area" width="100%" :options="lineOptionsLin" :series="dataToShow.series" :key="chartKey"></VueApexCharts>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>
    </v-container>

  </div>
</template>

<script>
// @ is an alias to /src
import randomstring from 'randomstring'
import VueApexCharts from 'vue-apexcharts'
import LeftNavigation from '@/components/navs/LeftNavigation'

export default {
  name: 'GPUS',
  components: {
    VueApexCharts, LeftNavigation
  },
  data: () => {
    return {
      isLoading: true,
      dataToShow: {},
      used: 0,
      total: 0,
      gpuModelInfo: {product_name: '', count: 0},
      chartKey: '',

      lineOptionsLin: {
        chart: {
          animations: {
            enabled: false,
          },
          type: 'line',
          toolbar: {
            show: false
          },
          zoom: {
            autoScaleYaxis: false
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
          max: 12
        },
        stroke: {
          width: 4,
        },
        fill: {
          type: 'gradient',
        },
      }
    }
  },
  watch: {
    '$store.state.gpuNodeToClick' (to, from) {

      this.fetch()
    }
  },
  methods: {
      fetch () {
        let selectedNode = this.$store.state.gpuNodeToShow
        let dataToShow = {series: []}
        let mapGpuIndex = {}
        let _used = {}
        this.total = 0
        this.used = 0
        this.$store.state.interface.cli.api.get.stat('cluster', undefined, {group: '-', period: '1h'}, function (err, data) {
          if (err) {
            
          } else {
            let totalMem = 0
            let product_name = ''
            data.forEach((d) => {
              let gpusNames = Object.keys(d.gpus)
              let MemUsedAssigned = false
              
              gpusNames.forEach((gpuName) => {
                if (d.gpus[gpuName].node == selectedNode) {
                  product_name = d.gpus[gpuName].product_name
                  if (!MemUsedAssigned) {
                    totalMem = d.gpus[gpuName].fb_memory_total
                    //dataToShow.series[0].data.push(d.gpus[gpuName].fb_memory_total) 
                    MemUsedAssigned = true 
                  }
                  if (mapGpuIndex[gpuName] == undefined) {
                    dataToShow.series.push({data: [], name: dataToShow.series.length})
                    mapGpuIndex[gpuName] = dataToShow.series.length - 1//{series: [{data: []}, {data: []}], name: gpuName}
                  }
                  _used[gpuName] = d.gpus[gpuName].used 
                  dataToShow.series[mapGpuIndex[gpuName]].data.push(d.gpus[gpuName].fb_memory_usage)
                }
              })
            })
            this.gpuModelInfo.product_name = product_name
            this.lineOptionsLin.yaxis.max = totalMem//dataToShow.series[0].data[0] + 0.5
            this.chartKey = randomstring.generate(4)
            this.total = 0
            this.used = 0
            Object.values(_used).forEach(function (us) {
              this.total += 1
              this.used += us == true ? 1 : 0 
            }.bind(this))
            this.dataToShow = dataToShow
            this.isLoading = false
          }
        }.bind(this))
      }
  },
  beforeMount () {
    this.$store.commit('setUi', {leftDrawerComponent: 'workloads-explorer'})
  }
}
</script>
