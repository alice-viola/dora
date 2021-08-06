<template>
  <v-card>
<v-toolbar
  dense
  class="elevation-0"
>
  <v-toolbar-title class="text-h5">
    <v-icon small class="mr-3">
      fas fa-user
    </v-icon>      
    Edit your preferences <b class="text-h5 font-weight-light ml-2"></b> 
  </v-toolbar-title>

    <v-spacer />
    <v-btn  class="primary" label="Save" @click="save">Save</v-btn>
    <v-btn
      icon
      @click="closeDialog()"
    ><v-icon>mdi-close</v-icon></v-btn>            
  </v-toolbar-title>
</v-toolbar>
<v-card-title>
  UI
</v-card-title>    
<v-card-subtitle>
  Application backgrounds
</v-card-subtitle>        
<v-card-text class="pt-2 mb-0 pb-0">
  Image links are saved on local cookies, so they are valid only for this device.
</v-card-text>
<v-card-text class="pt-2 mb-0 pb-0">
  <v-row>
    <v-col class="col-12 col-md-3">
      <v-img :src="preferences.backgroundImage" height=200px></v-img>
    </v-col>
    <v-col class="col-12 col-md-9">
      <v-text-field class="pt-2" dense outlined label="General background image link" v-model="preferences.backgroundImage"></v-text-field>
    </v-col>    
  </v-row>
</v-card-text>
<v-card-text class="pt-0">
  <v-row>
    <v-col class="col-12 col-md-3">
      <v-img :src="preferences.backgroundImageWorkspace" height=200px></v-img>
    </v-col>
    <v-col class="col-12 col-md-9">
      <v-text-field class="pt-2" dense outlined label="Background image for this workspace link" v-model="preferences.backgroundImageWorkspace"></v-text-field>
    </v-col>    
  </v-row>  
</v-card-text> 
<v-card-title>
  UI
</v-card-title>    
<v-card-subtitle>
  Application theme
</v-card-subtitle>       
<v-card-text class="pt-2">
   <v-switch v-model="$vuetify.theme.dark" label="Dark" v-on:click="savePreferences()"/>
</v-card-text>
  </v-card>
</template>
<script type="text/javascript">
import Vue from 'vue'
import ThemeChanger from '@/components/ThemeChanger.vue'

export default {
  name: 'UserEditor',
  props: ['keyuser'],
  components: { ThemeChanger},
  data: function () {
    return {
      preferences: {
        backgroundImage: '',
        backgroundImageWorkspace: ''
      }
    }
  },
  methods: {
    save () {
      Vue.prototype.$cookie.set('dora.background.image', this.preferences.backgroundImage, '10y')
      Vue.prototype.$cookie.set('dora.background.image.' + this.$store.state.selectedWorkspace, this.preferences.backgroundImageWorkspace, '10y')      
      this.$router.go()
    },  
    closeDialog() {
      this.$emit('close-dialog')  
    },
    savePreferences () {
      Vue.prototype.$cookie.set('pwm-theme', {dark: this.$vuetify.theme.dark, themeName: 'Default'})
    }  
  },
  beforeMount () {
    this.preferences.backgroundImage = Vue.prototype.$cookie.get('dora.background.image')
    this.preferences.backgroundImageWorkspace = Vue.prototype.$cookie.get('dora.background.image.' + this.$store.state.selectedWorkspace)
  }
}
</script>
