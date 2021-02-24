<template>
  <div>
    <h1 class="pa-4 pt-2 button"> Settings </h1>
    <v-list dense nav dense >
      <v-list-item link v-on:click="setSettingToShow(idx)" v-for="(p, idx) in $store.state.ui.settings" :key="idx">
        <v-tooltip right>
          <template v-slot:activator="{ active, on, attrs }">
            <v-list-item-icon>
              <v-icon color="primary" v-if="$store.state.ui.selectedSettingIdx == idx">{{p.icon}}</v-icon>
              <v-icon color="grey" v-else>{{p.icon}}</v-icon>
            </v-list-item-icon>
            <v-list-item-content v-on:click="setSettingToShow(idx)">
              <v-list-item-title>{{p.name}}</v-list-item-title>
              <!--<v-list-item-subtitle>{{p.description}}</v-list-item-subtitle>-->
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
  	name: 'SettingsNavigator',
  	components: {
  	  
  	},
  	data: () => {
  		return {}
  	},
  	methods: {
      setSettingToShow (idx) {
        this.$store.commit('setUi', {selectedSettingIdx: idx})
      }
  	}
}
</script>
