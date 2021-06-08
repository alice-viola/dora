<template>
  <v-container fluid class="pa-0">

    <v-navigation-drawer
      app
      dark
      right
      src="https://cdn.vuetifyjs.com/images/backgrounds/bg-1.jpg"
      permanent
    >
    
      <h3 class="pl-4 pt-2 button"> GPUs</h3>
      <h4 class="pl-4 button info--text">Cluster resources </h4>
      
      <GpusExplorer class="pa-2 mt-6"/>
    </v-navigation-drawer>

    <v-tabs v-model="tab" align-with-title>
      <v-tabs-slider color="secondary"></v-tabs-slider>
      <v-tab v-for="item in items" :key="item">
        {{ item }}
      </v-tab>
    </v-tabs>


    <v-row v-if="tab == 0">
      <!--<v-col class="col-3">
        <v-card class="mainbackground elevation-0 ma-3">
          <GpusExplorer class="pa-2" />
        </v-card>
      </v-col>-->

      <v-col class="col-12" >
        <!-- Empty -->
        <div v-if="$store.state.gpuNodeToShow == null" >
          <v-card class="primary elevation-4">
            <v-card-title>
              No GPUs here
            </v-card-title>
          </v-card>
        </div>

        <v-container fluid class="pa-0" v-if="$store.state.gpuNodeToShow != null">
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
    
          <div v-else>
            <v-card flat class="mainbackground elevation-0  ma-3" v-if="Object.keys(dataToShow).length > 0 && dataToShow.series.length > 1">
              <v-card-title class="overline">
                <h2 class="pl-4 pt-0 button" style="text-transform: capitalize;"> {{$store.state.gpuNodeToShow}}</h2>
                <v-spacer />
                <h4 class="pl-4 button info--text"> Used {{used}} of {{total}} {{gpuModelInfo.product_name}} </h4>
                <v-spacer />
                Last hour data
              </v-card-title>
              <v-card-text >
                <VueApexCharts type="area" width="100%" :options="lineOptionsLin" :series="dataToShow.series" :key="chartKey"></VueApexCharts>
              </v-card-text>
            </v-card>
          </div>
        </v-container>
      </v-col>

    </v-row>
    
    



  </v-container>
</template>

<script>
// @ is an alias to /src
import randomstring from 'randomstring'
import VueApexCharts from 'vue-apexcharts'
import GpusExplorer from '@/components/cluster/GpusExplorer'

export default {
  name: 'Cluster',
  components: {
    VueApexCharts, GpusExplorer
  },
  data: () => {
    return {
      tab: null,
      items: ['GPUs', 'Nodes', 'Workloads'],
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
