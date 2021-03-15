<template>
  <div>
    <v-btn text color="primary--text" @click="$store.commit('projectView', 'projects-list')"> <v-icon left> fas fa-long-arrow-alt-left </v-icon> Projects </v-btn>
    <v-divider />
  </div>
</template>

<script>

export default {
  	name: 'ProjectNewDrawer',
  	components: {
  	  
  	},
  	data: () => {
  		return {
        
  		}
  	}
}
</script>
