<template>
  <div>
    <v-row class="navigationDrawer lighten-0 pa-2">

       <!-- Settings -->
       <v-avatar class="d-block text-center mx-auto" size="36" @click="$store.state.ui.projectView = 'project-settings'">
         <v-icon color="primary" v-if="$store.state.ui.projectView == 'project-settings'">fas fa-sliders-h</v-icon>
         <v-icon color="grey" v-else>fas fa-sliders-h</v-icon>
       </v-avatar>

       <!-- Workloads -->
       <v-avatar class="d-block text-center mx-auto" size="36" @click="$store.state.ui.projectView = 'project-workloads'">
         <v-icon color="primary" v-if="$store.state.ui.projectView == 'project-workloads'">fab fa-docker</v-icon>
         <v-icon color="grey" v-else>fab fa-docker</v-icon>
       </v-avatar>

       <v-avatar class="d-block text-center mx-auto" size="36" @click="$store.state.ui.projectView = 'project-code'" v-if="$store.state.projects[$store.state.ui.selectedProjectIdx].code !== ''">
         <v-icon color="primary" v-if="$store.state.ui.projectView == 'project-code'">fas fa-code</v-icon>
         <v-icon color="grey" v-else>fas fa-code</v-icon>
       </v-avatar>

    </v-row>
    <h1 class="pa-4 button">  Settings </h1>

    <v-list dense nav dense >
      <v-list-item link v-on:click="setSettingToShow(p.id)" v-for="(p, idx) in $store.state.ui.projectSettings" :key="idx">
        <v-tooltip right>
          <template v-slot:activator="{ active, on, attrs }">
            <v-list-item-icon>
              <v-icon color="primary" v-if="$store.state.ui.projectSettingView == p.id">{{p.icon}}</v-icon>
              <v-icon color="grey" v-else>{{p.icon}}</v-icon>
            </v-list-item-icon>
            <v-list-item-content v-on:click="setSettingToShow(idx)">
              <v-list-item-title>{{p.name}}</v-list-item-title>
              <v-list-item-subtitle>{{p.desc}}</v-list-item-subtitle>
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
        this.$store.state.ui.projectSettingView = idx
      }
  	}
}
</script>
