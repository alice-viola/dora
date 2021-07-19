<template>
      <v-menu
        bottom
        left
        v-if="show == true"
      >
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            icon
            v-bind="attrs"
            v-on="on"
          >
            <v-icon>fas fa-palette</v-icon>
          </v-btn>
        </template>

        <v-list class="pa-md-2 mainbackground lighten-2">
          <v-list-item-content>
            <v-list-item-title class="overline">
              Theme 
            </v-list-item-title>
          </v-list-item-content>
          <!--<v-list-item>
            <v-switch 
              v-model="$store.state.ui.resourceView" label="Card"
            ></v-switch>
          </v-list-item>-->
          <v-list-item>
            <v-switch v-model="$vuetify.theme.dark" label="Dark" v-on:click="savePreferences()"/>
          </v-list-item>
          <!--<v-list-item>
          <v-radio-group v-model="themeChoice">
            <v-radio
              v-for="n in themes"
              :key="n.name"
              :label="`${n.name}`"
              :value="n.name"
              v-on:click="setTheme(n)"
            ></v-radio>
          </v-radio-group>
          </v-list-item>-->
        </v-list>
      </v-menu>

</template>
<script>
import Vue from 'vue'

export default {
  name: "ThemeChanger",
  props: ['show'],
  data: () => ({
    menu: false,
    selectedTheme: null,
    themeChoice: 'Default',
    themes: [
      {
        name: "Default",
        dark: {
          mainbackground: "#121212",
          primary: "#F96F5D",
          accent: "#F96F5D",
          secondary: "#ffb74d",
          success: "#86af3f",
          info: "#727272",
          warning: "#FB8C00",
          error: "#FF5252",
        },
        light: {
          mainbackground: "#FAFAFA",
          primary: "#F96F5D",
          accent: "#F96F5D",
          secondary: "#ffb74d",
          success: "#86af3f",
          info: "#727272",
          warning: "#FB8C00",
          error: "#FF5252",
        }
      },

    ]
  }),
  methods: {
    savePreferences () {
      Vue.prototype.$cookie.set('pwm-theme', {dark: this.$vuetify.theme.dark, themeName: this.selectedTheme.name})
    },
    setDefault () {
      let preferences = Vue.prototype.$cookie.get('pwm-theme')
      if (preferences !== undefined && preferences !== null) {
        this.$vuetify.theme.dark = preferences.dark
        let themeSelected = this.themes.filter((theme) => { return theme.name == preferences.themeName })
        if (themeSelected != undefined && themeSelected.length == 1) {
          this.setTheme(themeSelected[0])  
        } else {
          this.setTheme(this.themes[0])
        }
      } else {
        this.setTheme(this.themes[0])
      }
    },
    setTheme(theme) {
      this.selectedTheme = theme
      this.savePreferences()
      this.menu = false
      this.themeChoice = theme.name
      const name = theme.name
      const dark = theme.dark
      const light = theme.light
      Object.keys(dark).forEach(i => {
        this.$vuetify.theme.themes.dark[i] = dark[i]
      })
      Object.keys(light).forEach(i => {
        this.$vuetify.theme.themes.light[i] = light[i]
      })
    }
  },
  beforeMount () {
    this.setDefault()
  }
};
</script>