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
} from 'vuetify/lib';
import { Ripple, Intersect, Touch, Resize } from 'vuetify/lib/directives';

Vue.use(Vuetify, {
	components: { VRow, VTooltip, VCol, VTextField, VCheckbox, VSelect, VFileInput, VCombobox},
	directives: { Ripple, Intersect, Touch, Resize },
});


//Vue.use(Vuetify)

export default new Vuetify({
	theme: { dark: true },
})