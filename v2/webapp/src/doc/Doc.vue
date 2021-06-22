<template>
  <v-container class="mainbackground pa-0" fluid>
    <v-toolbar dark>
      <!--<v-app-bar-nav-icon></v-app-bar-nav-icon>-->
      <v-toolbar-title>Dora Documentation</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn text class="primary--text" @click="$router.push('/')">Back to the app</v-btn>
      <ThemeChanger />
      <template v-slot:extension>
        <v-tabs
          v-model="section"
          align-with-title
        >
          <v-tabs-slider color="yellow"></v-tabs-slider>

          <v-tab
            v-for="s in sections"
            :key="s"
          >
            {{ s }}
          </v-tab>
        </v-tabs>
      </template>
    </v-toolbar>
    <v-container class="mainbackground">
      <div v-if="section == 0 || section == 1">
      <h2 class="mt-6"> For Users </h2>
      <v-row>
        <v-col class="col-12 col-md-6 col-lg-4" v-for="b in users.box">
          <v-card class="elevation-6">
            <v-card-title class="overline blue--text">
              {{b.title}}
            </v-card-title>
            <v-card-text>
              {{b.desc}}
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn class="primary--text" style="margin-left: -15px;" small text @click="$router.push(b.route)"> Go </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
      </div>
      <div v-if="section == 0 || section == 2">
      <h2 class="mt-6"> Dora basics </h2>
      <v-row>
        <v-col class="col-12 col-md-6 col-lg-4" v-for="b in basic.box">
          <v-card class="elevation-6">
            <v-card-title class="overline purple--text">
              {{b.title}}
            </v-card-title>
            <v-card-text>
              {{b.desc}}
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn class="primary--text" style="margin-left: -15px;" small text @click="$router.push(b.route)"> Go </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
      </div>

      <div v-if="section == 0 || section == 3">
      <h2 class="mt-6"> Administrators </h2>
      <v-row>
        <v-col class="col-12 col-md-6 col-lg-4" v-for="b in admin.box">
          <v-card class="elevation-6">
            <v-card-title class="overline green--text">
              {{b.title}}
            </v-card-title>
            <v-card-text>
              {{b.desc}}
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn class="primary--text" style="margin-left: -15px;" small text @click="$router.push(b.route)"> Go </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
      </div>


    </v-container>
  </v-container>
</template>
<script>

import ThemeChanger from '@/components/ThemeChanger'


export default {
  name: 'Doc',
  data: function () {
    return {
      section: 0,
      sections: ['All', 'For Users', 'Basics', 'For Administrators'],
      users: {
        box: [
          {title: 'How to Install the CLI', desc: 'Discover how to install the command line interface', route: '/doc/' + this.$route.params.version + '/installcli'},
          {title: 'How to use the CLI', desc: 'Every command you need to run your workloads', route: '/doc/' + this.$route.params.version + '/clicommands'},
          {title: 'How to use the Webapp', desc: 'Discover how to use this Webapp', route: '/doc/' + this.$route.params.version + '/webapp'},
        ]
      },
      basic: {
        box: [
          {title: 'Resource kind', desc: 'Discover how to install the command line interface', route: '/doc/' + this.$route.params.version + '/installcli'},
          {title: 'Workloads and Containers', desc: 'Every command you need to run your workloads', route: '/doc/' + this.$route.params.version + '/clicommands'},
          {title: 'Data', desc: 'Discover how to use this Webapp', route: '/doc/' + this.$route.params.version + '/webapp'},
        ]
      },
      admin: {
        box: [
          {title: 'Cluster requisites', desc: 'Discover how to install the command line interface', route: '/doc/' + this.$route.params.version + '/installcli'},
          {title: 'Install on Kubernetes', desc: 'Every command you need to run your workloads', route: '/doc/' + this.$route.params.version + '/clicommands'},
          {title: 'Install Bare Metal', desc: 'Discover how to use this Webapp', route: '/doc/' + this.$route.params.version + '/webapp'},
          {title: 'Setup storages', desc: 'Discover how to use this Webapp', route: '/doc/' + this.$route.params.version + '/webapp'},
        ]
      }
    }
  }
}
</script>
