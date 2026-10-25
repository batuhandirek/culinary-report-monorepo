import type { PostDesign, PostFormat, PostValues } from './post-design.js';

// A design's work in progress, kept in this browser so a reload or a look at another design
// loses nothing. Photos are data URLs: when they overflow the storage the draft is kept
// without them and `save` says so.

export interface PostDraft {
	format: PostFormat;
	values: PostValues;
	caption: string;
}

const key = (designId: string) => `admin-instagram:${designId}`;

export const freshDraft = (design: PostDesign): PostDraft => ({
	format: design.formats[0],
	values: structuredClone(design.defaults),
	caption: design.caption ?? ''
});

export const loadDraft = (design: PostDesign): PostDraft => {
	const fresh = freshDraft(design);
	try {
		const saved = JSON.parse(
			localStorage.getItem(key(design.id)) ?? 'null'
		) as Partial<PostDraft> | null;
		if (!saved) return fresh;
		return {
			format:
				saved.format && design.formats.includes(saved.format) ? saved.format : fresh.format,
			// A field added to the design since the draft was saved starts from its default
			values: { ...fresh.values, ...saved.values },
			caption: typeof saved.caption === 'string' ? saved.caption : fresh.caption
		};
	} catch {
		return fresh;
	}
};

const withoutPhotos = (value: unknown): unknown => {
	if (typeof value === 'string') return value.startsWith('data:') ? '' : value;
	if (Array.isArray(value)) return value.map(withoutPhotos);
	if (value && typeof value === 'object')
		return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, withoutPhotos(v)]));
	return value;
};

/** Whether the photos were kept too. */
export const saveDraft = (designId: string, draft: PostDraft): boolean => {
	try {
		localStorage.setItem(key(designId), JSON.stringify(draft));
		return true;
	} catch {
		try {
			localStorage.setItem(
				key(designId),
				JSON.stringify({ ...draft, values: withoutPhotos(draft.values) })
			);
		} catch {
			// Storage unavailable: the draft lives as long as the tab
		}
		return false;
	}
};

export const clearDraft = (designId: string) => {
	try {
		localStorage.removeItem(key(designId));
	} catch {
		// Nothing stored
	}
};
