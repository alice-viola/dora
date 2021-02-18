<template>
  <div>
    <!-- Empty workloads -->
   	<v-container fluid v-if="$store.state.workloads.length == 0" class="pa-2">
      <LeftNavigation pageNavigationName="workloads-explorer"/>
      <div>
        <v-card>
          <v-card-title>
            No Workloads here
          </v-card-title>
        </v-card>
    </div>
   	</v-container>

   		<!-- Workloads -->
		<v-container fluid class="pa-0" v-else>
      <LeftNavigation pageNavigationName="workloads-explorer"/>
      <Workload />
    </v-container>

  </div>
</template>

<script>
// @ is an alias to /src
import LeftNavigation from '@/components/LeftNavigation'
import Workload from '@/components/Workload.vue'

export default {
  name: 'Workloads',
  components: {
    Workload, LeftNavigation
  },
  data: () => {
  	return {
  		rightDrawer: true,
  	}
  },
  methods: {
    createWorkload () {

    }
  },
  beforeMount () {
  	this.$store.commit('setUi', {leftDrawerComponent: 'workloads-explorer'})
  }
}
</script>
