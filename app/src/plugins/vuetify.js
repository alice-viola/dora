import Vue from 'vue'
import Vuetify, {
	VRow,
	VCol,
	VTextField,
	VTooltip,
	VCheckbox,
	VSelect,
	VFileInput,
	VCombobox,
	VBtn,
	VIcon,
} from 'vuetify/lib';
import { Ripple, Intersect, Touch, Resize } from 'vuetify/lib/directives';
import '@mdi/font/css/materialdesignicons.css'

Vue.use(Vuetify, {
	components: { VRow, VTooltip, VCol, VTextField, VCheckbox,
		VSelect, VFileInput, VCombobox, VBtn, VIcon},
	directives: { Ripple, Intersect, Touch, Resize },
	icons: {iconfont: 'mdi' },// || 'mdiSvg' || 'md' || 'fa' || 'fa4' || 'faSvg'

});


//Vue.use(Vuetify)

export default new Vuetify({
	theme: { dark: true },
})