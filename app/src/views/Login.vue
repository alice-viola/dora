<template>
    <v-main>
      <v-container class="fill-height" fluid>
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="4">
            <v-card class="elevation-12">
              <v-toolbar
                color="green darken-1" dark flat>
                <v-toolbar-title><b>P W M</b></v-toolbar-title>
                <v-spacer></v-spacer>
              </v-toolbar>
              <v-card-text>
                <v-form>
                  <v-text-field
                    id="password"
                    label="Bearer Token"
                    name="password"
                    prepend-icon="mdi-lock"
                    type="password"
                    v-model="token"
                  ></v-text-field>
                </v-form>
              </v-card-text>
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn dark color="secondary darken-1" v-on:click="login">Login</v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
</template>
<script>
// @ is an alias to /src

export default {
  name: 'Login',
  data: function () {
  	return { 
  		token: null
  	}
  },
  methods: {
  	login () {
  		this.$store.dispatch('login', this.token)
  	}
  },
  mounted () {
  	if (this.$cookie.get('auth') == true) {
  		this.$router.push('/resources')
  	}
  }
}
</script>
