import type { AdminReviewDetailOutputDto } from 'client';

import { loadRecord } from '#components/admin/admin-load.js';
import { api } from '#lib/api.js';

export const ssr = false;

export async function load({ params }) {
	// The review with its branch, brand, city and claims
	const review = await loadRecord('review', () => api.admin.getReview(params.reviewId) as Promise<AdminReviewDetailOutputDto>);
	return { review };
}
