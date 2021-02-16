<template>
  <v-container class="mainbackground" style="min-height: 100vh" fluid>
    <v-row class="pa-2">
    	
    	<h2>Project name and description</h2>
    </v-row> 
    <v-row class="pa-2">
    	<v-text-field v-model="name" label="Name"></v-text-field> 
    	<v-text-field v-model="description" label="Description"></v-text-field> 
    </v-row>
    <v-row class="pa-2">
    	<h2>Select framework</h2>
    </v-row>
    <v-row class="pa-2">
    	<v-col class="col-4" v-for="f in frameworks">
    		<v-card class="elevation-0">
    			<v-card-text>
    				<v-img :src="f.image"></v-img>
    			</v-card-text>
    		</v-card>
    	</v-col>
    </v-row>
    <v-row class="pa-2">
    	<h2>Select code folder</h2>
    </v-row>
    <v-row class="pa-2">
    	<v-btn text @click="openFsDialog('code')"> Open explorer </v-btn>
    </v-row>
    <v-row class="pa-2">
    	<v-text-field v-model="selectedFolders.code"></v-text-field> 
    </v-row>

    <v-row class="pa-2">
    	<h2>Select data folder</h2>
    </v-row>
    <v-row class="pa-2">
    	<v-btn text @click="openFsDialog('data')"> Open explorer </v-btn>
    	
    </v-row>
    <v-row class="pa-2">
    	<v-text-field v-model="selectedFolders.data"></v-text-field> 
    </v-row>
  </v-container>
</template>

<script>

const { dialog } = require('electron').remote
console.log(dialog)

export default {
  	name: 'CreateProject',
  	props: ['saveProject'],
  	components: {
  	  
  	},
  	watch: {
  		saveProject (to, from) {
  			this.createProject()
  		}
  	},
  	data: () => {
  		return {
  			frameworks: [
  				{name: 'Tensorflow', image: 'https://codelabs.developers.google.com/codelabs/ai-magicwand/img/358ffdb9eb758b90.png'},
  				{name: 'PyTorch', image: 'https://upload.wikimedia.org/wikipedia/commons/9/96/Pytorch_logo.png'},
  				{name: 'Ubuntu', image: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/Former_Ubuntu_logo.svg'}
  			],
  			name: '',
  			description: '',
  			framework: null,
  			selectedFolders: {code: '', data: ''}
  		}
  	},
  	methods: {
  		openFsDialog (type) {
  			let selectedCodeFolder = dialog.showOpenDialogSync({
  				properties: ['openDirectory']
  			})[0]
  			if (selectedCodeFolder) {
  				this.selectedFolders[type] = selectedCodeFolder
  			}
  		},
  		createProject () {
  			this.$store.dispatch('addProject', {
  				name: this.name,
  				description: this.description,
  				code: this.selectedFolders.code,
  				data: this.selectedFolders.data,
  				framework: this.framework
  			})
  		}
  	}
}
</script>
