<template>
  <div>
    <!-- Empty disks -->
    <v-container fluid v-if="$store.state.diskToShow == null" class="pa-2">
      <div>
        <v-card class="primary elevation-4">
          <v-card-title>
            No Disks here
          </v-card-title>
        </v-card>
    </div>
    </v-container>

    <v-container fluid v-if="$store.state.diskToShow != null" >
      <h2 class="pl-4 pt-0 button" style="text-transform: capitalize;"> {{$store.state.diskToShow.data.name}}</h2>
      <h4 class="pl-4 button info--text">{{$store.state.diskToShow.data.group}} </h4>
      
      <v-card class="mainbackground ma-4 mt-12 elevation-0">
        <v-alert
          dense
          outlined
          type="info"
          v-if="$store.state.diskToShow.data.policy !== undefined && $store.state.diskToShow.data.policy == 'readonly'"
        >
          This is a <b>read only</b> disk, you cannot upload files
        </v-alert>
        <div v-else>
          <dashboard :uppy="uppy" :plugins="[FileInput]"/>
        </div>
      </v-card>
    </v-container>

  </div>
</template>

<script>
// @ is an alias to /src
import { Dashboard } from '@uppy/vue'

import '@uppy/core/dist/style.css'
import '@uppy/dashboard/dist/style.css'

import  FileInput from '@uppy/file-input'
import '@uppy/file-input/dist/style.css'
import Uppy from '@uppy/core'
import Tus from '@uppy/tus'

export default {
  name: 'Disks',
  components: {
    Dashboard, FileInput
  },
  data: () => {
    return {
      isLoading: false,
      disk: null,
      uploadId: null
    }
  },
  computed: {
    uppy: function () { 
      return new Uppy({
        debug: true,
        id: this.uploadId,
        onBeforeUpload: (files) => {return files},
      }).use(FileInput).use(Tus, { 
        headers: {
          'Authorization': `Bearer `
        },
        endpoint: `/v1/-/Volume/upload/home/${encodeURIComponent(JSON.stringify({isDirectory: false, event: 'add', targetDir: '/test', id: 'test', index: 0, filename: 'test.png', }))}` })
    }
  },
  beforeDestroy () {
    this.uppy.close()
  },
  watch: {
    '$store.state.diskToShowClick' (to, from) {
      this.disk = to
      this.uploadId = to.name
      this.fetch()
    }
  },
  methods: {
      fetch () {

      }
  },
  beforeMount () {

  }
}
</script>









