import { loadRecord } from '#components/admin/admin-load.js';
import { api } from '#lib/api.js';

export const ssr = false;

export async function load({ params, depends }) {
	const brand = await loadRecord('brand', () => api.admin.getBrand(params.brandId));
	depends(`brand:${params.brandId}`);
	return { brand };
}
