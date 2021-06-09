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
import '@fortawesome/fontawesome-free/css/all.css'


Vue.use(Vuetify, {
	components: { VRow, VTooltip, VCol, VTextField, VCheckbox,
		VSelect, VFileInput, VCombobox, VBtn, VIcon},
	directives: { Ripple, Intersect, Touch, Resize },
	icons: {iconfont: 'fa' },

})

export default new Vuetify({
	theme: { dark: true },
})