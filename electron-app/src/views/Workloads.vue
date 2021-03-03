<template>
  <div>
    <!-- Empty workloads -->
    <v-tabs v-model="tab" align-with-title>
      <v-tabs-slider color="secondary"></v-tabs-slider>
      <v-tab v-for="item in items" :key="item">
        {{ item }}
      </v-tab>
    </v-tabs>

    <v-row v-if="tab == 0">
      <v-col class="col-3">
        <v-card class="elevation-0 ma-3">
          <WorkloadsExplorer class="pa-2" />
        </v-card>
      </v-col>

      <v-col class="col-9">
    
   	    <v-container fluid v-if="$store.state.workloads.length == 0" class="pa-2">
          <div>
            <v-card class="primary elevation-4">
              <v-card-title>
                No Workloads here
              </v-card-title>
            </v-card>
        </div>
   	    </v-container>
    
   	    	<!-- Workloads -->
		    <v-container fluid class="pa-0" v-else>
          <Workload />
        </v-container>
      </v-col>
    </v-row>

  </div>
</template>

<script>
// @ is an alias to /src
import Workload from '@/components/workloads/Workload.vue'
import WorkloadsExplorer from '@/components/workloads/WorkloadsExplorer.vue'

export default {
  name: 'Workloads',
  components: {
    Workload, WorkloadsExplorer
  },
  data: () => {
  	return {
      tab: null,
      items: ['All']
  	}
  },
  beforeMount () {
  	this.$store.commit('setUi', {leftDrawerComponent: 'workloads-explorer'})
  }
}
</script>
