import { loadRecord } from '#components/admin/admin-load.js';
import { api } from '#lib/api.js';

export const ssr = false;

export async function load({ params, depends }) {
	const city = await loadRecord('city', () => api.admin.getCity(params.cityId));
	depends(`city:${params.cityId}`);
	return { city };
}
