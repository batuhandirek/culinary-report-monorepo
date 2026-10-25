import { error } from '@sveltejs/kit';

import { findPostDesign } from '#components/admin/instagram/designs/index.js';

export const load = ({ params }: { params: { design: string } }) => {
	const design = findPostDesign(params.design);
	if (!design) error(404, "This design doesn't exist");
	return { designName: design.name };
};
