<template>
  <div>
    <!-- Empty workloads -->
    <v-navigation-drawer
      app
      right
      src="https://cdn.vuetifyjs.com/images/backgrounds/bg-1.jpg"
      v-model="$store.state.ui.showRightDraw"
    >
      <WorkloadsExplorer/>
    </v-navigation-drawer>
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
		    <v-container fluid class="pa-0"   v-else>
          <Workload />
        </v-container>

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

  	}
  },
  beforeMount () {
    
  	this.$store.commit('setUi', {leftDrawerComponent: 'workloads-explorer'})
  }
}
</script>
