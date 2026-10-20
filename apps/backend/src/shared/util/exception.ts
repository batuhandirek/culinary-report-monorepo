import { v4 } from 'uuid';

import { seperateCapitalLetters } from './string.js';

export function enhanceException(exception: any) {
	const status = exception.getStatus ? exception.getStatus() : (exception.status ?? 500);

	const debugId = v4();

	const message = exception.message ?? exception.response?.message ?? 'An error occurred';

	// Handle validation errors from exception.response.errors
	const details =
		exception.details ??
		exception.response?.details ??
		(exception.response?.errors ? formatValidationErrors(exception.response.errors) : []);

	return {
		debugId,
		message,
		name: exception.name,
		details,
		reason: exception.response?.reason ?? '',
		code:
			exception.response?.code ??
			seperateCapitalLetters(exception.name)?.join('-').toLowerCase(),
		status,
	};
}

function formatValidationErrors(errors: any[]): any[] {
	return errors.map(error => ({
		field: error.path?.replace('$input.', '') ?? 'unknown',
		expected: error.expected,
		received: error.value,
		path: error.path,
	}));
}
