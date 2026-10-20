import { error } from '@sveltejs/kit';

import { isNotFoundError } from '#lib/api.js';

/**
 * Loads the record an admin detail page is about. A record that is not there — deleted
 * since, a mistyped or pasted-wrong id, or a list endpoint that answered with no row — is
 * a 404 that says what was missing, so the admin error page can send the operator back to
 * the right list. Any other failure stays the failure it is.
 */
export const loadRecord = async <T>(
	what: string,
	fetchRecord: () => Promise<T | null | undefined>
): Promise<T> => {
	const missing = `This ${what} doesn't exist`;
	let record: T | null | undefined;
	try {
		record = await fetchRecord();
	} catch (e) {
		if (isNotFoundError(e)) error(404, missing);
		throw e;
	}
	if (record === null || record === undefined) error(404, missing);
	return record;
};
