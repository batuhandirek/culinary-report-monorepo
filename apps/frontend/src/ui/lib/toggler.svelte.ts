export class Toggler {
	public toggled = $state(false);
	constructor(initialToggled = false) {
		this.toggled = initialToggled;
	}

	toggle = () => {
		this.toggled = !this.toggled;
	};
}

export function createToggler(init = false) {
	return new Toggler(init);
}
