<template>
  <div>
    <v-navigation-drawer
      app
      dark
      right
      v-model="$store.state.ui.showRightDraw"
    >      
      <DisksExplorer/>
    </v-navigation-drawer>

    <!-- Empty disks -->
    <v-container fluid v-if="$store.state.diskToShow == null" class="pa-2">
      <div>
        <v-card class="ma-4 primary elevation-4">
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
          <v-row>
            <v-col class="col-6">
              
              <v-card class="elevation-1" style="min-height: 50vh">
                <v-card-title>
                  Upload Zone
                </v-card-title>

              </v-card>
            </v-col>
            <v-col class="col-6">
              <v-card class="elevation-1" style="min-height: 50vh">
                <v-card-title>
                  Remote Content Zone
                </v-card-title>
                <v-card-text>
                  {{remoteVolumeFiles}}
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>
      </v-card>
    </v-container>

  </div>
</template>

<script>
// @ is an alias to /src
import DisksExplorer from '@/components/cluster/DisksExplorer.vue'

export default {
  name: 'Disks',
  components: {
    DisksExplorer
  },
  data: () => {
    return {
      isLoading: false,
      disk: null,
      uploadId: null,

      remoteVolumeFiles: []
    }
  },
  computed: {

  },
  beforeDestroy () {
    
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
        this.$store.state.interface.cli.api.volume.ls(volume, path || '/', {group: cmdObj.group || '-', apiVersion: 'v1.experimental'}, (err, data) => {
          if (err) {
            console.log(err)
          } else {
            if (data == undefined) {

            } else {
              console.log(data.join('\n'))        
            }
          }
        })
        //this.$store.state.interface.cli.api.describe.one('Volume', this.uploadId , {group: '-'}, function (err, data) {
        //  if (err) {
        //    
        //  } else {
        //    this.disk = data
        //  }
        //}.bind(this))
      }
  },
  beforeMount () {

  }
}
</script>









