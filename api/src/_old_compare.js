function propertiesToArray (obj) {
    const isObject = val => typeof val === 'object' && !Array.isArray(val)
    const addDelimiter = (a, b) => a ? `${a}.${b}` : b;
    const paths = (obj = {}, head = '') => {
        return Object.entries(obj).reduce((product, [key, value]) => {
           	let fullPath = addDelimiter(head, key)
          	return isObject(value) ? product.concat(paths(value, fullPath)) : product.concat(fullPath)}, [])
    }
    return paths(obj)
}

function compare (n, o, f) {
	let isEqual = true
	propertiesToArray(n).forEach((k) => {
		// console.log('Comparing K', k)
		let newValue = k.split('.').reduce((a, b) => a[b], n)
		let oldValue
		try {
			oldValue = k.split('.').reduce((a, b) => a[b], o)
			if (newValue == oldValue) {
				// console.log('Equal')
			} else if (Array.isArray(newValue) || Array.isArray(oldValue)) {
				if (_.isEqual(_.sortBy(newValue), _.sortBy(oldValue))) {
					// console.log('Equal', k.split('.').reduce((a, b) => a[b], n), k.split('.').reduce((a, b) => a[b], o))
				} else {
					// console.log('Not Equal', k.split('.').reduce((a, b) => a[b], n), k.split('.').reduce((a, b) => a[b], o))
					isEqual = false
				}
			} 
		} catch (err) {
			isEqual = false
		} 
	})
	return isEqual
}