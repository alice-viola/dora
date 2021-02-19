<template>
  <v-container class="mainbackground" style="min-height: 100vh" fluid>
  	<v-card>
  		<v-card-title>
  			New Project
  		</v-card-title>

  		<v-card-text>
  			<v-row>
  				<v-col class="col-12">
  					<v-text-field v-model="name" label="Name"></v-text-field> 
  				</v-col>
  				<v-col class="col-6">
  					<v-text-field v-model="description" label="Description"></v-text-field> 
  				</v-col>

  				<v-col class="col-6">
  					<v-select :items="['Tensorflow', 'PyTorch', 'Ubuntu']" label="Framework" />
  				</v-col>

  				<v-col class="col-10">
  					<v-text-field label="Code folder" v-model="selectedFolders.code"></v-text-field> 
  				</v-col>
  				<v-col class="col-2 pa-6">
  					<v-btn class="primary--text" text @click="openFsDialog('code')"> Browse </v-btn>
    			</v-col>

  				<v-col class="col-10">
  					<v-text-field label="Data folder" v-model="selectedFolders.data"></v-text-field> 
  				</v-col>
  				<v-col class="col-2 pa-6">
  					<v-btn class="primary--text" text @click="openFsDialog('data')"> Browse </v-btn>
    			</v-col>
    		</v-row>
  		</v-card-text>
  		<v-card-actions>
			<v-btn text dark class="primary--text" @click="$store.commit('projectView', 'projects-list')">
				Cancel
			</v-btn>
			
			<v-spacer></v-spacer>
			<v-btn class="primary--text" text  dark @click="save()">
				Save
			</v-btn>

  		</v-card-actions>
  	</v-card>
  </v-container>
</template>

<script>

const { dialog } = require('electron').remote

export default {
  	name: 'CreateProject',
  	props: ['project'],
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
  			name: undefined,
  			description: '',
  			framework: null,
  			selectedFolders: {code: undefined, data: ''}
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
  		save () {
  			if (this.name == undefined || this.selectedFolders.code == undefined || this.name == '' || this.selectedFolders.code == '') {
  				return
  			}
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
