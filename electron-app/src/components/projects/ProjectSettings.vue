<template>
  <div>
    <v-list dense nav dense >
      <v-list-item link v-on:click="setSettingToShow(idx)" v-for="(p, idx) in $store.state.ui.projectSettings" :key="idx">
        <v-tooltip right>
          <template v-slot:activator="{ active, on, attrs }">
            <v-list-item-icon>
              <v-icon color="primary" v-if="$store.state.ui.selectedSettingIdx == idx">{{p.icon}}</v-icon>
              <v-icon color="grey" v-else>{{p.icon}}</v-icon>
            </v-list-item-icon>
            <v-list-item-content v-on:click="setSettingToShow(idx)">
              <v-list-item-title>{{p.name}}</v-list-item-title>
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
  	name: 'ProjectSettings',
  	components: {
  	  
  	},
  	data: () => {
  		return {}
  	},
  	methods: {
      setSettingToShow (idx) {
        
      }
  	}
}
</script>
