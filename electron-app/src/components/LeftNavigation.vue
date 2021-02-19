<template>
    <v-navigation-drawer
      v-model="drawer"
      app
      permanent
      class="mainbackground lighten-1 elevation-4"
      width="300"
      v-if="$store.state.userCfg.hasConfigFile == true && pageNavigationName !== null && pageNavigationName !== undefined"
    >
      <LeftNavigationMain />
      <!-- Page specific navigation drawer -->
      <div class="pl-14" >
        <div v-if="pageNavigationName !== null && pageNavigationName !== undefined">
        	<component :is="pageNavigationName"></component>
        </div>
      </div>
    </v-navigation-drawer>
    <LeftNavigationMain v-else/>

</template>
<script>

import LeftNavigationMain from '@/components/LeftNavigationMain' 

export default {
  name: 'LeftNavigation',
  props: ['pageNavigationName'],
  components: {
    LeftNavigationMain,
    'project-settings': () => import('@/components/ProjectSettings'),
    'projects-list': () => import('@/components/ProjectsExplorer'),
    'projects-explorer': () => import('@/components/ProjectsExplorer'),
    'project-new': () => import('@/components/ProjectNewDrawer'),
    'files-explorer': () => import('@/components/FilesExplorer'),
    'settings-navigator': () => import('@/components/SettingsNavigator'),
    'workloads-explorer': () => import('@/components/WorkloadsExplorer'),
  },
  watch: {
    '$store.state.ui.leftDrawerComponent' (to, from) {
      this.leftDrawerComponent = to
    }
  },
  data: () => ({
    drawer: null,
    leftDrawerComponent: null
  })
}
</script>
<style scope="global">
.clickable {
  cursor: pointer;
}
</style>