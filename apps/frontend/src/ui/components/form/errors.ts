export class FormError implements Error {
	public name = FormError.name;
	constructor(public message = 'Invalid Form') {}
}
