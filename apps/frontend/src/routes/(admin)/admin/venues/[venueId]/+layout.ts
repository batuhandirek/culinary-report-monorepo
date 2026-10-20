import { loadRecord } from '#components/admin/admin-load.js';
import { api } from '#lib/api.js';

export const ssr = false;

export async function load({ params, depends }) {
	const venue = await loadRecord('venue', () => api.admin.getVenue(params.venueId));
	depends(`venue:${params.venueId}`);
	return { venue };
}
