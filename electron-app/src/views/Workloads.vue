<template>
  <div>
  			<!-- Empty workloads -->
   	<v-container fluid v-if="$store.state.userCfg.cfg !== undefined && ($store.state.projects == undefined || $store.state.projects.length == 0)">
      <LeftNavigation pageNavigationName="workloads-explorer"/>
				<v-card class="lighten-0 elevation-1">
				    <v-card-title>
				        Projects
				    </v-card-title>
				    <v-card-text>
				        <p>
				        	You don't have any projects, start creating one!
				        </p>
    		      		<v-btn text v-on:click="createProject()">
				        	Create project
				        </v-btn>
				    </v-card-text>
				</v-card>
   	</v-container>

   		<!-- Workloads -->
		<v-container fluid  class="pa-0">
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
  beforeMount () {
  	this.$store.commit('setUi', {leftDrawerComponent: 'workloads-explorer'})
  }
}
</script>
