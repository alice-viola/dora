<template>
    <v-navigation-drawer
      v-model="drawer"
      app
      permanent
      class="navigationDrawer lighten-0 elevation-4"
      floating
      width="300"
      v-if="$store.state.userCfg.hasConfigFile == true && pageNavigationName !== null && pageNavigationName !== undefined"
    >
        <LeftNavigationMain />
      <!-- Page specific navigation drawer -->
      <div class="pl-14" >
        <div v-if="pageNavigationName !== null && pageNavigationName !== undefined">
        	<component style="margin-top: 5px" :is="pageNavigationName"></component>
        </div>
      </div>
    </v-navigation-drawer>
    <LeftNavigationMain v-else/>

</template>
<script>

import LeftNavigationMain from '@/components/navs/LeftNavigationMain' 

export default {
  name: 'LeftNavigation',
  props: ['pageNavigationName'],
  components: {
    LeftNavigationMain,
    'project-settings': () => import('@/components/projects/ProjectSettings'),
    'projects-list': () => import('@/components/projects/ProjectsExplorer'),
    'projects-explorer': () => import('@/components/projects/ProjectsExplorer'),
    'project-new': () => import('@/components/projects/ProjectNewDrawer'),
    'files-explorer': () => import('@/components/files/FilesExplorer'),
    'settings-navigator': () => import('@/components/settings/SettingsNavigator'),
    'workloads-explorer': () => import('@/components/workloads/WorkloadsExplorer'),
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