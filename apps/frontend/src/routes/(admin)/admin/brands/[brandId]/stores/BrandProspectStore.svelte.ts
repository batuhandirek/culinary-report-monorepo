import type { AdminProspectOutputDto } from 'client';

import { api } from '#lib/api.js';
import { createAction } from '#ui/lib/action.svelte.js';
import { createLoader } from '#ui/lib/loader.svelte.js';

// The brand's place on the sales list, shared by the brand page's header, Overview and Sales tab:
// `undefined` while it loads, `null` when the brand is not on the list.
export class BrandProspectStore {
	prospect = $state<AdminProspectOutputDto | null | undefined>(undefined);
	private brandId = '';

	loader = createLoader(
		async (brandId: string) => {
			const { items } = await api.admin.listProspects({ page: 1, size: 1, brandId });
			return items[0] ? api.admin.getProspect(items[0].id) : null;
		},
		{ onSuccess: (found) => (this.prospect = found) }
	);

	// Adding may write a hook first: one LLM call, a few seconds
	addAction = createAction(() => api.admin.addProspect({ brandId: this.brandId }), {
		onSuccess: (added) => (this.prospect = added),
		successNotification: (added) => ({ title: 'Added to the sales list', text: added.brand.name })
	});

	load = (brandId: string) => {
		this.brandId = brandId;
		this.prospect = undefined;
		this.loader.load(brandId);
	};

	/** Every outreach change answers with the whole prospect; `null` after removing it. */
	update = (next: AdminProspectOutputDto | null) => {
		this.prospect = next;
	};
}
