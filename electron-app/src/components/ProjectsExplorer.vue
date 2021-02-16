<template>
  <div>
    <v-list dense nav dense >
      <v-list-item link v-on:click="selectProject(idx)" v-for="(p, idx) in $store.state.userCfg.cfg.projects" :key="idx">
        <v-tooltip right>
          <template v-slot:activator="{ active, on, attrs }">
            <v-list-item-icon>
              <v-icon color="primary" v-if="$store.state.ui.selectedProjectIdx == idx">fa-vial</v-icon>
              <v-icon color="grey" v-else>fa-vial</v-icon>
            </v-list-item-icon>
            <v-list-item-content v-on:click="selectProject(idx)">
              <v-list-item-title>{{p.name}}</v-list-item-title>
              <v-list-item-subtitle>{{p.description}}</v-list-item-subtitle>
            </v-list-item-content>
          </template>
          <span>{{p.name}}</span>
        </v-tooltip>
      </v-list-item>
    </v-list>
  </div>
</template>

<script>

export default {
  	name: 'ProjectsExplorer',
  	components: {
  	  
  	},
  	data: () => {
  		return {
        selectedProjectIdx: 0 
  		}
  	},
  	methods: {
      selectProject (idx) {
        this.selectedProjectIdx = idx 
        this.$store.commit('setUi', {selectedProjectIdx: idx})
      }
  	}
}
</script>
